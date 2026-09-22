/**
 * tools/build.js
 * 
 * Build system for modules-shadowrocket.
 * Merges all .module files in modules/stable/ into a single dist/all-in-one.module file.
 * 
 * Usage: node tools/build.js [--base-url URL] [--timestamp] [--tag TAG]
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STABLE_DIR = path.join(ROOT_DIR, 'modules', 'stable');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main';

// Parse CLI arguments
const args = process.argv.slice(2);
let baseUrl = DEFAULT_BASE_URL;
let includeTimestamp = false;
let tag = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i] === '--timestamp') {
    includeTimestamp = true;
  } else if (args[i] === '--tag' && args[i + 1]) {
    tag = args[++i];
    // Replace /main/ or /refs/heads/main/ with tag in base URL
    baseUrl = baseUrl.replace(/\/main\b/, `/${tag}`);
  }
}

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Merged data structures — Sets ensure deduplication
const merged = {
  general: new Set(),
  rule: new Set(),
  urlRewrite: new Set(),
  rewrite: new Set(),
  script: new Set(),
  mitmHosts: new Set(),
  moduleComments: []  // preserved #! comments (non-header)
};

const KNOWN_SECTIONS = ['[General]', '[Rule]', '[URL Rewrite]', '[Rewrite]', '[Script]', '[MITM]'];

/**
 * Parse a single module file and merge its sections into the merged data.
 */
function processModuleFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip module-specific metadata headers (we generate our own)
    if (line.startsWith('#!name=') || line.startsWith('#!desc=') ||
        line.startsWith('#!author=') || line.startsWith('#!version=') ||
        line.startsWith('#!last-tested=') || line.startsWith('#!homepage=') ||
        line.startsWith('#!url=') || line.startsWith('#!icon=')) {
      continue;
    }

    // Preserve other #! comments (e.g. #!icon)
    if (line.startsWith('#!')) {
      merged.moduleComments.push(line);
      continue;
    }

    // Detect section headers
    if (line.startsWith('[') && line.endsWith(']')) {
      const match = KNOWN_SECTIONS.find(s => s.toLowerCase() === line.toLowerCase());
      currentSection = match || null;
      continue;
    }

    // Skip pure comment lines within sections
    if (line.startsWith('#') || line.startsWith('//')) continue;

    if (!currentSection) continue;

    // Rewrite relative script-path to absolute URL
    let processedLine = line;
    if (processedLine.includes('script-path=scripts/')) {
      processedLine = processedLine.replace(
        /script-path=scripts\//g,
        `script-path=${baseUrl}/scripts/`
      );
    }

    switch (currentSection) {
      case '[General]':
        merged.general.add(processedLine);
        break;
      case '[Rule]':
        merged.rule.add(processedLine);
        break;
      case '[URL Rewrite]':
        merged.urlRewrite.add(processedLine);
        break;
      case '[Rewrite]':
        merged.rewrite.add(processedLine);
        break;
      case '[Script]':
        merged.script.add(processedLine);
        break;
      case '[MITM]':
        if (processedLine.toLowerCase().startsWith('hostname')) {
          const eqIdx = processedLine.indexOf('=');
          if (eqIdx !== -1) {
            let hostsStr = processedLine.slice(eqIdx + 1);
            hostsStr = hostsStr.replace(/%(?:APPEND|INSERT)%/gi, '');
            const hosts = hostsStr.split(',').map(h => h.trim()).filter(Boolean);
            hosts.forEach(h => merged.mitmHosts.add(h));
          }
        }
        break;
    }
  }
}

/**
 * Generate the merged all-in-one module file.
 */
function build() {
  // Find all stable module files
  if (!fs.existsSync(STABLE_DIR)) {
    console.error(`Error: stable modules directory not found: ${STABLE_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(STABLE_DIR)
    .filter(f => f.endsWith('.module'))
    .sort()  // deterministic ordering
    .map(f => path.join(STABLE_DIR, f));

  if (files.length === 0) {
    console.warn('Warning: No .module files found in modules/stable/');
  }

  console.log(`Processing ${files.length} stable module(s)...`);
  for (const file of files) {
    console.log(`  - ${path.basename(file)}`);
    processModuleFile(file);
  }

  // Build output lines
  const out = [];

  out.push('#!name=All-in-One Module');
  out.push('#!desc=Merged module containing all stable rules and scripts');
  out.push('#!author=modules-shadowrocket');

  if (includeTimestamp) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    out.push(`# Build: ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  }

  // Sections — each sorted for determinism
  if (merged.general.size > 0) {
    out.push('', '[General]');
    out.push(...Array.from(merged.general).sort());
  }

  if (merged.rule.size > 0) {
    out.push('', '[Rule]');
    out.push(...Array.from(merged.rule).sort());
  }

  if (merged.urlRewrite.size > 0) {
    out.push('', '[URL Rewrite]');
    out.push(...Array.from(merged.urlRewrite).sort());
  }

  if (merged.rewrite.size > 0) {
    out.push('', '[Rewrite]');
    out.push(...Array.from(merged.rewrite).sort());
  }

  if (merged.script.size > 0) {
    out.push('', '[Script]');
    out.push(...Array.from(merged.script).sort());
  }

  if (merged.mitmHosts.size > 0) {
    out.push('', '[MITM]');
    const sorted = Array.from(merged.mitmHosts).sort();
    out.push(`hostname = %APPEND% ${sorted.join(', ')}`);
  }

  out.push(''); // trailing newline

  const outputPath = path.join(DIST_DIR, 'all-in-one.module');
  fs.writeFileSync(outputPath, out.join('\n'), 'utf-8');
  console.log(`\nBuilt: ${outputPath}`);
  console.log(`  Rules: ${merged.rule.size}`);
  console.log(`  URL Rewrites: ${merged.urlRewrite.size}`);
  console.log(`  Scripts: ${merged.script.size}`);
  console.log(`  MITM Hosts: ${merged.mitmHosts.size}`);
}

build();
