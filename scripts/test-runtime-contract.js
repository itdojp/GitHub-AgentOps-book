#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const EXPECTED_ENGINE = '^22.22.2 || ^24.15.0 || >=26.0.0';
const EXPECTED_WORKFLOW_NODE_VERSION = '22.22.2';
const REQUIRED_ACTIVE_WORKFLOW_PATHS = [
  '.github/workflows/book-qa.yml',
  '.github/workflows/build.yml',
  '.github/workflows/nav-link-check.yml',
];
const REQUIRED_TEMPLATE_PATHS = [
  'templates/github-workflows/build-actions.yml',
  'templates/github-workflows/build-legacy.yml',
];

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function workflowSources() {
  const sources = new Map();
  for (const relativePath of REQUIRED_ACTIVE_WORKFLOW_PATHS) {
    sources.set(relativePath, readText(relativePath));
  }

  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  for (const name of fs.readdirSync(workflowDir).sort()) {
    if (!name.endsWith('.yml') && !name.endsWith('.yaml')) continue;
    const relativePath = path.posix.join('.github/workflows', name);
    const source = readText(relativePath);
    if (/^\s*(?:-\s+)?uses\s*:\s*actions\/setup-node@/m.test(source)) {
      sources.set(relativePath, source);
    }
  }
  for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
    sources.set(relativePath, readText(relativePath));
  }
  return sources;
}

function indentation(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function parseNodeVersionLine(line, relativePath) {
  const match = line.match(/^\s*node-version\s*:\s*(['"]?)([^'"\s#]+)\1\s*(?:#.*)?$/);
  assert(match, `${relativePath}: unsupported node-version scalar`);
  return match[2];
}

function parseSetupNodeVersions(source, relativePath) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const setupNodeLines = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*(?:-\s+)?uses\s*:\s*actions\/setup-node@/.test(line));
  const allNodeVersionLines = lines.filter((line) => /^\s*node-version\s*:/.test(line));

  assert(setupNodeLines.length > 0, `${relativePath}: actions/setup-node step is required`);
  const versions = [];

  for (const setupNode of setupNodeLines) {
    const usesIndent = indentation(setupNode.line)
      + (/^\s*-\s+uses\s*:/.test(setupNode.line) ? 2 : 0);
    let stepEnd = lines.length;
    for (let index = setupNode.index + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (indentation(line) < usesIndent) {
        stepEnd = index;
        break;
      }
    }

    const withLines = [];
    for (let index = setupNode.index + 1; index < stepEnd; index += 1) {
      if (indentation(lines[index]) === usesIndent && /^\s*with\s*:\s*(?:#.*)?$/.test(lines[index])) {
        withLines.push(index);
      }
    }
    assert.strictEqual(
      withLines.length,
      1,
      `${relativePath}: setup-node step must contain exactly one with mapping`,
    );

    const withLine = withLines[0];
    let withEnd = stepEnd;
    for (let index = withLine + 1; index < stepEnd; index += 1) {
      const line = lines[index];
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (indentation(line) <= usesIndent) {
        withEnd = index;
        break;
      }
    }

    const nodeVersionLines = [];
    for (let index = withLine + 1; index < withEnd; index += 1) {
      if (
        indentation(lines[index]) === usesIndent + 2
        && /^\s*node-version\s*:/.test(lines[index])
      ) {
        nodeVersionLines.push(lines[index]);
      }
    }
    assert.strictEqual(
      nodeVersionLines.length,
      1,
      `${relativePath}: setup-node with.node-version must occur exactly once`,
    );
    versions.push(parseNodeVersionLine(nodeVersionLines[0], relativePath));
  }

  assert.strictEqual(
    allNodeVersionLines.length,
    versions.length,
    `${relativePath}: node-version must not occur outside a setup-node with mapping`,
  );
  return versions;
}

function validateRuntimeContract({ engine, npmrc, sources }) {
  assert.strictEqual(engine, EXPECTED_ENGINE, 'package.json Node engine contract mismatch');

  const engineStrict = npmrc
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => line.startsWith('engine-strict='));
  assert.deepStrictEqual(engineStrict, ['engine-strict=true'], '.npmrc must enable engine-strict exactly once');

  for (const relativePath of [
    ...REQUIRED_ACTIVE_WORKFLOW_PATHS,
    ...REQUIRED_TEMPLATE_PATHS,
  ]) {
    assert(sources.has(relativePath), `${relativePath}: required runtime workflow/template is missing`);
  }

  let referenceCount = 0;
  for (const [relativePath, source] of [...sources.entries()].sort()) {
    for (const version of parseSetupNodeVersions(source, relativePath)) {
      referenceCount += 1;
      assert.strictEqual(
        version,
        EXPECTED_WORKFLOW_NODE_VERSION,
        `${relativePath}: node-version must match the audited runtime major`,
      );
    }
  }
  return { fileCount: sources.size, referenceCount };
}

const packageJson = JSON.parse(readText('package.json'));
const npmrc = readText('.npmrc');
const sources = workflowSources();
const canonical = validateRuntimeContract({
  engine: packageJson.engines && packageJson.engines.node,
  npmrc,
  sources,
});

function replaceNodeVersion(source, version) {
  const replaced = source.replace(
    /^(\s*node-version\s*:\s*)['"]?[^'"\s#]+['"]?/m,
    `$1'${version}'`,
  );
  assert.notStrictEqual(replaced, source, 'negative fixture must replace node-version');
  return replaced;
}

function removeNodeVersion(source) {
  const replaced = source.replace(/^\s*node-version\s*:.*(?:\r?\n|$)/m, '');
  assert.notStrictEqual(replaced, source, 'negative fixture must remove node-version');
  return replaced;
}

function moveNodeVersionToDecoy(source) {
  return `env:\n  node-version: '${EXPECTED_WORKFLOW_NODE_VERSION}'\n\n${removeNodeVersion(source)}`;
}

const negativeFixtures = [
  {
    name: 'package engine drift',
    engine: '>=22.12.0',
    npmrc,
    sources,
  },
  {
    name: 'engine-strict disabled',
    engine: EXPECTED_ENGINE,
    npmrc: npmrc.replace('engine-strict=true', 'engine-strict=false'),
    sources,
  },
  ...[...sources.keys()].sort().flatMap((relativePath) => [
    {
      name: `${relativePath} runtime drift`,
      engine: EXPECTED_ENGINE,
      npmrc,
      sources: new Map(
        [...sources.entries()].map(([name, source]) => [
          name,
          name === relativePath ? replaceNodeVersion(source, '18') : source,
        ]),
      ),
    },
    {
      name: `${relativePath} runtime omission`,
      engine: EXPECTED_ENGINE,
      npmrc,
      sources: new Map(
        [...sources.entries()].map(([name, source]) => [
          name,
          name === relativePath ? removeNodeVersion(source) : source,
        ]),
      ),
    },
    {
      name: `${relativePath} runtime decoy`,
      engine: EXPECTED_ENGINE,
      npmrc,
      sources: new Map(
        [...sources.entries()].map(([name, source]) => [
          name,
          name === relativePath ? moveNodeVersionToDecoy(source) : source,
        ]),
      ),
    },
  ]),
];

for (const fixture of negativeFixtures) {
  assert.throws(
    () => validateRuntimeContract(fixture),
    undefined,
    `${fixture.name} fixture must fail`,
  );
}

console.log(
  `OK: runtime contract tests passed (${canonical.fileCount} workflows/templates, `
    + `${canonical.referenceCount} refs, ${negativeFixtures.length} negative fixtures)`,
);
