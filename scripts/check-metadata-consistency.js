#!/usr/bin/env node
'use strict';

/**
 * Validate public metadata and navigation coverage without third-party deps.
 * The repository publishes `docs/`; this check keeps package metadata,
 * book-config, Jekyll config, top-page front matter, and navigation in sync.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docs = path.join(root, 'docs');

const expected = {
  title: 'GitHub AgentOps 実践ガイド',
  description: 'Issue→Agent→PR→反復→マージの運用を、Copilot instructions / AGENTS.md / Skills / custom agents / hooks / policy controls / MCP / tool exposure / CI で標準化するための実践ガイド。例: Copilot cloud agent / third-party agents（OpenAI Codex 等）/ Copilot CLI。',
  author: 'ITDO Inc.',
  version: '1.0.0',
  license: 'CC-BY-NC-SA-4.0',
  lang: 'ja',
  baseurl: '/GitHub-AgentOps-book',
  url: 'https://itdojp.github.io',
  homepage: 'https://itdojp.github.io/GitHub-AgentOps-book/',
  repositoryFull: 'itdojp/GitHub-AgentOps-book',
  repositoryUrl: 'https://github.com/itdojp/GitHub-AgentOps-book',
  repositoryGit: 'git+https://github.com/itdojp/GitHub-AgentOps-book.git',
};

const navSections = ['introduction', 'chapters', 'appendices'];
const requiredAssets = [
  'assets/css/main.css',
  'assets/css/syntax-highlighting.css',
  'assets/js/theme.js',
  'assets/js/search.js',
  'assets/js/code-copy-lightweight.js',
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function rel(filePath) {
  return path.relative(root, filePath) || '.';
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`failed to read JSON ${rel(filePath)}: ${error.message}`);
  }
}

function stripQuotes(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length >= 2 && trimmed[0] === trimmed[trimmed.length - 1] && ['"', "'"].includes(trimmed[0])) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readSimpleYamlScalars(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`required file is missing: ${rel(filePath)}`);
  }
  const result = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    if (!rawLine || /^[ \t#]/.test(rawLine) || !rawLine.includes(':')) {
      continue;
    }
    const [key, ...valueParts] = rawLine.split(':');
    const value = valueParts.join(':').trim();
    if (!key.trim() || !value || ['|', '>'].includes(value)) {
      continue;
    }
    result[key.trim()] = stripQuotes(value.replace(/\s+#.*$/, ''));
  }
  return result;
}

function parseFrontMatter(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  if (lines[0] !== '---') {
    fail(`${rel(filePath)} is missing YAML front matter`);
  }
  const end = lines.indexOf('---', 1);
  if (end < 0) {
    fail(`${rel(filePath)} has no closing front matter delimiter`);
  }
  const result = {};
  for (const rawLine of lines.slice(1, end)) {
    if (!rawLine || /^[ \t#]/.test(rawLine) || !rawLine.includes(':')) {
      continue;
    }
    const [key, ...valueParts] = rawLine.split(':');
    result[key.trim()] = stripQuotes(valueParts.join(':').trim());
  }
  return result;
}

function normalizePath(value) {
  if (typeof value !== 'string') return null;
  let route = value.trim();
  if (!route || /^(https?:|mailto:)/.test(route)) return null;
  if (!route.startsWith('/')) route = `/${route}`;
  const lower = route.toLowerCase();
  if (/\.(md|html?|pdf|txt)$/.test(lower)) return route;
  return route.endsWith('/') ? route : `${route}/`;
}

function assertSafePath(route, label) {
  if (!route.startsWith('/')) fail(`${label} must start with '/': ${route}`);
  if (route.includes('\\')) fail(`${label} contains a backslash: ${route}`);
  if (route.includes('//')) fail(`${label} contains duplicate slashes: ${route}`);
  if (route.split('/').filter(Boolean).some((part) => part === '.' || part === '..')) {
    fail(`${label} contains an unsafe segment: ${route}`);
  }
}

function readNavigation(filePath) {
  if (!fs.existsSync(filePath)) fail(`required file is missing: ${rel(filePath)}`);
  const sections = Object.fromEntries(navSections.map((section) => [section, []]));
  let currentSection = null;
  let currentItem = null;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const stripped = line.trim();
    if (!stripped || stripped.startsWith('#')) continue;
    if (!/^[ \t]/.test(line) && stripped.endsWith(':')) {
      currentSection = stripped.slice(0, -1);
      currentItem = null;
      continue;
    }
    if (!navSections.includes(currentSection)) continue;
    let content = stripped;
    if (content.startsWith('- ')) {
      currentItem = {};
      sections[currentSection].push(currentItem);
      content = content.slice(2).trim();
      if (!content) continue;
    }
    if (!currentItem || !content.includes(':')) continue;
    const [key, ...valueParts] = content.split(':');
    currentItem[key.trim()] = stripQuotes(valueParts.join(':').trim());
  }
  return sections;
}

function markdownRoute(filePath) {
  const frontMatter = parseFrontMatter(filePath);
  const permalink = normalizePath(frontMatter.permalink);
  if (permalink) return permalink;
  const relPath = path.relative(docs, filePath).split(path.sep).join('/');
  if (relPath === 'index.md') return '/';
  if (relPath.endsWith('/index.md')) return `/${relPath.slice(0, -'index.md'.length)}`;
  return `/${relPath.replace(/\.md$/, '')}/`;
}

function listMarkdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('_') || entry.name === 'assets') continue;
      out.push(...listMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function assertEqual(actual, expectedValue, label) {
  if (actual !== expectedValue) {
    fail(`${label} mismatch: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`);
  }
}

function checkMetadata(bookConfig, packageJson) {
  const book = bookConfig.book || {};
  for (const key of ['title', 'description', 'version', 'language', 'license']) {
    assertEqual(book[key], expected[key === 'language' ? 'lang' : key], `book-config.json.book.${key}`);
  }
  assertEqual(book.author && book.author.name, expected.author, 'book-config.json.book.author.name');
  assertEqual(book.homepage, expected.homepage, 'book-config.json.book.homepage');
  assertEqual(book.repository, expected.repositoryUrl, 'book-config.json.book.repository');

  assertEqual(packageJson.name, 'github-agentops-book', 'package.json.name');
  for (const key of ['description', 'version', 'author', 'license']) {
    assertEqual(packageJson[key], expected[key], `package.json.${key}`);
  }
  assertEqual(packageJson.homepage, expected.homepage, 'package.json.homepage');
  assertEqual(packageJson.repository && packageJson.repository.type, 'git', 'package.json.repository.type');
  assertEqual(packageJson.repository && packageJson.repository.url, expected.repositoryGit, 'package.json.repository.url');
  assertEqual(packageJson.bugs && packageJson.bugs.url, `${expected.repositoryUrl}/issues`, 'package.json.bugs.url');

  const docsConfig = readSimpleYamlScalars(path.join(docs, '_config.yml'));
  for (const key of ['title', 'description', 'author', 'version', 'lang', 'baseurl', 'url', 'homepage']) {
    assertEqual(docsConfig[key], expected[key], `docs/_config.yml.${key}`);
  }
  assertEqual(docsConfig.repository, expected.repositoryFull, 'docs/_config.yml.repository');
  assertEqual(docsConfig.repository_url, expected.repositoryUrl, 'docs/_config.yml.repository_url');

  const indexFrontMatter = parseFrontMatter(path.join(docs, 'index.md'));
  for (const key of ['title', 'description', 'author', 'version']) {
    assertEqual(indexFrontMatter[key], expected[key], `docs/index.md front matter ${key}`);
  }
}

function checkNavigation(bookConfig, navSectionsData) {
  const enabledSections = new Map((bookConfig.contentSections || [])
    .filter((section) => section.enabled)
    .map((section) => [section.name, section.directory]));
  for (const section of navSections) {
    if (!enabledSections.has(section)) {
      fail(`book-config.json.contentSections is missing enabled section ${section}`);
    }
  }

  const publishedRoutes = new Map();
  for (const filePath of listMarkdownFiles(docs)) {
    const route = markdownRoute(filePath);
    assertSafePath(route, `published route for ${rel(filePath)}`);
    if (publishedRoutes.has(route)) {
      fail(`duplicate published route ${route}: ${rel(publishedRoutes.get(route))} and ${rel(filePath)}`);
    }
    publishedRoutes.set(route, filePath);
  }

  const navRoutes = [];
  const seen = new Map();
  for (const section of navSections) {
    const items = navSectionsData[section] || [];
    if (items.length === 0) fail(`navigation.${section} has no items`);
    for (const [index, item] of items.entries()) {
      const route = normalizePath(item.path);
      if (!item.title || !route) fail(`navigation.${section}[${index + 1}] is missing title or path`);
      assertSafePath(route, `navigation.${section}[${index + 1}].path`);
      if (seen.has(route)) fail(`duplicate navigation path ${route}: ${seen.get(route)} and ${item.title}`);
      seen.set(route, item.title);
      if (!publishedRoutes.has(route)) fail(`navigation path has no docs page: ${route}`);
      navRoutes.push(route);
    }
  }

  const expectedRoutes = [...publishedRoutes.keys()].filter((route) => route !== '/').sort();
  const actualRoutes = [...navRoutes].sort();
  const missing = expectedRoutes.filter((route) => !actualRoutes.includes(route));
  const extra = actualRoutes.filter((route) => !expectedRoutes.includes(route));
  if (missing.length || extra.length) {
    fail(`navigation/docs route mismatch: missing=${JSON.stringify(missing)}, extra=${JSON.stringify(extra)}`);
  }

  return { pageCount: publishedRoutes.size, navCount: navRoutes.length };
}

function checkAssets() {
  const missing = requiredAssets.filter((asset) => {
    const filePath = path.join(docs, asset);
    return !fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size === 0;
  });
  if (missing.length) fail(`required public assets are missing or empty: ${missing.join(', ')}`);
}

const bookConfig = readJson(path.join(root, 'book-config.json'));
const packageJson = readJson(path.join(root, 'package.json'));
const navigation = readNavigation(path.join(docs, '_data', 'navigation.yml'));
checkMetadata(bookConfig, packageJson);
const counts = checkNavigation(bookConfig, navigation);
checkAssets();
console.log(`OK: metadata and navigation coverage are consistent (${counts.navCount} navigation entries, ${counts.pageCount} docs pages)`);
