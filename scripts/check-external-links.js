#!/usr/bin/env node

/**
 * External link checker for the book repository.
 *
 * This is intentionally not part of `npm test` because external sites can be
 * transiently unavailable. Use it for release/read-through validation and record
 * the result in PR evidence.
 */

const fs = require('fs').promises;
const http = require('http');
const https = require('https');
const { glob } = require('glob');

const CHECK_TARGETS = [
  'src/**/*.md',
  'index.md',
  'README.md',
  'BOOK-PROPOSAL.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'CHECKLIST.md',
];

const SKIP_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 20000;

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
};

function normalizeUrl(raw) {
  return raw
    .trim()
    .replace(/[)`.,;:]+$/g, '')
    .replace(/&amp;/g, '&');
}

function shouldSkip(url) {
  try {
    const parsed = new URL(url);
    return SKIP_HOSTS.has(parsed.hostname);
  } catch {
    return true;
  }
}

async function collectMarkdownFiles() {
  const files = new Set();
  for (const pattern of CHECK_TARGETS) {
    const matches = await glob(pattern, { nodir: true, absolute: false });
    for (const file of matches) files.add(file.replace(/\\/g, '/'));
  }
  return [...files].sort();
}

async function collectExternalLinks(files) {
  const links = new Map();
  const pattern = /https?:\/\/[^\s)<>'"]+/g;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const matches = content.match(pattern) || [];
    for (const match of matches) {
      const url = normalizeUrl(match);
      if (shouldSkip(url)) continue;
      if (!links.has(url)) links.set(url, new Set());
      links.get(url).add(file);
    }
  }

  return links;
}

function requestUrl(url, redirects = 0) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;

    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'github-agentops-book-link-check/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const { statusCode, headers } = res;
        res.resume();

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirects < MAX_REDIRECTS
        ) {
          const nextUrl = new URL(headers.location, url).toString();
          resolve(requestUrl(nextUrl, redirects + 1));
          return;
        }

        resolve({ url, statusCode, finalUrl: url, ok: statusCode < 400 });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`timeout after ${TIMEOUT_MS}ms`));
    });

    req.on('error', (error) => {
      resolve({ url, statusCode: null, finalUrl: null, ok: false, error: error.message });
    });

    req.end();
  });
}

async function main() {
  const files = await collectMarkdownFiles();
  const links = await collectExternalLinks(files);

  console.log(colors.blue(`Checking ${links.size} unique external links from ${files.length} files...`));

  const failures = [];
  for (const [url, sources] of links.entries()) {
    const result = await requestUrl(url);
    if (result.ok) {
      console.log(`${colors.green('OK')} ${result.statusCode} ${url}`);
    } else {
      failures.push({ url, sources: [...sources], result });
      const reason = result.error || `HTTP ${result.statusCode}`;
      console.log(`${colors.red('BAD')} ${reason} ${url}`);
    }
  }

  if (failures.length > 0) {
    console.error(colors.red(`\nExternal link check failed: ${failures.length} broken link(s).`));
    for (const failure of failures) {
      console.error(`- ${failure.url}`);
      console.error(`  sources: ${failure.sources.join(', ')}`);
      console.error(`  reason: ${failure.result.error || `HTTP ${failure.result.statusCode}`}`);
    }
    process.exit(1);
  }

  console.log(colors.green(`\nAll external links valid (${links.size} links checked).`));
}

main().catch((error) => {
  console.error(colors.red(`External link check crashed: ${error.stack || error.message}`));
  process.exit(1);
});
