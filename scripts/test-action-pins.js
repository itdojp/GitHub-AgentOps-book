#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  collectYamlFiles,
  readManifest,
  validateInventory,
} = require('./check-action-pins');

const files = collectYamlFiles();
const manifest = readManifest();
const positive = validateInventory(files, manifest);
assert.strictEqual(positive.actionCount, 7);
assert.strictEqual(positive.referenceCount, 18);
assert.strictEqual(positive.fileCount, 6);

function cloneFiles() {
  return new Map(files);
}

function mutateFirst(search, replacement) {
  const changed = cloneFiles();
  for (const [name, source] of changed) {
    if (!source.includes(search)) continue;
    changed.set(name, source.replace(search, replacement));
    return changed;
  }
  assert.fail(`fixture search value not found: ${search}`);
}

function rawManifest() {
  return {
    schemaVersion: 1,
    auditedAt: manifest.auditedAt,
    actions: [...manifest.approved.values()].map((entry) => ({ ...entry })),
    references: [...manifest.expectedReferences.entries()].map(([key, count]) => {
      const [file, action] = key.split('\u0000');
      return { file, action, count };
    }),
  };
}

const checkoutSha = manifest.approved.get('actions/checkout').sha;
const checkoutVersion = manifest.approved.get('actions/checkout').version;
const canonicalCheckout = `actions/checkout@${checkoutSha} # ${checkoutVersion}`;
const negativeFixtures = [
  {
    name: 'mutable major tag',
    files: mutateFirst(canonicalCheckout, 'actions/checkout@v6 # v6'),
    manifest,
    message: /must be 40 lowercase hex/,
  },
  {
    name: 'short SHA',
    files: mutateFirst(canonicalCheckout, `actions/checkout@${checkoutSha.slice(0, 12)} # ${checkoutVersion}`),
    manifest,
    message: /must be 40 lowercase hex/,
  },
  {
    name: 'unapproved full SHA',
    files: mutateFirst(canonicalCheckout, `example/unapproved@${checkoutSha} # ${checkoutVersion}`),
    manifest,
    message: /not in the audited manifest/,
  },
  {
    name: 'wrong version comment',
    files: mutateFirst(canonicalCheckout, `actions/checkout@${checkoutSha} # v6.0.2`),
    manifest,
    message: /version comment mismatch/,
  },
  {
    name: 'missing version comment',
    files: mutateFirst(canonicalCheckout, `actions/checkout@${checkoutSha}`),
    manifest,
    message: /exact version comment is required/,
  },
  {
    name: 'quoted remote ref',
    files: mutateFirst(canonicalCheckout, `"actions/checkout@${checkoutSha}" # ${checkoutVersion}`),
    manifest,
    message: /must be unquoted canonical scalars/,
  },
  {
    name: 'dynamic remote ref',
    files: mutateFirst(canonicalCheckout, '${{ matrix.action }}'),
    manifest,
    message: /dynamic remote uses values are not allowed/,
  },
  {
    name: 'block scalar mutable ref',
    files: mutateFirst(canonicalCheckout, '> -\n          actions/checkout@v6'.replace('> -', '>-')),
    manifest,
    message: /remote uses must be action@sha/,
  },
  {
    name: 'extra yaml file with mutable ref',
    files: new Map([...files, ['templates/github-workflows/nested/extra.yaml', 'jobs:\n  extra:\n    steps:\n      - uses: actions/checkout@v6\n']]),
    manifest,
    message: /must be 40 lowercase hex/,
  },
  {
    name: 'inline mapping bypass',
    files: new Map([...files, ['templates/github-workflows/inline.yml', `steps:\n  - { uses: actions/checkout@${checkoutSha} }\n`]]),
    manifest,
    message: /standalone canonical mapping line/,
  },
  {
    name: 'aggregate count compensation in another file',
    files: (() => {
      const changed = cloneFiles();
      const sourceFile = '.github/workflows/docs-forbidden-check.yml';
      const targetFile = '.github/workflows/build.yml';
      changed.set(sourceFile, changed.get(sourceFile).replace(`      - uses: ${canonicalCheckout}\n`, ''));
      changed.set(targetFile, changed.get(targetFile).replace(
        `      - uses: ${canonicalCheckout}\n`,
        `      - uses: ${canonicalCheckout}\n      - uses: ${canonicalCheckout}\n`,
      ));
      return changed;
    })(),
    manifest,
    message: /reference inventory mismatch/,
  },
  {
    name: 'stale manifest entry',
    files,
    manifest: {
      ...rawManifest(),
      actions: [
        ...rawManifest().actions,
        {
          name: 'actions/cache',
          version: 'v4.0.0',
          sha: '0123456789abcdef0123456789abcdef01234567',
          releaseUrl: 'https://github.com/actions/cache/releases/tag/v4.0.0',
          verifiedCommit: true,
        },
      ],
    },
    message: /approved action has no expected reference: actions\/cache/,
  },
];

for (const fixture of negativeFixtures) {
  assert.throws(
    () => validateInventory(fixture.files, fixture.manifest),
    fixture.message,
    `${fixture.name} fixture must fail`,
  );
}

console.log(`OK: Action pin tests passed (1 positive, ${negativeFixtures.length} negative fixtures, ${positive.referenceCount} refs)`);
