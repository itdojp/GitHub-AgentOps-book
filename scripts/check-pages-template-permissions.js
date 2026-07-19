#!/usr/bin/env node
'use strict';

/**
 * Validate the least-privilege and event-boundary contract of the Pages
 * workflow template without adding a runtime YAML dependency.
 *
 * This parser intentionally understands only the indentation used by the
 * checked template. actionlint remains responsible for full YAML validation.
 */

const fs = require('fs');
const path = require('path');

const defaultWorkflowPath = path.join(
  process.cwd(),
  'templates',
  'github-workflows',
  'build-actions.yml',
);

const trustedDeployCondition =
  "github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')";

function fail(message) {
  throw new Error(message);
}

function linesOf(source) {
  return source.replace(/\r\n/g, '\n').split('\n');
}

function indentation(line) {
  const match = line.match(/^ */);
  return match ? match[0].length : 0;
}

function findBlock(lines, key, indent, start = 0, end = lines.length) {
  const expected = `${' '.repeat(indent)}${key}:`;
  let first = -1;
  for (let index = start; index < end; index += 1) {
    if (lines[index] === expected || lines[index].startsWith(`${expected} `)) {
      first = index;
      break;
    }
  }
  if (first < 0) fail(`required block is missing: ${key} (indent ${indent})`);

  let last = end;
  for (let index = first + 1; index < end; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (indentation(line) <= indent) {
      last = index;
      break;
    }
  }
  return { start: first, end: last, lines: lines.slice(first, last) };
}

function scalarAfterColon(line) {
  return line.slice(line.indexOf(':') + 1).trim();
}

function readScalarMap(block, childIndent) {
  const result = new Map();
  for (const line of block.lines.slice(1)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (indentation(line) !== childIndent) continue;
    const trimmed = line.trim();
    if (!trimmed.includes(':')) continue;
    const key = trimmed.slice(0, trimmed.indexOf(':'));
    const value = scalarAfterColon(trimmed);
    if (result.has(key)) fail(`duplicate key in ${block.lines[0].trim()}: ${key}`);
    result.set(key, value);
  }
  return result;
}

function readDirectKeys(block, childIndent) {
  const keys = [];
  for (const line of block.lines.slice(1)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (indentation(line) !== childIndent) continue;
    const trimmed = line.trim();
    const colon = trimmed.indexOf(':');
    if (colon <= 0) fail(`unsupported direct mapping syntax in ${block.lines[0].trim()}: ${trimmed}`);
    const key = trimmed.slice(0, colon).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(key)) {
      fail(`unsupported direct mapping key in ${block.lines[0].trim()}: ${key}`);
    }
    if (keys.includes(key)) fail(`duplicate direct mapping key in ${block.lines[0].trim()}: ${key}`);
    keys.push(key);
  }
  return keys;
}

function assertExactPermissions(actual, expected, label) {
  const actualEntries = [...actual.entries()].sort(([a], [b]) => a.localeCompare(b));
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
    fail(`${label} permissions mismatch: expected ${JSON.stringify(expectedEntries)}, got ${JSON.stringify(actualEntries)}`);
  }
}

function findStep(job, name) {
  const expected = `- name: ${name}`;
  for (let index = 0; index < job.lines.length; index += 1) {
    if (job.lines[index].trim() !== expected) continue;
    const indent = indentation(job.lines[index]);
    let end = job.lines.length;
    for (let cursor = index + 1; cursor < job.lines.length; cursor += 1) {
      const line = job.lines[cursor];
      if (!line.trim() || line.trimStart().startsWith('#')) continue;
      if (indentation(line) === indent && line.trimStart().startsWith('- ')) {
        end = cursor;
        break;
      }
      if (indentation(line) < indent) {
        end = cursor;
        break;
      }
    }
    return job.lines.slice(index, end);
  }
  fail(`required step is missing from ${job.lines[0].trim()}: ${name}`);
}

