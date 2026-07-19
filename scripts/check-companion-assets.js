#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const CATALOG_PATH = 'config/companion-assets.json';
const SOURCE_DOC_PAIRS = [
  ['index.md', 'docs/index.md'],
  ['src/chapters/chapter01/index.md', 'docs/chapters/chapter01/index.md'],
  ['src/chapters/chapter02/index.md', 'docs/chapters/chapter02/index.md'],
  ['src/chapters/chapter09/index.md', 'docs/chapters/chapter09/index.md'],
  ['src/appendices/appendix-a/index.md', 'docs/appendices/appendix-a/index.md'],
  ['src/appendices/appendix-b/index.md', 'docs/appendices/appendix-b/index.md'],
  ['src/appendices/appendix-c/index.md', 'docs/appendices/appendix-c/index.md'],
];
const REQUIRED_DOCUMENTS = new Set([
  ...SOURCE_DOC_PAIRS.flat(),
  'CHECKLIST.md',
  'CONTRIBUTING.md',
]);
const ROOT_ASSETS = new Set(['AGENTS.md', 'CODEOWNERS_GUIDE.md']);
const PATH_PREFIXES = ['.github/', 'custom-agents/', 'ops/', 'rules/', 'skills/'];
const PLANNED_MARKER = /planned\s*\/\s*not[ -]yet shipped|未提供/i;
const GENERIC_SCOPE_MARKER = '<!-- companion-path-scope: generic -->';
const COMPANION_REPOSITORY_URL = 'https://github.com/itdojp/GitHub-AgentOps-companion';

function readJson(filePath) {
  try {
    return JSON.parse(readRegularFile(filePath));
  } catch (error) {
    throw new Error(`${filePath}: invalid JSON: ${error.message}`);
  }
}

function readRegularFile(filePath) {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) throw new Error(`${filePath}: symbolic links are not allowed`);
  if (!stat.isFile()) throw new Error(`${filePath}: expected a regular file`);
  return fs.readFileSync(filePath, 'utf8');
}

function isCompanionPath(value) {
  return ROOT_ASSETS.has(value) || PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function extractCompanionReferences(content) {
  const references = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const matcher = /(?:\.github|custom-agents|ops|rules|skills)\/[A-Za-z0-9._*/-]+|(?:AGENTS|CODEOWNERS_GUIDE)\.md/g;
    let match;
    while ((match = matcher.exec(line)) !== null) {
      const candidate = match[0].trim();
      if (isCompanionPath(candidate)) {
        references.push({ path: candidate, line: index + 1, text: line });
      }
    }
  }
  return references;
}

function findMutableCompanionUrls(content) {
  const failures = [];
  const matcher = /https?:\/\/[^\s<>'"`)]+/g;
  let match;
  while ((match = matcher.exec(content)) !== null) {
    const rawUrl = match[0].replace(/[.,;:]+$/g, '');
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      continue;
    }
    const pathname = decodeURIComponent(url.pathname);
    const branch = '(?:refs/heads/)?(?:main|master)';
    const githubMutable = new RegExp(
      `^/itdojp/GitHub-AgentOps-companion/(?:blob|tree|raw)/${branch}(?:/|$)`
    );
    const rawMutable = new RegExp(
      `^/itdojp/GitHub-AgentOps-companion/${branch}(?:/|$)`
    );
    const apiTreeMutable = new RegExp(
      `^/repos/itdojp/GitHub-AgentOps-companion/git/trees/${branch}(?:/|$)`
    );
    const apiContents = pathname.startsWith('/repos/itdojp/GitHub-AgentOps-companion/contents/');
    const mutable =
      (url.hostname === 'github.com' && githubMutable.test(pathname)) ||
      (url.hostname === 'raw.githubusercontent.com' && rawMutable.test(pathname)) ||
      (url.hostname === 'api.github.com' && apiTreeMutable.test(pathname)) ||
      (url.hostname === 'api.github.com' && apiContents && /^(?:refs\/heads\/)?(?:main|master)$/.test(url.searchParams.get('ref') || ''));
    if (mutable) failures.push(rawUrl);
  }
  return failures;
}

function validateAssetPath(assetPath) {
  return (
    typeof assetPath === 'string' &&
    assetPath.length > 0 &&
    !assetPath.startsWith('/') &&
    !assetPath.endsWith('/') &&
    !assetPath.includes('\\') &&
    !assetPath.split('/').includes('..')
  );
}

