#!/usr/bin/env node

/**
 * Regression contract for the reader-facing concept figures and figure index.
 *
 * The manuscript in src/ is canonical. The build copies each chapter-local SVG
 * and adds front matter to Markdown in docs/, so this check verifies both the
 * source inventory and the generated public representation.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const canonicalRoute = '/appendices/figure-index/';
const sourceIndexPath = 'src/appendices/figure-index/index.md';
const publicIndexPath = 'docs/appendices/figure-index/index.md';

const inventory = [
  {
    chapter: 'chapter01',
    id: 'figure-human-agent-ci-responsibility-boundary',
    svg: 'responsibility-boundaries.svg',
    caption: '図1-1：Human / Agent / CIの責任境界と自動化の停止線'
  },
  {
    chapter: 'chapter06',
    id: 'figure-issue-to-merge-iteration',
    svg: 'github-native-iteration-flow.svg',
    caption: '図6-1：Issueからresearch / plan、PR、review / CI、Mergeへ進む反復フロー'
  },
  {
    chapter: 'chapter07',
    id: 'figure-mcp-tool-exposure-boundaries',
    svg: 'mcp-trust-secret-boundaries.svg',
    caption: '図7-1：MCP / tool exposureにおけるtrust boundaryとsecret boundary'
  },
  {
    chapter: 'chapter08',
    id: 'figure-governance-feedback-loop',
    svg: 'governance-feedback-loop.svg',
    caption: '図8-1：Budget・Policy・Metricsによるガバナンスのフィードバックループ'
  }
].map((figure) => ({
  ...figure,
  sourceMarkdown: `src/chapters/${figure.chapter}/index.md`,
  publicMarkdown: `docs/chapters/${figure.chapter}/index.md`,
  sourceSvg: `src/chapters/${figure.chapter}/${figure.svg}`,
  publicSvg: `docs/chapters/${figure.chapter}/${figure.svg}`,
  deepLink: `../../chapters/${figure.chapter}/#${figure.id}`
}));

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const filePath = absolute(relativePath);
  if (!fs.existsSync(filePath)) {
    fail(`required file is missing: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function listFiles(directory, extension) {
  const directoryPath = absolute(directory);
  if (!fs.existsSync(directoryPath)) return [];
  const output = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const relativePath = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...listFiles(relativePath, extension));
    } else if (entry.isFile() && entry.name.endsWith(extension)) {
      output.push(relativePath);
    }
  }
  return output.sort();
}

function stripGeneratedFrontMatter(content) {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) return content;
  const lines = content.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  if (end < 0) return content;
  return lines.slice(end + 1).join('\n').replace(/^\n/, '');
}

function normalizedBody(content) {
  return stripGeneratedFrontMatter(content).replace(/\r\n/g, '\n').trimEnd();
}

function occurrences(content, pattern) {
  return [...content.matchAll(pattern)].length;
}

function checkConfiguration() {
  const config = JSON.parse(read('book-config.json'));
  assert(config.ux && config.ux.modules && config.ux.modules.figureIndex === true,
    'book-config.json ux.modules.figureIndex must be true');
}

function checkExactSourceInventory() {
  const allMarkdown = listFiles('src', '.md').map(read).join('\n');
  const conceptFigures = allMarkdown.match(/<figure\b[^>]*\bclass="[^"]*\bconcept-figure\b[^"]*"[^>]*>[\s\S]*?<\/figure>/g) || [];
  assert(conceptFigures.length === inventory.length,
    `reader-facing concept figure count must be exactly ${inventory.length}, found ${conceptFigures.length}`);
  const idMatches = conceptFigures.map((block) => block.match(/\bid="([^"]+)"/));
  assert(idMatches.every(Boolean), 'every reader-facing concept figure must have a stable id');
  const figureIds = idMatches.filter(Boolean).map((match) => match[1]);
  const expectedIds = inventory.map((figure) => figure.id);
  assert(JSON.stringify([...figureIds].sort()) === JSON.stringify([...expectedIds].sort()),
    `reader-facing concept figure inventory must match the four indexed stable anchors: ${JSON.stringify([...figureIds].sort())}`);

  for (const figure of inventory) {
    assert(fs.existsSync(absolute(figure.sourceSvg)), `required source SVG is missing: ${figure.sourceSvg}`);
    assert(fs.existsSync(absolute(figure.publicSvg)), `required public SVG is missing: ${figure.publicSvg}`);
  }
}

function checkFigure(figure) {
  const sourceMarkdown = read(figure.sourceMarkdown);
  const publicMarkdown = read(figure.publicMarkdown);
  const sourceSvg = read(figure.sourceSvg);
  const publicSvg = read(figure.publicSvg);

  assert(normalizedBody(publicMarkdown) === normalizedBody(sourceMarkdown),
    `source/public Markdown parity failed for ${figure.chapter}`);
  assert(publicSvg === sourceSvg, `source/public SVG parity failed for ${figure.svg}`);

  const anchorPattern = new RegExp(`<figure\\b[^>]*\\bid="${figure.id}"[^>]*>`, 'g');
  assert(occurrences(sourceMarkdown, anchorPattern) === 1,
    `${figure.sourceMarkdown} must contain stable anchor ${figure.id} exactly once`);
  assert(occurrences(publicMarkdown, anchorPattern) === 1,
    `${figure.publicMarkdown} must contain stable anchor ${figure.id} exactly once`);

  const figureStart = sourceMarkdown.search(anchorPattern);
  const figureEnd = sourceMarkdown.indexOf('</figure>', figureStart);
  const figureBlock = figureStart >= 0 && figureEnd >= 0
    ? sourceMarkdown.slice(figureStart, figureEnd + '</figure>'.length)
    : '';
  const alt = figureBlock.match(/<img\b[^>]*\balt="([^"]+)"[^>]*>/s);
  assert(/<figure\b[^>]*\btabindex="0"/.test(figureBlock),
    `${figure.sourceMarkdown} must make the horizontally scrollable figure keyboard focusable`);
  assert(figureBlock.includes(`src="./${figure.svg}"`),
    `${figure.sourceMarkdown} must embed ${figure.svg}`);
  assert(alt && alt[1].trim().length >= 20,
    `${figure.sourceMarkdown} must provide a meaningful img alt description`);
  assert(figureBlock.includes(`<figcaption>${figure.caption}</figcaption>`),
    `${figure.sourceMarkdown} must contain the contracted caption`);

  assert(sourceSvg.startsWith('<svg '), `${figure.sourceSvg} must be a standalone SVG`);
  assert(/\bviewBox="0 0 \d+ \d+"/.test(sourceSvg), `${figure.sourceSvg} must define a viewBox`);
  assert(/\brole="img"/.test(sourceSvg), `${figure.sourceSvg} must expose an image role`);
  assert(/\baria-labelledby="[^"]+"/.test(sourceSvg),
    `${figure.sourceSvg} must connect its accessible title and description`);
  assert(/<title\b[^>]*>[^<]+<\/title>/.test(sourceSvg), `${figure.sourceSvg} must contain a title`);
  assert(/<desc\b[^>]*>[^<]+<\/desc>/.test(sourceSvg), `${figure.sourceSvg} must contain a description`);
  assert(!/<script\b|<image\b|\bhref="https?:|url\(https?:/i.test(sourceSvg),
    `${figure.sourceSvg} must not depend on scripts or external image/font resources`);
}

function checkFigureIndex() {
  const sourceIndex = read(sourceIndexPath);
  const publicIndex = read(publicIndexPath);
  assert(normalizedBody(publicIndex) === normalizedBody(sourceIndex),
    'source/public figure-index Markdown parity failed');

  const links = [...sourceIndex.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)]
    .map((match) => ({ label: match[1], target: match[2] }));
  assert(links.length === 4, `figure index must contain exactly four links, found ${links.length}`);
  for (const [index, figure] of inventory.entries()) {
    const link = links[index];
    assert(link && link.label === figure.caption,
      `figure index entry ${index + 1} must use caption ${figure.caption}`);
    assert(link && link.target === figure.deepLink,
      `figure index entry ${index + 1} must deep-link to ${figure.deepLink}`);
  }
  assert(!/<(?:img|svg)\b|favicon|apple-touch/i.test(sourceIndex),
    'figure index must not reuse UI icons or contain image entries');
}

function checkNavigationAndTopPage() {
  const navigation = read('docs/_data/navigation.yml');
  const paths = [...navigation.matchAll(/^\s+path:\s+"([^"]+)"\s*$/gm)].map((match) => match[1]);
  const appendixC = paths.indexOf('/appendices/appendix-c/');
  const figureIndex = paths.indexOf(canonicalRoute);
  assert(appendixC >= 0, 'public navigation must contain Appendix C');
  assert(figureIndex === appendixC + 1, 'figure index must be immediately after Appendix C in navigation');
  assert(paths.filter((route) => route === canonicalRoute).length === 1,
    'canonical figure-index route must occur exactly once in navigation');
  assert(/-\s+title:\s*["']?図表索引["']?\s*\r?\n\s+path:\s*["']?\/appendices\/figure-index\/["']?\s*$/m.test(navigation),
    'public navigation must label the canonical route as 図表索引');

  const sourceTop = read('index.md');
  const publicTop = read('docs/index.md');
  const topLink = '(appendices/figure-index/)';
  assert(occurrences(sourceTop, /\(appendices\/figure-index\/\)/g) === 1,
    'source top page must link to the figure index exactly once');
  assert(occurrences(publicTop, /\(appendices\/figure-index\/\)/g) === 1,
    'public top page must link to the figure index exactly once');
  assert(normalizedBody(publicTop) === normalizedBody(sourceTop), 'source/public top-page parity failed');
  assert(sourceTop.includes(topLink) && publicTop.includes(topLink),
    'top-page figure-index link must use the canonical relative route');

  const topAppendixPaths = [...sourceTop.matchAll(/^\s+- \[[^\]]+\]\((appendices\/[^)]+)\)$/gm)]
    .map((match) => match[1]);
  const topAppendixC = topAppendixPaths.indexOf('appendices/appendix-c/');
  const topFigureIndex = topAppendixPaths.indexOf('appendices/figure-index/');
  assert(topFigureIndex === topAppendixC + 1,
    'top-page figure index must be immediately after Appendix C');

  assert(read('docs/assets/css/main.css') === read('templates/styles/main.css'),
    'source/public figure presentation CSS parity failed');
  const css = read('templates/styles/main.css');
  assert(css.includes('@media (max-width: 640px)') && css.includes('min-width: 720px'),
    'mobile presentation must preserve figure text size with a horizontal scroll viewport');
}

checkConfiguration();
checkExactSourceInventory();
for (const figure of inventory) checkFigure(figure);
checkFigureIndex();
checkNavigationAndTopPage();

if (!process.exitCode) {
  console.log('OK: figure-index contract is consistent (canonical route, nav/top, exact 4, anchors, parity, UX flag)');
}
