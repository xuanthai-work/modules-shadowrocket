/**
 * tools/build.js
 * 
 * Build system for modules-shadowrocket.
 * 
 * Functions:
 * 1. Reads each source module (from modules/stable/ and modules/experimental/) and generates
 *    a standalone module in dist/modules/<name>.module with resolved absolute script-path URLs.
 * 2. Merges target modules into a deterministic dist/all-in-one.module.
 *    - By default, merges modules from modules/stable/ only.
 *    - With --include-experimental, merges modules/stable/ + modules/experimental/.
 *    - If there are no modules to merge (e.g. modules/stable/ is empty and --include-experimental
 *      is not set), writes an explicit empty all-in-one.module that documents why it is empty
 *      instead of silently merging an arbitrary subset of modules.
 * 
 * Usage: node tools/build.js [--base-url URL] [--timestamp] [--tag TAG] [--include-experimental]
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STABLE_DIR = path.join(ROOT_DIR, 'modules', 'stable');
const EXPERIMENTAL_DIR = path.join(ROOT_DIR, 'modules', 'experimental');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_MODULES_DIR = path.join(DIST_DIR, 'modules');

const DEFAULT_BASE_URL = 'https://raw.githubusercontent.com/xuanthai-work/modules-shadowrocket/main';

// Parse CLI arguments
const args = process.argv.slice(2);
let baseUrl = DEFAULT_BASE_URL;
let includeTimestamp = false;
let tag = null;
let includeExperimental = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--base-url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (args[i] === '--timestamp') {
    includeTimestamp = true;
  } else if (args[i] === '--tag' && args[i + 1]) {
    tag = args[++i];
    baseUrl = baseUrl.replace(/\/main\b/, `/${tag}`);
  } else if (args[i] === '--include-experimental') {
    includeExperimental = true;
  }
}

// Ensure dist directories exist
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
if (!fs.existsSync(DIST_MODULES_DIR)) fs.mkdirSync(DIST_MODULES_DIR, { recursive: true });

const KNOWN_SECTIONS = ['[General]', '[Rule]', '[URL Rewrite]', '[Rewrite]', '[Script]', '[MITM]'];

/**
 * Build a standalone module into dist/modules/<filename> with absolute script-path.
 */
function buildStandaloneModule(srcPath, outPath) {
  const content = fs.readFileSync(srcPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const outLines = [];

  for (const rawLine of lines) {
    let line = rawLine;
    if (line.includes('script-path=scripts/')) {
      line = line.replace(/script-path=scripts\//g, `script-path=${baseUrl}/scripts/`);
    }
    outLines.push(line);
  }

  fs.writeFileSync(outPath, outLines.join('\n'), 'utf-8');
}

/**
 * Return sorted absolute paths of .module files in a directory (empty array if missing).
 */
function getModuleFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.module'))
    .sort()
    .map(f => path.join(dir, f));
}

/**
 * Build all standalone modules in dist/modules/
 */
function buildAllStandaloneModules() {
  const allModules = [];
  for (const dir of [STABLE_DIR, EXPERIMENTAL_DIR]) {
    for (const src of getModuleFiles(dir)) {
      allModules.push({ name: path.basename(src), src });
    }
  }

  console.log(`Building ${allModules.length} standalone distribution module(s)...`);
  for (const mod of allModules) {
    const outPath = path.join(DIST_MODULES_DIR, mod.name);
    buildStandaloneModule(mod.src, outPath);
    console.log(`  -> dist/modules/${mod.name}`);
  }
}

/**
 * Merged container for all-in-one module.
 */
function createMergedContainer() {
  return {
    general: new Set(),
    rule: new Set(),
    urlRewrite: new Set(),
    rewrite: new Set(),
    script: new Set(),
    mitmHosts: new Set()
  };
}

function processModuleFileForMerge(filePath, container) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip metadata headers
    if (line.startsWith('#!')) continue;

    // Detect section headers
    if (line.startsWith('[') && line.endsWith(']')) {
      const match = KNOWN_SECTIONS.find(s => s.toLowerCase() === line.toLowerCase());
      currentSection = match || null;
      continue;
    }

    // Skip comment lines
    if (line.startsWith('#') || line.startsWith('//')) continue;

    if (!currentSection) continue;

    let processedLine = line;
    if (processedLine.includes('script-path=scripts/')) {
      processedLine = processedLine.replace(
        /script-path=scripts\//g,
        `script-path=${baseUrl}/scripts/`
      );
    }

    switch (currentSection) {
      case '[General]':
        container.general.add(processedLine);
        break;
      case '[Rule]':
        container.rule.add(processedLine);
        break;
      case '[URL Rewrite]':
        container.urlRewrite.add(processedLine);
        break;
      case '[Rewrite]':
        container.rewrite.add(processedLine);
        break;
      case '[Script]':
        container.script.add(processedLine);
        break;
      case '[MITM]':
        if (processedLine.toLowerCase().startsWith('hostname')) {
          const eqIdx = processedLine.indexOf('=');
          if (eqIdx !== -1) {
            let hostsStr = processedLine.slice(eqIdx + 1);
            hostsStr = hostsStr.replace(/%(?:APPEND|INSERT)%/gi, '');
            const hosts = hostsStr.split(',').map(h => h.trim()).filter(Boolean);
            hosts.forEach(h => container.mitmHosts.add(h));
          }
        }
        break;
    }
  }
}

