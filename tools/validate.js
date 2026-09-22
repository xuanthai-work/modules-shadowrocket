/**
 * tools/validate.js
 * 
 * Validates .module files in modules/stable/ and modules/experimental/.
 * Checks for syntax, duplicates, missing dependencies, placeholders, etc.
 * 
 * Usage: node tools/validate.js
 * Exit code: 0 = pass, 1 = errors found
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MODULES_DIRS = [
  path.join(ROOT_DIR, 'modules', 'stable'),
  path.join(ROOT_DIR, 'modules', 'experimental')
];

let errorCount = 0;
let warningCount = 0;

function error(file, line, msg) {
  console.error(`  ERROR  ${file}:${line} — ${msg}`);
  errorCount++;
}

function warn(file, line, msg) {
  console.warn(`  WARN   ${file}:${line} — ${msg}`);
  warningCount++;
}

// Track global duplicates across all modules
const allHosts = new Map();    // hostname -> {file, line}
const allRules = new Map();    // rule text -> {file, line}
const allScripts = new Map();  // script name -> {file, line}

const VALID_SECTIONS = ['[General]', '[Rule]', '[URL Rewrite]', '[Rewrite]', '[Script]', '[MITM]'];

/**
 * Check if a string is a valid regex.
 */
function isValidRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Basic JS syntax check using Function constructor.
 */
function checkJsSyntax(jsPath, moduleFile, lineNum) {
  const absPath = path.resolve(ROOT_DIR, jsPath);
  if (!fs.existsSync(absPath)) {
    error(moduleFile, lineNum, `Missing local JS file: ${jsPath}`);
    return;
  }
  try {
    const code = fs.readFileSync(absPath, 'utf-8');
    new Function(code);
  } catch (e) {
    // Extract just the first line of error message
    const msg = e.message.split('\n')[0];
    warn(moduleFile, lineNum, `JS syntax issue in ${jsPath}: ${msg}`);
  }
}

/**
 * Validate a single .module file.
 */
function validateModule(filePath) {
  const relFile = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);

  let hasName = false;
  let hasDesc = false;
  let currentSection = null;

  console.log(`  Checking ${relFile}...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;

    if (!line) continue;

    // Check for unrendered placeholders
    if (line.includes('{{{') && line.includes('}}}')) {
      error(relFile, lineNum, `Unrendered placeholder: ${line.match(/\{\{\{[^}]+\}\}\}/g).join(', ')}`);
    }

    // Check metadata
    if (line.startsWith('#!name=')) { hasName = true; continue; }
    if (line.startsWith('#!desc=')) { hasDesc = true; continue; }
    if (line.startsWith('#!') || line.startsWith('#') || line.startsWith('//')) continue;

    // Section header detection
    if (line.startsWith('[') && line.endsWith(']')) {
      const isValid = VALID_SECTIONS.some(s => s.toLowerCase() === line.toLowerCase());
      if (!isValid) {
        warn(relFile, lineNum, `Unknown section: ${line}`);
      }
      currentSection = isValid ? VALID_SECTIONS.find(s => s.toLowerCase() === line.toLowerCase()) : line;
      continue;
    }

    if (!currentSection) continue;

    // Section-specific validation
    switch (currentSection) {
      case '[MITM]': {
        if (line.toLowerCase().startsWith('hostname')) {
          const eqIdx = line.indexOf('=');
          if (eqIdx === -1) {
            error(relFile, lineNum, 'Malformed hostname declaration (missing =)');
            break;
          }
          let hostsStr = line.slice(eqIdx + 1).replace(/%(?:APPEND|INSERT)%/gi, '');
          const hosts = hostsStr.split(',').map(h => h.trim()).filter(Boolean);
          if (hosts.length === 0) {
            error(relFile, lineNum, 'Empty hostname list in MITM');
          }
          for (const h of hosts) {
            if (allHosts.has(h)) {
              const prev = allHosts.get(h);
              if (prev.file !== relFile) {
                warn(relFile, lineNum, `Duplicate hostname "${h}" (also in ${prev.file}:${prev.line})`);
              }
            } else {
              allHosts.set(h, { file: relFile, line: lineNum });
            }
          }
        }
        break;
      }

      case '[Rule]': {
        if (allRules.has(line)) {
          const prev = allRules.get(line);
          if (prev.file !== relFile) {
            warn(relFile, lineNum, `Duplicate rule (also in ${prev.file}:${prev.line})`);
          }
        } else {
          allRules.set(line, { file: relFile, line: lineNum });
        }
        break;
      }

      case '[URL Rewrite]': {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          if (!isValidRegex(parts[0])) {
            error(relFile, lineNum, `Invalid regex in URL Rewrite: ${parts[0]}`);
          }
        }
        break;
      }

      case '[Rewrite]':
      case '[Script]': {
        // Check script-path
        const spMatch = line.match(/script-path=([^,\s]+)/);
        if (spMatch) {
          const sp = spMatch[1];
          if (sp.startsWith('http://') || sp.startsWith('https://')) {
            warn(relFile, lineNum, `External script dependency: ${sp}`);
          } else {
            checkJsSyntax(sp, relFile, lineNum);
          }
        }

        // Check regex pattern
        const patMatch = line.match(/pattern=([^,\s]+)/);
        if (patMatch) {
          if (!isValidRegex(patMatch[1])) {
            error(relFile, lineNum, `Invalid regex in pattern: ${patMatch[1]}`);
          }
        }

        // Track script names for duplicate detection (Script section only)
        if (currentSection === '[Script]') {
          const eqIdx = line.indexOf('=');
          if (eqIdx > 0) {
            const scriptName = line.slice(0, eqIdx).trim();
            if (scriptName && !scriptName.startsWith('type')) {
              if (allScripts.has(scriptName)) {
                const prev = allScripts.get(scriptName);
                if (prev.file !== relFile) {
                  warn(relFile, lineNum, `Duplicate script name "${scriptName}" (also in ${prev.file}:${prev.line})`);
                }
              } else {
                allScripts.set(scriptName, { file: relFile, line: lineNum });
              }
            }
          }
        }
        break;
      }
    }
  }

  // Check required metadata
  if (!hasName) error(relFile, 1, 'Missing required metadata: #!name');
  if (!hasDesc) error(relFile, 1, 'Missing required metadata: #!desc');
}

// Main
function main() {
  console.log('modules-shadowrocket validator\n');

  let allFiles = [];
  for (const dir of MODULES_DIRS) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.module'))
        .sort()
        .map(f => path.join(dir, f));
      allFiles.push(...files);
    }
  }

  if (allFiles.length === 0) {
    console.error('No .module files found to validate.');
    process.exit(1);
  }

  console.log(`Found ${allFiles.length} module file(s):\n`);
  for (const file of allFiles) {
    validateModule(file);
  }

  console.log(`\n--- Summary ---`);
  console.log(`Errors:   ${errorCount}`);
  console.log(`Warnings: ${warningCount}`);

  if (errorCount > 0) {
    console.error('\nValidation FAILED.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.warn('\nValidation PASSED with warnings.');
    process.exit(0);
  } else {
    console.log('\nValidation PASSED.');
    process.exit(0);
  }
}

main();
