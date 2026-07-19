#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { validateRepository } = require('./check-companion-assets');

const root = process.cwd();
const fixtureRoot = path.join(root, '.codex-local', 'tmp', 'companion-assets-tests');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'config/companion-assets.json'), 'utf8'));

function copyFixture(target) {
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(root, 'config/companion-assets.json'), path.join(target, 'catalog.json'));
  for (const relativePath of catalog.scannedDocuments) {
    const source = path.join(root, relativePath);
    const destination = path.join(target, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  fs.mkdirSync(path.join(target, 'config'), { recursive: true });
  fs.renameSync(path.join(target, 'catalog.json'), path.join(target, 'config', 'companion-assets.json'));
}

function mutateJson(target, mutator) {
  const file = path.join(target, 'config', 'companion-assets.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutator(data);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function appendToPair(target, sourcePath, docsPath, line) {
  for (const relativePath of [sourcePath, docsPath]) {
    fs.appendFileSync(path.join(target, relativePath), `\n${line}\n`);
  }
}

function expectFailure(name, mutate, pattern) {
  const target = path.join(fixtureRoot, name);
  copyFixture(target);
  mutate(target);
  try {
    validateRepository(target);
  } catch (error) {
    if (!pattern.test(error.message)) {
      throw new Error(`${name}: unexpected failure: ${error.message}`);
    }
    return;
  }
  throw new Error(`${name}: checker accepted an invalid fixture`);
}

function expectSuccess(name, mutate) {
  const target = path.join(fixtureRoot, name);
  copyFixture(target);
  mutate(target);
  try {
    validateRepository(target);
  } catch (error) {
    throw new Error(`${name}: checker rejected a valid fixture: ${error.message}`);
  }
}

fs.rmSync(fixtureRoot, { recursive: true, force: true });
fs.mkdirSync(fixtureRoot, { recursive: true });

try {
  validateRepository(root);

  expectSuccess('empty-planned-assets', (target) => {
    const plannedPaths = catalog.plannedAssets.map((asset) => asset.path);
    mutateJson(target, (data) => {
      data.plannedAssets = [];
      data.inventory.plannedAssets = 0;
    });
    for (const relativePath of catalog.scannedDocuments) {
      const file = path.join(target, relativePath);
      const content = plannedPaths.reduce(
        (updated, plannedPath) => updated.replaceAll(plannedPath, 'retired-planned-asset'),
        fs.readFileSync(file, 'utf8')
      );
      fs.writeFileSync(file, content);
    }
  });

  expectFailure(
    'unregistered-path',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
        '- `skills/unknown/SKILL.md`'
      ),
    /unregistered companion path/
  );

  expectFailure(
    'planned-without-marker',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-b/index.md',
        'docs/appendices/appendix-b/index.md',
        '- copy `.github/ISSUE_TEMPLATE/security-review.yml`'
      ),
    /planned asset must be marked/
  );

  expectFailure(
    'unregistered-markdown-link',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-b/index.md',
        'docs/appendices/appendix-b/index.md',
        '- [unknown asset](skills/unknown/SKILL.md)'
      ),
    /unregistered companion path/
  );

  expectFailure(
    'planned-plain-text',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-b/index.md',
        'docs/appendices/appendix-b/index.md',
        '- copy .github/copilot-instructions.md'
      ),
    /planned asset must be marked/
  );

  expectFailure(
    'planned-html-code',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-b/index.md',
        'docs/appendices/appendix-b/index.md',
        '- copy <code>.github/hooks/pre-tool-use.json</code>'
      ),
    /planned asset must be marked/
  );

  expectFailure(
    'mutable-main-link',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
        '- https://github.com/itdojp/GitHub-AgentOps-companion/blob/main/AGENTS.md'
      ),
    /must not use mutable main/
  );

  expectFailure(
    'mutable-raw-link',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
        '- https://raw.githubusercontent.com/itdojp/GitHub-AgentOps-companion/main/AGENTS.md'
      ),
    /must not use mutable main/
  );

  expectFailure(
    'mutable-refs-heads-link',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
        '- https://github.com/itdojp/GitHub-AgentOps-companion/blob/refs/heads/main/AGENTS.md'
      ),
    /must not use mutable main/
  );

  expectFailure(
    'mutable-api-contents-ref',
    (target) =>
      appendToPair(
        target,
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
        '- https://api.github.com/repos/itdojp/GitHub-AgentOps-companion/contents/AGENTS.md?ref=refs/heads/main'
      ),
    /must not use mutable main/
  );

  expectFailure(
    'source-docs-drift',
    (target) =>
      fs.appendFileSync(
        path.join(target, 'src/chapters/chapter02/index.md'),
        '\n- `custom-agents/doc-agent/.agent.md`\n'
      ),
    /out of sync/
  );

  expectFailure(
    'mutable-companion-ref',
    (target) =>
      mutateJson(target, (data) => {
        data.companion.commit = 'main';
      }),
    /immutable full-length commit SHA/
  );

  expectFailure(
    'shipped-planned-overlap',
    (target) =>
      mutateJson(target, (data) => {
        data.plannedAssets.push({
          path: data.shippedAssets[0].path,
          status: 'planned',
          availability: 'not-yet-shipped',
        });
      }),
    /both shipped and planned/
  );

  expectFailure(
    'planned-missing-from-appendix',
    (target) => {
      const plannedPath = '.github/hooks/session-end.json';
      for (const relativePath of [
        'src/appendices/appendix-a/index.md',
        'docs/appendices/appendix-a/index.md',
      ]) {
        const file = path.join(target, relativePath);
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll(`\`${plannedPath}\``, 'planned hook'));
      }
    },
    /planned asset must be listed in Appendix A/
  );

  expectFailure(
    'inventory-count-drift',
    (target) =>
      mutateJson(target, (data) => {
        data.shippedAssets.pop();
      }),
    /inventory\.shippedAssets/
  );

  expectFailure(
    'scanned-path-traversal',
    (target) =>
      mutateJson(target, (data) => {
        data.scannedDocuments.push('../outside.md');
        data.inventory.scannedDocuments += 1;
      }),
    /invalid scanned document path/
  );

  expectFailure(
    'symlinked-document',
    (target) => {
      const file = path.join(target, 'CHECKLIST.md');
      fs.unlinkSync(file);
      fs.symlinkSync(path.join(root, 'CHECKLIST.md'), file);
    },
    /symbolic links are not allowed/
  );

  expectFailure(
    'symlink-mode-in-catalog',
    (target) =>
      mutateJson(target, (data) => {
        data.shippedAssets[0].mode = '120000';
      }),
    /regular-file git mode/
  );

  expectFailure(
    'unlisted-companion-document',
    (target) => {
      const file = path.join(target, 'src/chapters/chapter99/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        '# Example\n\nCompanion repo: https://github.com/itdojp/GitHub-AgentOps-companion\n\n- `AGENTS.md`\n'
      );
    },
    /fixed-path document must be classified/
  );

  expectFailure(
    'unclassified-fixed-path-document',
    (target) => {
      const file = path.join(target, 'src/chapters/chapter98/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '# Example\n\n- `.github/workflows/codex-pr-review.yml`\n');
    },
    /fixed-path document must be classified/
  );

  expectFailure(
    'generic-document-links-companion',
    (target) => {
      const file = path.join(target, 'src/chapters/chapter97/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        '# Example\n\n<!-- companion-path-scope: generic -->\n\n' +
          'https://github.com/itdojp/GitHub-AgentOps-companion\n\n- `AGENTS.md`\n'
      );
    },
    /generic document must not link/
  );

  expectFailure(
    'root-index-planned-path',
    (target) => {
      for (const relativePath of ['index.md', 'docs/index.md']) {
        fs.appendFileSync(path.join(target, relativePath), '\n- `.github/copilot-instructions.md`\n');
      }
    },
    /planned asset must be marked/
  );

  expectFailure(
    'root-index-mutable-link',
    (target) => {
      for (const relativePath of ['index.md', 'docs/index.md']) {
        fs.appendFileSync(
          path.join(target, relativePath),
          '\nhttps://github.com/itdojp/GitHub-AgentOps-companion/blob/main/AGENTS.md\n'
        );
      }
    },
    /must not use mutable main/
  );

  expectFailure(
    'public-unclassified-fixed-path',
    (target) => {
      const file = path.join(target, 'docs/chapters/chapter96/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, '# Example\n\n- `.github/workflows/codex-pr-review.yml`\n');
    },
    /public fixed-path document must be classified/
  );

  expectFailure(
    'public-generic-mutable-link',
    (target) => {
      const file = path.join(target, 'docs/chapters/chapter95/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        '# Example\n\n<!-- companion-path-scope: generic -->\n\n' +
          'https://raw.githubusercontent.com/itdojp/GitHub-AgentOps-companion/main/AGENTS.md\n'
      );
    },
    /public Companion link must not use mutable/
  );

  expectFailure(
    'source-generic-companion-claim-without-path',
    (target) => {
      const file = path.join(target, 'src/chapters/chapter94/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        '# Example\n\n<!-- companion-path-scope: generic -->\n\n' +
          'Companion repository is https://github.com/itdojp/GitHub-AgentOps-companion\n'
      );
    },
    /generic document must not link/
  );

  expectFailure(
    'public-generic-companion-claim-without-path',
    (target) => {
      const file = path.join(target, 'docs/chapters/chapter93/index.md');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        '# Example\n\n<!-- companion-path-scope: generic -->\n\n' +
          'Companion repository is https://github.com/itdojp/GitHub-AgentOps-companion\n'
      );
    },
    /public generic document must not link/
  );

  console.log('Companion asset fixtures: 2 positive, 26 negative passed');
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
