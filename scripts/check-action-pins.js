#!/usr/bin/env node
'use strict';

/**
 * Enforce audited, immutable GitHub Action references in active workflows and
 * distributed workflow templates. Full YAML syntax remains actionlint's job;
 * this checker deliberately permits only a canonical, reviewable `uses:` line.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const manifestPath = path.join(root, 'config', 'action-pins.json');
const scanRoots = ['.github/workflows', 'templates/github-workflows'];
const shaPattern = /^[0-9a-f]{40}$/;
const versionPattern = /^v\d+\.\d+\.\d+$/;
const actionNamePattern = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?$/;

function fail(message) {
  throw new Error(message);
}

function normalizeManifest(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('manifest must be an object');
  if (raw.schemaVersion !== 1) fail(`manifest schemaVersion must be 1, got ${raw.schemaVersion}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.auditedAt || '')) fail('manifest auditedAt must be YYYY-MM-DD');
  if (!Array.isArray(raw.actions) || raw.actions.length === 0) fail('manifest actions must be a non-empty array');

  const approved = new Map();
  for (const [index, entry] of raw.actions.entries()) {
    const label = `manifest actions[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${label} must be an object`);
    if (!actionNamePattern.test(entry.name || '')) fail(`${label}.name is invalid: ${entry.name}`);
    if (!versionPattern.test(entry.version || '')) fail(`${label}.version must be exact semver: ${entry.version}`);
    if (!shaPattern.test(entry.sha || '')) fail(`${label}.sha must be 40 lowercase hex: ${entry.sha}`);
    if (entry.verifiedCommit !== true) fail(`${label}.verifiedCommit must be true`);
    const [owner, repository] = entry.name.split('/');
    const expectedUrl = `https://github.com/${owner}/${repository}/releases/tag/${entry.version}`;
    if (entry.releaseUrl !== expectedUrl) {
      fail(`${label}.releaseUrl mismatch: expected ${expectedUrl}, got ${entry.releaseUrl}`);
    }
    if (approved.has(entry.name)) fail(`duplicate manifest action: ${entry.name}`);
    approved.set(entry.name, { ...entry });
  }

  if (!Array.isArray(raw.references) || raw.references.length === 0) {
    fail('manifest references must be a non-empty array');
  }
  const expectedReferences = new Map();
  for (const [index, entry] of raw.references.entries()) {
    const label = `manifest references[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail(`${label} must be an object`);
    if (!/^(?:\.github\/workflows|templates\/github-workflows)\/.+\.ya?ml$/i.test(entry.file || '')) {
      fail(`${label}.file is outside the action scan roots: ${entry.file}`);
    }
    if (!approved.has(entry.action)) fail(`${label}.action is not approved: ${entry.action}`);
    if (!Number.isInteger(entry.count) || entry.count <= 0) fail(`${label}.count must be a positive integer`);
    const key = `${entry.file}\u0000${entry.action}`;
    if (expectedReferences.has(key)) fail(`duplicate manifest reference: ${entry.file} ${entry.action}`);
    expectedReferences.set(key, entry.count);
  }
  for (const name of approved.keys()) {
    if (![...expectedReferences.keys()].some((key) => key.endsWith(`\u0000${name}`))) {
      fail(`approved action has no expected reference: ${name}`);
    }
  }
  return { auditedAt: raw.auditedAt, approved, expectedReferences };
}

function readManifest(filePath = manifestPath) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`failed to read action pin manifest: ${error.message}`);
  }
  return normalizeManifest(raw);
}

function assertWithinRoot(candidate, rootPath, label) {
  const relative = path.relative(rootPath, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail(`${label} escapes repository root: ${candidate}`);
}

function collectYamlFiles(repositoryRoot = root, roots = scanRoots) {
  const repositoryReal = fs.realpathSync(repositoryRoot);
  const files = new Map();

  function visit(candidate) {
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) fail(`symlink is not allowed under action scan roots: ${path.relative(repositoryReal, candidate)}`);
    const real = fs.realpathSync(candidate);
    assertWithinRoot(real, repositoryReal, 'scan path');
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(candidate).sort()) visit(path.join(candidate, entry));
      return;
    }
    if (!stat.isFile() || !/\.ya?ml$/i.test(candidate)) return;
    const relative = path.relative(repositoryReal, real).split(path.sep).join('/');
    files.set(relative, fs.readFileSync(real, 'utf8'));
  }

  for (const relativeRoot of roots) {
    const absolute = path.resolve(repositoryReal, relativeRoot);
    assertWithinRoot(absolute, repositoryReal, 'scan root');
    if (!fs.existsSync(absolute)) fail(`required action scan root is missing: ${relativeRoot}`);
    visit(absolute);
  }
  if (files.size === 0) fail('action scan roots contain no YAML files');
  return files;
}

function indentation(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function parseCanonicalUses(value, location) {
  const trimmed = value.trim();
  if (!trimmed) fail(`${location}: uses value is empty`);
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    fail(`${location}: remote uses values must be unquoted canonical scalars`);
  }
  const commentMatch = trimmed.match(/^(\S+)\s+#\s+(\S+)\s*$/);
  const scalar = commentMatch ? commentMatch[1] : trimmed;
  const versionComment = commentMatch ? commentMatch[2] : null;

  if (scalar.startsWith('./') || scalar.startsWith('docker://')) return { ignored: true };
  if (scalar.includes('${{') || scalar.includes('}}')) fail(`${location}: dynamic remote uses values are not allowed`);
  const at = scalar.lastIndexOf('@');
  if (at <= 0 || at === scalar.length - 1) fail(`${location}: remote uses must be action@sha: ${scalar}`);
  const name = scalar.slice(0, at);
  const sha = scalar.slice(at + 1);
  if (!actionNamePattern.test(name)) fail(`${location}: invalid remote action name: ${name}`);
  if (!shaPattern.test(sha)) fail(`${location}: remote action ref must be 40 lowercase hex: ${scalar}`);
  if (!versionComment) fail(`${location}: exact version comment is required for ${name}`);
  return { ignored: false, name, sha, versionComment };
}

function validateInventory(files, manifest) {
  if (!(files instanceof Map) || files.size === 0) fail('files must be a non-empty Map');
  const normalizedManifest = manifest.approved instanceof Map ? manifest : normalizeManifest(manifest);
  const usageCounts = new Map([...normalizedManifest.approved.keys()].map((name) => [name, 0]));
  const referenceInventory = new Map();
  let referenceCount = 0;

  for (const [fileName, source] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!/\.ya?ml$/i.test(fileName)) fail(`inventory contains a non-YAML file: ${fileName}`);
    const lines = String(source).replace(/\r\n/g, '\n').split('\n');
    let blockScalarIndent = null;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();
      const currentIndent = indentation(line);
      if (blockScalarIndent !== null) {
        if (!trimmed || currentIndent > blockScalarIndent) continue;
        blockScalarIndent = null;
      }
      if (!trimmed || trimmed.startsWith('#')) continue;
      const canonical = line.match(/^\s*(?:-\s*)?uses\s*:\s*(.*?)\s*$/);
      if (canonical) {
        const parsed = parseCanonicalUses(canonical[1], `${fileName}:${index + 1}`);
        if (parsed.ignored) continue;
        const approved = normalizedManifest.approved.get(parsed.name);
        if (!approved) fail(`${fileName}:${index + 1}: action is not in the audited manifest: ${parsed.name}`);
        if (parsed.sha !== approved.sha) {
          fail(`${fileName}:${index + 1}: SHA mismatch for ${parsed.name}: expected ${approved.sha}, got ${parsed.sha}`);
        }
        if (parsed.versionComment !== approved.version) {
          fail(`${fileName}:${index + 1}: version comment mismatch for ${parsed.name}: expected ${approved.version}, got ${parsed.versionComment}`);
        }
        const inventoryKey = `${fileName}\u0000${parsed.name}`;
        referenceInventory.set(inventoryKey, (referenceInventory.get(inventoryKey) || 0) + 1);
        usageCounts.set(parsed.name, usageCounts.get(parsed.name) + 1);
        referenceCount += 1;
        continue;
      }

      if (/^[^#]*:\s*[>|][-+]?\s*(?:#.*)?$/.test(line)) {
        blockScalarIndent = currentIndent;
        continue;
      }

      if (!canonical) {
        if (/\buses\b\s*['"]?\s*:/.test(line) || /uses\s*:[^#]*@/.test(line)) {
          fail(`${fileName}:${index + 1}: uses must be a standalone canonical mapping line`);
        }
        continue;
      }
    }
  }

  const stale = [...usageCounts.entries()].filter(([, count]) => count === 0).map(([name]) => name);
  if (stale.length) fail(`audited manifest contains unused actions: ${stale.join(', ')}`);
  const actualReferences = [...referenceInventory.entries()].sort(([a], [b]) => a.localeCompare(b));
  const expectedReferences = [...normalizedManifest.expectedReferences.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actualReferences) !== JSON.stringify(expectedReferences)) {
    const format = (entries) => entries.map(([key, count]) => {
      const [file, action] = key.split('\u0000');
      return `${file}:${action}=${count}`;
    });
    fail(`reference inventory mismatch: expected ${JSON.stringify(format(expectedReferences))}, got ${JSON.stringify(format(actualReferences))}`);
  }
  return {
    auditedAt: normalizedManifest.auditedAt,
    fileCount: files.size,
    actionCount: normalizedManifest.approved.size,
    referenceCount,
    usageCounts: Object.fromEntries([...usageCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

function main() {
  try {
    const result = validateInventory(collectYamlFiles(), readManifest());
    console.log(`OK: audited Action pins are consistent (${result.referenceCount} refs, ${result.actionCount} actions, ${result.fileCount} YAML files, audited ${result.auditedAt})`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = {
  collectYamlFiles,
  normalizeManifest,
  parseCanonicalUses,
  readManifest,
  validateInventory,
};
