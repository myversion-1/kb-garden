import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Frontmatter Fixer Script
 * 
 * Scans markdown files and fixes common YAML frontmatter issues:
 * 1. Multiline string values without proper quoting
 * 2. Unclosed frontmatter blocks
 * 3. Mixed line endings causing parse issues
 * 
 * Usage:
 *   node scripts/fix-frontmatter.js <directory>
 * 
 * Example:
 *   node scripts/fix-frontmatter.js ../KB-GH/content
 *   node scripts/fix-frontmatter.js ./content
 */

const TARGET_DIR = process.argv[2] || path.resolve(__dirname, '../content');

// Track statistics
const stats = {
  scanned: 0,
  fixed: 0,
  skipped: 0,
  errors: 0,
};

/**
 * Extract frontmatter text from markdown content
 * Returns { frontmatter: string|null, body: string, hasFrontmatter: boolean, fixedContent: string|null }
 */
function extractFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content, hasFrontmatter: false, fixedContent: null };
  }

  // Find the closing --- (must be on its own line)
  const lines = content.split('\n');
  let endIndex = -1;
  let structureFixed = false;

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  // Check for inline closing --- (e.g., "description: text.---")
  if (endIndex === -1) {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const inlineClose = line.indexOf('---');
      if (inlineClose !== -1 && inlineClose > 0) {
        // Split the line at ---
        const beforeClose = line.slice(0, inlineClose);
        const afterClose = line.slice(inlineClose + 3);
        lines[i] = beforeClose;
        // Insert --- on next line and shift rest
        lines.splice(i + 1, 0, '---', afterClose);
        endIndex = i + 1;
        structureFixed = true;
        break;
      }
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: content, hasFrontmatter: false, fixedContent: null, unclosed: true };
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);

  return {
    frontmatter: frontmatterLines.join('\n'),
    body: bodyLines.join('\n'),
    hasFrontmatter: true,
    fixedContent: structureFixed ? lines.join('\n') : null,
    unclosed: false,
  };
}

/**
 * Check if YAML frontmatter is valid
 */
