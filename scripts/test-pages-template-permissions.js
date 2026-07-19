#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  buildCancelInProgress,
  buildConcurrencyGroup,
  deployConcurrencyGroup,
  validateWorkflow,
} = require('./check-pages-template-permissions');

const workflowPath = path.join(
  process.cwd(),
  'templates',
  'github-workflows',
  'build-actions.yml',
);
const source = fs.readFileSync(workflowPath, 'utf8');

function replaceOccurrence(input, search, replacement, occurrence) {
  let from = 0;
  let index = -1;
  for (let count = 0; count < occurrence; count += 1) {
    index = input.indexOf(search, from);
    assert(index >= 0, `fixture source occurrence ${occurrence} must exist: ${search}`);
    from = index + search.length;
  }
  return `${input.slice(0, index)}${replacement}${input.slice(index + search.length)}`;
}

const expectedResult = validateWorkflow(source);
assert.deepStrictEqual(expectedResult.workflowPermissions, { contents: 'read' });
assert.deepStrictEqual(expectedResult.buildPermissions, { contents: 'read' });
assert.deepStrictEqual(expectedResult.deployPermissions, {
  pages: 'write',
  'id-token': 'write',
});
assert.deepStrictEqual(expectedResult.buildConcurrency, {
  group: buildConcurrencyGroup,
  'cancel-in-progress': buildCancelInProgress,
});
assert.deepStrictEqual(expectedResult.deployConcurrency, {
  group: deployConcurrencyGroup,
  'cancel-in-progress': 'false',
});
assert(expectedResult.events.includes('pull_request'));

function mayPublish({ eventName, ref }) {
  return ref === 'refs/heads/main'
    && (eventName === 'push' || eventName === 'workflow_dispatch');
}

const eventMatrix = [
  { name: 'fork pull request', eventName: 'pull_request', ref: 'refs/pull/101/merge', prNumber: 101, runId: 1001, publish: false },
  { name: 'same pull request update', eventName: 'pull_request', ref: 'refs/pull/101/merge', prNumber: 101, runId: 1002, publish: false },
  { name: 'internal pull request', eventName: 'pull_request', ref: 'refs/pull/102/merge', prNumber: 102, runId: 1003, publish: false },
  { name: 'main push', eventName: 'push', ref: 'refs/heads/main', runId: 2001, publish: true },
  { name: 'main manual dispatch', eventName: 'workflow_dispatch', ref: 'refs/heads/main', runId: 2002, publish: true },
  { name: 'feature manual dispatch', eventName: 'workflow_dispatch', ref: 'refs/heads/feature', runId: 2003, publish: false },
];

function concurrencyPolicy(scenario) {
  const buildSuffix = scenario.eventName === 'pull_request'
    ? `pr-${scenario.prNumber}`
    : `run-${scenario.runId}`;
  return {
    buildGroup: `Build and Deploy (GitHub Actions)-build-${buildSuffix}`,
    cancelBuildInProgress: scenario.eventName === 'pull_request',
    deployGroup: mayPublish(scenario)
      ? 'Build and Deploy (GitHub Actions)-pages-deploy'
      : null,
    cancelDeployInProgress: false,
  };
}

for (const scenario of eventMatrix) {
  assert.strictEqual(mayPublish(scenario), scenario.publish, scenario.name);
}
const policies = eventMatrix.map(concurrencyPolicy);
assert.strictEqual(policies[0].buildGroup, policies[1].buildGroup, 'same PR must share its build group');
assert(policies[0].cancelBuildInProgress, 'same PR update must cancel the older build');
assert.notStrictEqual(policies[0].buildGroup, policies[2].buildGroup, 'different PRs must not cancel each other');
assert.notStrictEqual(policies[0].buildGroup, policies[3].deployGroup, 'PR build must not share the deploy group');
assert.strictEqual(policies[3].deployGroup, policies[4].deployGroup, 'main push/manual deploys must serialize');
assert(!policies[3].cancelDeployInProgress, 'a main push must not cancel an active deploy');
assert(!policies[4].cancelDeployInProgress, 'a manual deploy must not cancel an active deploy');
assert.notStrictEqual(policies[3].buildGroup, policies[4].buildGroup, 'non-PR builds must use unique run groups');
assert.strictEqual(policies[5].deployGroup, null, 'feature manual run must not join the deploy group');

