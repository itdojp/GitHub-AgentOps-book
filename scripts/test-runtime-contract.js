#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const EXPECTED_ENGINE = '^22.22.2 || ^24.15.0 || >=26.0.0';
const EXPECTED_WORKFLOW_NODE_VERSION = '22';
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
    if (/^\s*uses\s*:\s*actions\/setup-node@/m.test(source)) {
      sources.set(relativePath, source);
    }
  }
  for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
    sources.set(relativePath, readText(relativePath));
  }
  return sources;
}

function parseNodeVersions(source, relativePath) {
  const versions = [];
  const pattern = /^\s*node-version\s*:\s*(['"]?)([^'"\s#]+)\1\s*(?:#.*)?$/gm;
  for (const match of source.matchAll(pattern)) versions.push(match[2]);
  assert(versions.length > 0, `${relativePath}: node-version is required`);
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
    for (const version of parseNodeVersions(source, relativePath)) {
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