function readStepScalar(stepLines, key) {
  const prefix = `${key}:`;
  const line = stepLines.find((candidate) => candidate.trim().startsWith(prefix));
  if (!line) fail(`required step key is missing: ${key}`);
  return scalarAfterColon(line.trim());
}

function readJobScalar(job, key) {
  const prefix = `${key}:`;
  const jobIndent = indentation(job.lines[0]);
  const line = job.lines.slice(1).find((candidate) => (
    indentation(candidate) === jobIndent + 2 && candidate.trim().startsWith(prefix)
  ));
  if (!line) fail(`required job key is missing from ${job.lines[0].trim()}: ${key}`);
  return scalarAfterColon(line.trim());
}

function validateWorkflow(source) {
  const lines = linesOf(source);
  if (lines.some((line) => /\t/.test(line))) fail('tabs are not allowed in the workflow template');

  const eventBlock = findBlock(lines, 'on', 0);
  for (const event of ['push', 'pull_request', 'workflow_dispatch']) {
    findBlock(lines, event, 2, eventBlock.start + 1, eventBlock.end);
  }

  const workflowPermissions = findBlock(lines, 'permissions', 0);
  assertExactPermissions(
    readScalarMap(workflowPermissions, 2),
    { contents: 'read' },
    'workflow default',
  );

  const jobs = findBlock(lines, 'jobs', 0);
  const jobNames = readDirectKeys(jobs, 2);
  if (JSON.stringify(jobNames) !== JSON.stringify(['build', 'deploy'])) {
    fail(`jobs must be exactly ["build","deploy"]; got ${JSON.stringify(jobNames)}`);
  }
  const build = findBlock(lines, 'build', 2, jobs.start + 1, jobs.end);
  const deploy = findBlock(lines, 'deploy', 2, jobs.start + 1, jobs.end);

  const buildPermissions = findBlock(build.lines, 'permissions', 4);
  assertExactPermissions(
    readScalarMap(buildPermissions, 6),
    { contents: 'read' },
    'build job',
  );

  const deployPermissions = findBlock(deploy.lines, 'permissions', 4);
  assertExactPermissions(
    readScalarMap(deployPermissions, 6),
    { pages: 'write', 'id-token': 'write' },
    'deploy job',
  );

  if (readJobScalar(deploy, 'if') !== trustedDeployCondition) {
    fail('deploy job must be limited to main push or main workflow_dispatch');
  }
  if (readJobScalar(deploy, 'needs') !== 'build') fail('deploy job must need the build job');

  const environment = findBlock(deploy.lines, 'environment', 4);
  const environmentMap = readScalarMap(environment, 6);
  if (environmentMap.get('name') !== 'github-pages') {
    fail('deploy job must use the github-pages environment');
  }

  const upload = findStep(build, 'Upload artifact');
  if (readStepScalar(upload, 'if') !== trustedDeployCondition) {
    fail('Pages artifact upload must be limited to main push or main workflow_dispatch');
  }

  const deployStep = findStep(deploy, 'Deploy to GitHub Pages');
  if (!readStepScalar(deployStep, 'uses').startsWith('actions/deploy-pages@')) {
    fail('deploy job must contain actions/deploy-pages');
  }

  return {
    events: ['push', 'pull_request', 'workflow_dispatch'],
    jobs: jobNames,
    workflowPermissions: Object.fromEntries(readScalarMap(workflowPermissions, 2)),
    buildPermissions: Object.fromEntries(readScalarMap(buildPermissions, 6)),
    deployPermissions: Object.fromEntries(readScalarMap(deployPermissions, 6)),
  };
}

function main() {
  const workflowPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultWorkflowPath;
  let source;
  try {
    source = fs.readFileSync(workflowPath, 'utf8');
  } catch (error) {
    console.error(`ERROR: failed to read ${path.relative(process.cwd(), workflowPath)}: ${error.message}`);
    process.exit(1);
  }

  try {
    const result = validateWorkflow(source);
    console.log(`OK: Pages template least-privilege contract is valid (${JSON.stringify(result)})`);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { trustedDeployCondition, validateWorkflow };