function sortedReferencePaths(content) {
  return extractCompanionReferences(content)
    .map((reference) => reference.path)
    .sort();
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function walkMarkdownFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`${absolutePath}: symbolic links are not allowed`);
    if (entry.isDirectory()) files.push(...walkMarkdownFiles(absolutePath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolutePath);
  }
  return files;
}

function validateRepository(root = process.cwd()) {
  const errors = [];
  const catalogFile = path.join(root, CATALOG_PATH);
  const catalog = readJson(catalogFile);

  if (catalog.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (catalog.bookVersion !== '1.0.0') errors.push('bookVersion must match book version 1.0.0');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(catalog.verifiedAt || '')) {
    errors.push('verifiedAt must be YYYY-MM-DD');
  }

  const companion = catalog.companion || {};
  if (companion.repository !== 'itdojp/GitHub-AgentOps-companion') {
    errors.push('companion.repository must be itdojp/GitHub-AgentOps-companion');
  }
  if (!/^[0-9a-f]{40}$/.test(companion.commit || '')) {
    errors.push('companion.commit must be an immutable full-length commit SHA');
  }
  const expectedWebUrl = `https://github.com/${companion.repository}`;
  const expectedTreeApiUrl = `https://api.github.com/repos/${companion.repository}/git/trees/${companion.commit}?recursive=1`;
  if (companion.webUrl !== expectedWebUrl) errors.push('companion.webUrl does not match repository');
  if (companion.treeApiUrl !== expectedTreeApiUrl) {
    errors.push('companion.treeApiUrl must pin companion.commit');
  }
  if (companion.snapshotPolicy !== 'all-blobs-at-pinned-commit') {
    errors.push('companion.snapshotPolicy must be all-blobs-at-pinned-commit');
  }

  if (!Array.isArray(catalog.shippedAssets) || catalog.shippedAssets.length === 0) {
    errors.push('shippedAssets must be a non-empty array');
  }
  if (!Array.isArray(catalog.plannedAssets) || catalog.plannedAssets.length === 0) {
    errors.push('plannedAssets must be a non-empty array');
  }
  if (!Array.isArray(catalog.scannedDocuments) || catalog.scannedDocuments.length === 0) {
    errors.push('scannedDocuments must be a non-empty array');
  }
  const inventory = catalog.inventory || {};
  if (inventory.shippedAssets !== (catalog.shippedAssets || []).length) {
    errors.push('inventory.shippedAssets does not match shippedAssets length');
  }
  if (inventory.plannedAssets !== (catalog.plannedAssets || []).length) {
    errors.push('inventory.plannedAssets does not match plannedAssets length');
  }
  if (inventory.scannedDocuments !== (catalog.scannedDocuments || []).length) {
    errors.push('inventory.scannedDocuments does not match scannedDocuments length');
  }

  const shipped = new Map();
  for (const asset of catalog.shippedAssets || []) {
    if (!validateAssetPath(asset.path)) errors.push(`invalid shipped path: ${asset.path}`);
    if (asset.type !== 'blob') errors.push(`shipped asset must be a blob: ${asset.path}`);
    if (!/^[0-9a-f]{40}$/.test(asset.objectSha || '')) {
      errors.push(`shipped asset must record full git object SHA: ${asset.path}`);
    }
    if (!/^100(?:644|755)$/.test(asset.mode || '')) {
      errors.push(`shipped asset must record a regular-file git mode: ${asset.path}`);
    }
    if (shipped.has(asset.path)) errors.push(`duplicate shipped path: ${asset.path}`);
    shipped.set(asset.path, asset);
  }

  const planned = new Map();
  for (const asset of catalog.plannedAssets || []) {
    if (!validateAssetPath(asset.path)) errors.push(`invalid planned path: ${asset.path}`);
    if (asset.status !== 'planned' || asset.availability !== 'not-yet-shipped') {
      errors.push(`planned asset status must be planned / not-yet-shipped: ${asset.path}`);
    }
    if (planned.has(asset.path)) errors.push(`duplicate planned path: ${asset.path}`);
    if (shipped.has(asset.path)) errors.push(`path cannot be both shipped and planned: ${asset.path}`);
    planned.set(asset.path, asset);
  }

  const documents = new Map();
  const configuredDocuments = new Set(catalog.scannedDocuments || []);
  for (const requiredPath of REQUIRED_DOCUMENTS) {
    if (!configuredDocuments.has(requiredPath)) errors.push(`required scanned document is missing: ${requiredPath}`);
  }
  for (const configuredPath of configuredDocuments) {
    if (!REQUIRED_DOCUMENTS.has(configuredPath)) errors.push(`unexpected scanned document: ${configuredPath}`);
  }
  for (const relativePath of catalog.scannedDocuments || []) {
    if (!validateAssetPath(relativePath)) {
      errors.push(`invalid scanned document path: ${relativePath}`);
      continue;
    }
    if (documents.has(relativePath)) errors.push(`duplicate scanned document: ${relativePath}`);
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`scanned document does not exist: ${relativePath}`);
      continue;
    }
    let content;
    try {
      content = readRegularFile(absolutePath);
    } catch (error) {
      errors.push(error.message);
      continue;
    }
    documents.set(relativePath, content);

    for (const mutableUrl of findMutableCompanionUrls(content)) {
      errors.push(`${relativePath}: companion asset link must not use mutable main/master: ${mutableUrl}`);
    }

    for (const reference of extractCompanionReferences(content)) {
      if (shipped.has(reference.path)) continue;
      if (planned.has(reference.path)) {
        if (!PLANNED_MARKER.test(reference.text)) {
          errors.push(
            `${relativePath}:${reference.line}: planned asset must be marked planned/not yet shipped/未提供: ${reference.path}`
          );
        }
        continue;
      }
      errors.push(`${relativePath}:${reference.line}: unregistered companion path: ${reference.path}`);
    }
  }

  const appendixA = documents.get('src/appendices/appendix-a/index.md') || '';
  const appendixARefs = new Set(extractCompanionReferences(appendixA).map((reference) => reference.path));
  for (const plannedPath of planned.keys()) {
    if (!appendixARefs.has(plannedPath)) {
      errors.push(`planned asset must be listed in Appendix A: ${plannedPath}`);
    }
  }

  for (const [sourcePath, docsPath] of SOURCE_DOC_PAIRS) {
    const source = documents.get(sourcePath);
    const docs = documents.get(docsPath);
    if (source === undefined || docs === undefined) continue;
    const sourceRefs = sortedReferencePaths(source);
    const docsRefs = sortedReferencePaths(docs);
    if (!arraysEqual(sourceRefs, docsRefs)) {
      errors.push(`${sourcePath} and ${docsPath} companion references are out of sync`);
    }
  }

  const configuredSources = new Set(SOURCE_DOC_PAIRS.map(([sourcePath]) => sourcePath));
  const sourceRoot = path.join(root, 'src');
  for (const absolutePath of walkMarkdownFiles(sourceRoot)) {
    const content = readRegularFile(absolutePath);
    const isGenericExample = content.includes(GENERIC_SCOPE_MARKER);
    const genericContent = content.replaceAll(GENERIC_SCOPE_MARKER, '');
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    if (
      isGenericExample &&
      (content.includes(COMPANION_REPOSITORY_URL) || /Companion/i.test(genericContent))
    ) {
      errors.push(`generic document must not link to or claim Companion scope: ${relativePath}`);
    }
    const hasFixedPath = extractCompanionReferences(content).length > 0;
    if (!hasFixedPath) continue;
    const isCompanionContract = configuredSources.has(relativePath);
    if (isCompanionContract && isGenericExample) {
      errors.push(`Companion contract document must not use the generic scope marker: ${relativePath}`);
    } else if (!isCompanionContract && !isGenericExample) {
      errors.push(`fixed-path document must be classified as Companion contract or generic example: ${relativePath}`);
    }
  }

  const publicContractDocuments = new Set(SOURCE_DOC_PAIRS.flat());
  const publicMarkdown = [path.join(root, 'index.md'), ...walkMarkdownFiles(path.join(root, 'docs'))];
  for (const absolutePath of publicMarkdown) {
    const content = readRegularFile(absolutePath);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    for (const mutableUrl of findMutableCompanionUrls(content)) {
      errors.push(`${relativePath}: public Companion link must not use mutable main/master: ${mutableUrl}`);
    }
    const isGenericExample = content.includes(GENERIC_SCOPE_MARKER);
    const genericContent = content.replaceAll(GENERIC_SCOPE_MARKER, '');
    if (
      isGenericExample &&
      (content.includes(COMPANION_REPOSITORY_URL) || /Companion/i.test(genericContent))
    ) {
      errors.push(`public generic document must not link to or claim Companion scope: ${relativePath}`);
    }
    const hasFixedPath = extractCompanionReferences(content).length > 0;
    if (!hasFixedPath || publicContractDocuments.has(relativePath)) continue;
    if (!isGenericExample) {
      errors.push(`public fixed-path document must be classified as Companion contract or generic example: ${relativePath}`);
    }
  }

  const checklist = documents.get('CHECKLIST.md') || '';
  for (const marker of [CATALOG_PATH, companion.commit, 'planned / not yet shipped']) {
    if (!checklist.includes(marker)) errors.push(`CHECKLIST.md must record: ${marker}`);
  }
  for (const marker of [CATALOG_PATH, companion.commit, `Book version: ${catalog.bookVersion}`]) {
    if (!appendixA.includes(marker)) errors.push(`Appendix A must record: ${marker}`);
  }

  if (errors.length > 0) {
    throw new Error(`Companion asset validation failed:\n- ${errors.join('\n- ')}`);
  }

  return {
    companionCommit: companion.commit,
    scannedDocuments: documents.size,
    shippedAssets: shipped.size,
    plannedAssets: planned.size,
  };
}