function isValidYaml(frontmatterText) {
  if (!frontmatterText.trim()) return true;
  try {
    yaml.load(frontmatterText, { schema: yaml.JSON_SCHEMA });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Fix common frontmatter issues
 * 
 * Strategy: Parse line by line to detect multiline values that should be quoted
 */
function fixFrontmatter(frontmatterText) {
  const lines = frontmatterText.split('\n');
  const fixedLines = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');

    // If no colon, this might be a continuation of previous value
    if (colonIndex === -1) {
      fixedLines.push(line);
      i++;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Check if next lines are continuations of this value (no new key)
    let j = i + 1;
    const valueLines = [value];

    while (j < lines.length) {
      const nextLine = lines[j];
      // If next line starts with a key (has colon and looks like a key), stop
      const nextColonIndex = nextLine.indexOf(':');
      if (nextColonIndex !== -1) {
        const potentialKey = nextLine.slice(0, nextColonIndex).trim();
        // Heuristic: if it looks like a YAML key (no spaces, reasonable length)
        if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(potentialKey) && potentialKey.length < 50) {
          break;
        }
      }
      // Empty line or continuation
      valueLines.push(nextLine);
      j++;
    }

    // If we consumed extra lines, this is a multiline value that needs fixing
    if (j > i + 1 && valueLines.some(v => v === '' || v.includes('\n'))) {
      // Reconstruct as a proper YAML multiline string
      const fullValue = valueLines.join('\n');

      // Use literal block scalar (|) for multiline text
      // This preserves newlines and is cleaner than quoted strings for long text
      if (fullValue.includes('\n') || valueLines.length > 1) {
        fixedLines.push(`${key}: |`);
        // Indent each line of the value
        for (const vline of valueLines) {
          fixedLines.push(`  ${vline}`);
        }
      } else {
        fixedLines.push(`${key}: "${fullValue.replace(/"/g, '\\"')}"`);
      }
      i = j;
    } else {
      // Single line value, keep as-is
      fixedLines.push(line);
      i++;
    }
  }

  return fixedLines.join('\n');
}

/**
 * Alternative fix: use quoted string for values that span blank lines
 */
function fixFrontmatterV2(frontmatterText) {
  const lines = frontmatterText.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');

    if (colonIndex === -1) {
      result.push(line);
      i++;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    // Look ahead for continuation lines
    let j = i + 1;
    const continuationLines = [];

    while (j < lines.length) {
      const nextLine = lines[j];
      const nextColon = nextLine.indexOf(':');

      // Check if this looks like a new key
      if (nextColon !== -1) {
        const potentialKey = nextLine.slice(0, nextColon).trim();
        if (/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(potentialKey) && potentialKey.length < 50) {
          break;
        }
      }

      continuationLines.push(nextLine);
      j++;
    }

    if (continuationLines.length > 0) {
      // This is a multiline value - wrap in double quotes with escaped newlines
      const allLines = [value, ...continuationLines];
      const quoted = allLines
        .map((l, idx) => idx === 0 ? l : '\\n' + l)
        .join('');
      result.push(`${key}: "${quoted.replace(/"/g, '\\"')}"`);
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

/**
 * Process a single markdown file
 */
function processFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  stats.scanned++;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`[ERROR] Cannot read ${relativePath}: ${e.message}`);
    stats.errors++;
    return;
  }

  const extracted = extractFrontmatter(content);

  // Handle inline --- structure fix first
  if (extracted.fixedContent) {
    console.log(`[FIX]   ${relativePath} - inline --- detected, fixing structure`);
    try {
      fs.writeFileSync(filePath, extracted.fixedContent, 'utf-8');
      console.log(`[OK]    ${relativePath} - structure fixed`);
      stats.fixed++;
    } catch (e) {
      console.error(`[ERROR] ${relativePath} - failed to write: ${e.message}`);
      stats.errors++;
    }
    // Re-read and re-process to check if YAML also needs fixing
    content = fs.readFileSync(filePath, 'utf-8');
    const reExtracted = extractFrontmatter(content);
    if (isValidYaml(reExtracted.frontmatter)) {
      return;
    }
    // Continue to YAML fix below
    extracted.frontmatter = reExtracted.frontmatter;
    extracted.body = reExtracted.body;
  }

  if (!extracted.hasFrontmatter) {
    if (extracted.unclosed) {
      console.log(`[WARN]  ${relativePath} - unclosed frontmatter, skipping`);
      stats.errors++;
    } else {
      stats.skipped++;
    }
    return;
  }

  // Check if frontmatter is valid
  if (isValidYaml(extracted.frontmatter)) {
    stats.skipped++;
    return;
  }

  // Try to fix
  console.log(`[FIX]   ${relativePath} - invalid frontmatter detected`);

  // Try V1 fix first (literal block scalar)
  let fixed = fixFrontmatter(extracted.frontmatter);

  // Verify the fix worked
  if (!isValidYaml(fixed)) {
    // Try V2 fix (quoted string)
    fixed = fixFrontmatterV2(extracted.frontmatter);

    if (!isValidYaml(fixed)) {
      console.error(`[ERROR] ${relativePath} - could not auto-fix frontmatter`);
      console.error(`        Original frontmatter:\n${extracted.frontmatter}`);
      stats.errors++;
      return;
    }
  }

  // Reconstruct the file
  const newContent = `---\n${fixed}\n---\n${extracted.body}`;

  // Write back
  try {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`[OK]    ${relativePath} - frontmatter fixed`);
    stats.fixed++;
  } catch (e) {
    console.error(`[ERROR] ${relativePath} - failed to write: ${e.message}`);
    stats.errors++;
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      processFile(fullPath);
    }
  }
}

/**
 * Main
 */
function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`Directory does not exist: ${TARGET_DIR}`);
    console.error(`\nUsage: node scripts/fix-frontmatter.js <directory>`);
    console.error(`Example: node scripts/fix-frontmatter.js ../KB-GH/content`);
    process.exit(1);
  }

  console.log(`Scanning: ${TARGET_DIR}\n`);

  const stat = fs.statSync(TARGET_DIR);
  if (stat.isFile() && TARGET_DIR.endsWith('.md')) {
    processFile(TARGET_DIR);
  } else {
    scanDirectory(TARGET_DIR);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Fixed:   ${stats.fixed}`);
  console.log(`Skipped (OK): ${stats.skipped}`);
  console.log(`Errors:  ${stats.errors}`);
}

main();