const negativeFixtures = [
  {
    name: 'workflow-level Pages write permission',
    source: source.replace('permissions:\n  contents: read\n', 'permissions:\n  contents: read\n  pages: write\n'),
    message: /workflow default permissions mismatch/,
  },
  {
    name: 'build job OIDC permission',
    source: source.replace(
      '    permissions:\n      contents: read\n',
      '    permissions:\n      contents: read\n      id-token: write\n',
    ),
    message: /build job permissions mismatch/,
  },
  {
    name: 'additional privileged job',
    source: source.replace(
      '  deploy:\n',
      '  audit:\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write\n    steps:\n      - run: echo unsafe\n\n  deploy:\n',
    ),
    message: /jobs must be exactly/,
  },
  {
    name: 'additional inline privileged job',
    source: source.replace(
      '  deploy:\n',
      '  audit: { runs-on: ubuntu-latest, permissions: { contents: write }, steps: [ { run: echo unsafe } ] }\n\n  deploy:\n',
    ),
    message: /jobs must be exactly/,
  },
  {
    name: 'missing deploy OIDC permission',
    source: source.replace('      id-token: write\n', ''),
    message: /deploy job permissions mismatch/,
  },
  {
    name: 'deploy allowed on any push',
    source: replaceOccurrence(
      source,
      "if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')",
      "if: github.event_name == 'push'",
      2,
    ),
    message: /deploy job must be limited/,
  },
  {
    name: 'artifact upload allowed on pull request',
    source: source.replace(
      "        if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')",
      "        if: github.event_name == 'pull_request'",
    ),
    message: /artifact upload must be limited/,
  },
  {
    name: 'missing pull_request event',
    source: source.replace('  pull_request:\n    branches: [ main ]\n', ''),
    message: /required block is missing: pull_request/,
  },
  {
    name: 'workflow-level shared concurrency',
    source: source.replace(
      'permissions:\n  contents: read\n\njobs:',
      'permissions:\n  contents: read\n\nconcurrency:\n  group: pages\n  cancel-in-progress: true\n\njobs:',
    ),
    message: /workflow-level concurrency must not mix/,
  },
  {
    name: 'quoted workflow-level shared concurrency',
    source: source.replace(
      'permissions:\n  contents: read\n\njobs:',
      'permissions:\n  contents: read\n\n"concurrency":\n  group: pages\n  cancel-in-progress: true\n\njobs:',
    ),
    message: /workflow-level concurrency must not mix/,
  },
  {
    name: 'single-quoted workflow-level shared concurrency',
    source: source.replace(
      'permissions:\n  contents: read\n\njobs:',
      "permissions:\n  contents: read\n\n'concurrency':\n  group: pages\n  cancel-in-progress: true\n\njobs:",
    ),
    message: /workflow-level concurrency must not mix/,
  },
  {
    name: 'static PR build group',
    source: source.replace(`      group: ${buildConcurrencyGroup}\n`, '      group: pages\n'),
    message: /build concurrency mismatch/,
  },
  {
    name: 'PR group without non-PR fallback',
    source: source.replace(
      `      group: ${buildConcurrencyGroup}\n`,
      "      group: ${{ github.workflow }}-build-pr-${{ github.event.pull_request.number }}\n",
    ),
    message: /build concurrency mismatch/,
  },
  {
    name: 'all builds cancel in progress',
    source: source.replace(
      `      cancel-in-progress: ${buildCancelInProgress}\n`,
      '      cancel-in-progress: true\n',
    ),
    message: /build concurrency mismatch/,
  },
  {
    name: 'deploy shares static pages group',
    source: source.replace(`      group: ${deployConcurrencyGroup}\n`, '      group: pages\n'),
    message: /deploy concurrency mismatch/,
  },
  {
    name: 'deploy can be canceled',
    source: source.replace(
      `      group: ${deployConcurrencyGroup}\n      cancel-in-progress: false\n`,
      `      group: ${deployConcurrencyGroup}\n      cancel-in-progress: true\n`,
    ),
    message: /deploy concurrency mismatch/,
  },
];

for (const fixture of negativeFixtures) {
  assert.throws(
    () => validateWorkflow(fixture.source),
    fixture.message,
    `${fixture.name} fixture must fail`,
  );
}

console.log(`OK: Pages template permission tests passed (${eventMatrix.length} event scenarios, 1 positive, ${negativeFixtures.length} negative fixtures)`);
