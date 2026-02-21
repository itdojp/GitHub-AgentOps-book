#!/usr/bin/env node

/**
 * Link Checker for Book Publishing Template
 * 
 * Validates internal links in the built documentation to prevent 404 errors
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

// Color output for better UX
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`
};

class LinkChecker {
  constructor() {
    this.brokenLinks = [];
    this.checkedLinks = new Set();
    this.existingFiles = new Map();
    this.anchorsByFile = new Map();
  }

  log(message, type = 'info') {
    const prefix = {
      info: '📝',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    console.log(`${prefix[type]} ${message}`);
  }

  async buildFileIndex(docsDir) {
    this.log('Building file index...');
    
    const files = await glob('**/*', {
      cwd: docsDir,
      absolute: false,
      nodir: true
    });
    
    for (const file of files) {
      const normalizedPath = file.replace(/\\/g, '/');
      this.existingFiles.set(normalizedPath, true);
      
      // Also store without extension for directory URLs
      if (normalizedPath.endsWith('/index.html') || normalizedPath.endsWith('/index.md')) {
        const dirPath = normalizedPath.replace(/\/index\.(html|md)$/, '/');
        this.existingFiles.set(dirPath, true);
        this.existingFiles.set(dirPath.replace(/\/$/, ''), true);
      }
      
      // Store .html version for .md files
      if (normalizedPath.endsWith('.md')) {
        const htmlPath = normalizedPath.replace(/\.md$/, '.html');
        this.existingFiles.set(htmlPath, true);
      }
    }
    
    this.log(`Indexed ${files.length} files`);
  }

  async extractAnchors(filePath, content) {
    const anchors = new Set();
    
    // Extract heading IDs from markdown
    if (filePath.endsWith('.md')) {
      // Match headings with explicit IDs: ## Heading {#custom-id}
      const explicitIds = content.match(/^#+\s+.*?\{#([^}]+)\}/gm) || [];
      for (const match of explicitIds) {
        const id = match.match(/\{#([^}]+)\}/)[1];
        anchors.add(id);
      }
      
      // Match auto-generated IDs from headings
      const headings = content.match(/^#+\s+(.+?)\s*(?:\{#[^}]+\})?$/gm) || [];
      for (const heading of headings) {
        const text = heading.replace(/^#+\s+/, '').replace(/\s*\{#[^}]+\}$/, '');
        // Convert to slug (basic implementation)
        const id = text.toLowerCase()
          .replace(/[^\w\s\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '')
          .replace(/\s+/g, '-');
        if (id) anchors.add(id);
      }
    }
    
    // Extract IDs from HTML
    const htmlIds = content.match(/\sid=["']([^"']+)["']/g) || [];
    for (const match of htmlIds) {
      const id = match.match(/id=["']([^"']+)["']/)[1];
      anchors.add(id);
    }
    
    this.anchorsByFile.set(filePath, anchors);
  }

  extractLinks(content, filePath) {
    const links = [];
    
    // Match markdown links: [text](url)
    const mdLinks = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    for (const match of mdLinks) {
      const url = match.match(/\]\(([^)]+)\)/)[1];
      links.push(url);
    }
    
    // Match HTML links: href="url"
    const htmlLinks = content.match(/href=["']([^"']+)["']/g) || [];
    for (const match of htmlLinks) {
      const url = match.match(/href=["']([^"']+)["']/)[1];
      links.push(url);
    }
    
    // Match image sources
    const imgSrcs = content.match(/(?:src|\!\[[^\]]*\]\()([^"')]+)/g) || [];
    for (const match of imgSrcs) {
      const url = match.replace(/^(src=|!\[[^\]]*\]\()/, '').replace(/["']$/, '');
      links.push(url);
    }
    
    return links
      .map((url) => url.trim())
      .filter((url) => url.length > 0)
      .filter((url) => !(url.includes('{{') || url.includes('{%') || url.includes('}}') || url.includes('%}')));
  }

  isInternalLink(url) {
    if (!url || !url.trim()) return false;
    if (url.includes('{{') || url.includes('{%') || url.includes('}}') || url.includes('%}')) return false;
    if (url.match(/^javascript:/i)) return false;
    if (url.match(/^data:/i)) return false;

    // Skip external URLs
    if (url.match(/^https?:\/\//)) return false;
    if (url.match(/^mailto:/)) return false;
    if (url.match(/^tel:/)) return false;
    if (url.match(/^#/)) return true; // Fragment only
    if (url.startsWith('//')) return false;
    
    return true;
  }

  resolveLink(link, fromFile, docsDir) {
    // Handle fragment-only links
    if (link.startsWith('#')) {
      return {
        file: fromFile,
        fragment: link.substring(1),
        original: link
      };
    }
    
    // Split link and fragment
    const [pathname, fragment] = link.split('#');
    
    let resolvedPath;
    
    if (pathname.startsWith('/')) {
      // Absolute path
      resolvedPath = pathname.substring(1);
    } else {
      // Relative path
      const fromDir = path.dirname(fromFile);
      resolvedPath = path.join(fromDir, pathname).replace(/\\/g, '/');
    }
    
    // Normalize path
    resolvedPath = resolvedPath.replace(/\/+/g, '/');
    
    return {
      file: resolvedPath,
      fragment: fragment || null,
      original: link
    };
  }

  checkLink(resolved, fromFile) {
    const { file, fragment, original } = resolved;
    
    // Check if file exists
    let fileExists = false;
    
    if (this.existingFiles.has(file)) {
      fileExists = true;
    } else if (!file.endsWith('.html') && !file.endsWith('.md')) {
      // Try with index.html
      if (this.existingFiles.has(file + '/index.html') ||
          this.existingFiles.has(file + 'index.html')) {
        fileExists = true;
      }
    }
    
    if (!fileExists) {
      return {
        valid: false,
        reason: 'File not found',
        file: fromFile,
        link: original,
        target: file
      };
    }
    
    // Check fragment if present
    if (fragment) {
      const targetFile = file.endsWith('/') ? file + 'index.html' : file;
      const anchors = this.anchorsByFile.get(targetFile) || 
                     this.anchorsByFile.get(targetFile.replace('.html', '.md'));
      
      if (anchors && !anchors.has(fragment)) {
        return {
          valid: false,
          reason: 'Anchor not found',
          file: fromFile,
          link: original,
          target: file,
          fragment: fragment
        };
      }
    }
    
    return { valid: true };
  }

  async checkFile(filePath, docsDir) {
    const fullPath = path.join(docsDir, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // Extract anchors from this file
    await this.extractAnchors(filePath, content);
    
    // Extract and check links
    const links = this.extractLinks(content, filePath);
    
    for (const link of links) {
      // Skip if already checked
      const checkKey = `${filePath}:${link}`;
      if (this.checkedLinks.has(checkKey)) continue;
      this.checkedLinks.add(checkKey);
      
      // Skip external links
      if (!this.isInternalLink(link)) continue;
      
      // Resolve and check link
      const resolved = this.resolveLink(link, filePath, docsDir);
      const result = this.checkLink(resolved, filePath);
      
      if (!result.valid) {
        this.brokenLinks.push(result);
      }
    }
  }

  async checkLinks(docsDir = 'docs') {
    const startTime = Date.now();
    
    try {
      // Check if docs directory exists
      await fs.access(docsDir);
    } catch (error) {
      this.log(`Directory not found: ${docsDir}`, 'error');
      return false;
    }
    
    // Build file index
    await this.buildFileIndex(docsDir);
    
    // Check all HTML and Markdown files
    const files = await glob('**/*.{html,md}', {
      cwd: docsDir,
      absolute: false,
      ignore: ['_includes/**', '_layouts/**', '_data/**']
    });
    
    this.log(`Checking links in ${files.length} files...`);
    
    for (const file of files) {
      await this.checkFile(file, docsDir);
    }
    
    // Report results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (this.brokenLinks.length === 0) {
      this.log(`${colors.green('All links valid!')} (${this.checkedLinks.size} links checked in ${duration}s)`, 'success');
      return true;
    } else {
      this.log(`${colors.red(`Found ${this.brokenLinks.length} broken links`)} in ${duration}s`, 'error');
      
      // Group by file
      const byFile = {};
      for (const broken of this.brokenLinks) {
        if (!byFile[broken.file]) byFile[broken.file] = [];
        byFile[broken.file].push(broken);
      }
      
      // Display broken links
      console.log('\n' + colors.red('Broken Links:'));
      for (const [file, links] of Object.entries(byFile)) {
        console.log(`\n${colors.yellow(file)}:`);
        for (const link of links) {
          let message = `  ${link.link} → ${link.target}`;
          if (link.fragment) {
            message += `#${link.fragment}`;
          }
          message += ` (${link.reason})`;
          console.log(colors.red(message));
        }
      }
      
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const checker = new LinkChecker();
  const docsDir = process.argv[2] || 'docs';
  
  checker.checkLinks(docsDir).then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error(colors.red('Error:'), error.message);
    process.exit(1);
  });
}

module.exports = LinkChecker;
