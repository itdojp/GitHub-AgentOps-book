#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { validateWorkflow } = require('./check-pages-template-permissions');

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
assert(expectedResult.events.includes('pull_request'));

function mayPublish({ eventName, ref }) {
  return ref === 'refs/heads/main'
    && (eventName === 'push' || eventName === 'workflow_dispatch');
}

const eventMatrix = [
  { name: 'fork pull request', eventName: 'pull_request', ref: 'refs/pull/101/merge', publish: false },
  { name: 'internal pull request', eventName: 'pull_request', ref: 'refs/pull/102/merge', publish: false },
  { name: 'main push', eventName: 'push', ref: 'refs/heads/main', publish: true },
  { name: 'main manual dispatch', eventName: 'workflow_dispatch', ref: 'refs/heads/main', publish: true },
  { name: 'feature manual dispatch', eventName: 'workflow_dispatch', ref: 'refs/heads/feature', publish: false },
];
for (const scenario of eventMatrix) {
  assert.strictEqual(mayPublish(scenario), scenario.publish, scenario.name);
}

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
];

for (const fixture of negativeFixtures) {
  assert.throws(
    () => validateWorkflow(fixture.source),
    fixture.message,
    `${fixture.name} fixture must fail`,
  );
}

console.log(`OK: Pages template permission tests passed (${eventMatrix.length} event scenarios, 1 positive, ${negativeFixtures.length} negative fixtures)`);