function requestJson(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'github-agentops-book-companion-check/1.0',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const request = https.get(url, { headers, timeout: 20_000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          const classification = response.statusCode === 404
            ? 'contract drift or invalid pinned commit'
            : response.statusCode >= 500
              ? 'GitHub infrastructure failure'
              : 'request rejected';
          reject(new Error(`GitHub Trees API returned HTTP ${response.statusCode} (${classification})`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`GitHub Trees API returned invalid JSON: ${error.message}`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('GitHub Trees API request timed out')));
    request.on('error', reject);
  });
}

async function validateRemote(root = process.cwd()) {
  const summary = validateRepository(root);
  const catalog = readJson(path.join(root, CATALOG_PATH));
  const tree = await requestJson(catalog.companion.treeApiUrl, process.env.GITHUB_TOKEN);
  if (tree.truncated) throw new Error('GitHub Trees API response is truncated');
  if (!Array.isArray(tree.tree)) throw new Error('GitHub Trees API response has no tree array');

  const remote = new Map(tree.tree.map((item) => [item.path, item]));
  const remoteBlobs = new Set(tree.tree.filter((item) => item.type === 'blob').map((item) => item.path));
  const errors = [];
  for (const asset of catalog.shippedAssets) {
    const item = remote.get(asset.path);
    if (!item) {
      errors.push(`shipped asset is absent at pinned commit: ${asset.path}`);
      continue;
    }
    if (item.type !== asset.type || item.sha !== asset.objectSha || item.mode !== asset.mode) {
      errors.push(`shipped asset identity mismatch: ${asset.path}`);
    }
  }
  for (const remotePath of remoteBlobs) {
    if (!catalog.shippedAssets.some((asset) => asset.path === remotePath)) {
      errors.push(`pinned snapshot blob is missing from shippedAssets: ${remotePath}`);
    }
  }
  for (const asset of catalog.plannedAssets) {
    if (remote.has(asset.path)) errors.push(`planned asset already exists and must be reclassified: ${asset.path}`);
  }
  if (errors.length > 0) {
    throw new Error(`Remote Companion validation failed:\n- ${errors.join('\n- ')}`);
  }
  return summary;
}

function parseArguments(argv) {
  const options = { root: process.cwd(), remote: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--remote') options.remote = true;
    else if (argument === '--root') {
      index += 1;
      if (!argv[index]) throw new Error('--root requires a path');
      options.root = path.resolve(argv[index]);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const summary = options.remote
    ? await validateRemote(options.root)
    : validateRepository(options.root);
  const mode = options.remote ? 'local + remote' : 'local';
  console.log(
    `Companion assets (${mode}): ${summary.shippedAssets} shipped, ` +
      `${summary.plannedAssets} planned, ${summary.scannedDocuments} documents, ` +
      `commit ${summary.companionCommit}`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  extractCompanionReferences,
  findMutableCompanionUrls,
  validateRemote,
  validateRepository,
};