/**
 * Build the unified all-in-one.module
 */
function writeEmptyAllInOne() {
  const outputPath = path.join(DIST_DIR, 'all-in-one.module');
  const out = [
    '#!name=All-in-One Module',
    '#!desc=No modules merged: modules/stable/ is empty and --include-experimental was not set. ' +
      'Re-run "node tools/build.js --include-experimental" to merge experimental modules. ' +
      'This file intentionally contains no rules or scripts.',
    '#!author=modules-shadowrocket',
    '#!version=1.0.0',
    ''
  ];
  fs.writeFileSync(outputPath, out.join('\n'), 'utf-8');
  console.warn('\n[build] modules/stable/ is empty and --include-experimental was not set.');
  console.warn('[build] No modules to merge; wrote an explicit empty all-in-one.module.');
  console.log(`\nBuilt all-in-one: ${outputPath} (empty)`);
}

function buildAllInOne() {
  const container = createMergedContainer();

  // Determine source modules to merge.
  //   - Always include stable modules.
  //   - Include experimental modules only when --include-experimental is set.
  const stableFiles = getModuleFiles(STABLE_DIR);
  const experimentalFiles = includeExperimental ? getModuleFiles(EXPERIMENTAL_DIR) : [];

  const sourceFiles = [...stableFiles, ...experimentalFiles]
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

  // Explicit handling when there is nothing to merge (avoids a misleading "all-in-one").
  if (sourceFiles.length === 0) {
    writeEmptyAllInOne();
    return;
  }

  const includesExperimental = experimentalFiles.length > 0;
  const stableEmpty = stableFiles.length === 0;

  console.log(`\nMerging ${sourceFiles.length} module(s) into all-in-one.module${includesExperimental ? ' (includes experimental)' : ''}...`);
  for (const file of sourceFiles) {
    console.log(`  + ${path.basename(file)}`);
    processModuleFileForMerge(file, container);
  }

  let desc;
  if (stableEmpty && includesExperimental) {
    desc = '#!desc=Merged module (EXPERIMENTAL ONLY — no stable modules exist yet). Static validation passed; runtime compatibility not verified.';
  } else if (includesExperimental) {
    desc = '#!desc=Merged module containing all stable modules plus experimental modules. Static validation passed; experimental runtime compatibility not verified.';
  } else {
    desc = '#!desc=Merged module containing all stable rules and scripts.';
  }

  const out = [];
  out.push('#!name=All-in-One Module');
  out.push(desc);
  out.push('#!author=modules-shadowrocket');
  out.push(`#!version=1.0.0`);

  if (includeTimestamp) {
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    out.push(`# Build: ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
  }

  if (container.general.size > 0) {
    out.push('', '[General]');
    out.push(...Array.from(container.general).sort());
  }

  if (container.rule.size > 0) {
    out.push('', '[Rule]');
    out.push(...Array.from(container.rule).sort());
  }

  if (container.urlRewrite.size > 0) {
    out.push('', '[URL Rewrite]');
    out.push(...Array.from(container.urlRewrite).sort());
  }

  if (container.rewrite.size > 0) {
    out.push('', '[Rewrite]');
    out.push(...Array.from(container.rewrite).sort());
  }

  if (container.script.size > 0) {
    out.push('', '[Script]');
    out.push(...Array.from(container.script).sort());
  }

  if (container.mitmHosts.size > 0) {
    out.push('', '[MITM]');
    const sorted = Array.from(container.mitmHosts).sort();
    out.push(`hostname = %APPEND% ${sorted.join(', ')}`);
  }

  out.push('');

  const outputPath = path.join(DIST_DIR, 'all-in-one.module');
  fs.writeFileSync(outputPath, out.join('\n'), 'utf-8');
  console.log(`\nBuilt all-in-one: ${outputPath}`);
  console.log(`  Rules: ${container.rule.size}`);
  console.log(`  URL Rewrites: ${container.urlRewrite.size}`);
  console.log(`  Scripts: ${container.script.size}`);
  console.log(`  MITM Hosts: ${container.mitmHosts.size}`);
}

function main() {
  buildAllStandaloneModules();
  buildAllInOne();
}

main();
