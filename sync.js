import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source: KB-GH repository content
// Local dev: D:\KB-GH or /d/KB-GH
// GitHub Actions: ./kb-gh-source
const SOURCE_DIR = process.env.KB_GH_SOURCE
  ? path.resolve(process.env.KB_GH_SOURCE)
  : path.resolve(__dirname, 'kb-gh-source');
const CONTENT_DIR = path.resolve(__dirname, 'content');

// Allowed directories for sync (digital garden content)
// Note: must match directory names in the source KB-GH repo exactly
const ALLOWED_SUBDIRS = new Set([
  '01-claude',
  '02-inspiration',
  '03-reading',
  '04-moments',
  '06-learning',
  '07-projects',
  '08-health',
  'templates',
]);

// Subdirectories to exclude within allowed parent dirs
const EXCLUDED_SUBDIRS = new Set([
  'memory',     // 01-claude/memory - 私人记忆
  'config',     // 01-claude/config - 配置
  'skills',     // 01-claude/skills - 技能定义
  'insights',   // 01-claude/insights - 成本分析等内部报告
  'people',     // 04-moments/people - 人脸照片（隐私）
  'screenshot', // 04-moments/screenshot - 聊天记录截图（隐私）
]);

// Path blacklist: these directories/files are NEVER synced (unless explicitly allowed)
const EXCLUDED_DIRS = new Set([
  '.git',
  '.claude',
  '.github',
  '.vercel',
  '00-inbox',
  '01-claude/memory',
  '01-claude/config',
  '99-archive',
  'D:-',
  'node_modules',
]);

const EXCLUDED_PATTERNS = [
  /^session-.*\.md$/i,           // session-*.md
  /\.original$/i,                // *.original
  /^entities\.json$/i,           // entities.json
  /^mempalace\.yaml$/i,          // mempalace.yaml
  /^\.env/i,                     // .env*
  /^package.*\.json$/i,         // package.json / package-lock.json
  /^CLAUDE\.md$/i,               // CLAUDE.md - 项目内部AI指导文件
  /^photo_20260408_1775634218545\.jpg$/i, // specific private photo
  /^代码速查表_20260318_1773801293105\.jpg$/i, // private document photo 1
  /^代码速查表_20260318_1773801172619\.jpg$/i,  // private document photo 2
];

function parseValue(value) {
  if (!value) return '';
  // Unwrap quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  // Parse booleans
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Parse null
  if (value === 'null' || value === '~') return null;
  // Parse numbers
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  return value;
}

// Manual YAML frontmatter parsing (no external dependency)
// Supports: key: value, key: [a, b], and YAML list format (- item)
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { data: {} };
  }
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return { data: {} };
  }
  const fmText = content.slice(3, endIndex).trim();
  const data = {};
  const lines = fmText.split('\n');
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line resets list context
    if (!trimmed) {
      currentKey = null;
      continue;
    }

    // List item within a key (starts with '- ')
    if (trimmed.startsWith('- ') && currentKey) {
      const item = trimmed.slice(2).trim();
      if (!Array.isArray(data[currentKey])) {
        data[currentKey] = [];
      }
      data[currentKey].push(parseValue(item));
      continue;
    }

    // Key: value line
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      if (value) {
        // Inline bracket list: [a, b, c]
        if (value.startsWith('[') && value.endsWith(']')) {
          data[key] = value.slice(1, -1).split(',').map(s => parseValue(s.trim()));
        } else {
          data[key] = parseValue(value);
        }
        currentKey = null;
      } else {
        // Empty value means list items may follow
        currentKey = key;
      }
    }
  }

  return { data };
}

function shouldExclude(filePath) {
  const relativePath = path.relative(SOURCE_DIR, filePath);
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/');

  // If first part is in ALLOWED_SUBDIRS, allow it (handles top-level like 01-claude)
  const firstDir = parts[0];
  if (ALLOWED_SUBDIRS.has(firstDir)) {
    // Continue to check exclusions and patterns below
  } else {
    // Check for nested allowed paths (e.g., 01-claude/insights)
    const combined = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : '';
    if (!ALLOWED_SUBDIRS.has(combined)) {
      return true;
    }
  }

  // For 04-moments, check second-level directory exclusion
  if (firstDir === '04-moments' && parts.length >= 2) {
    const secondDir = parts[1];
    if (EXCLUDED_SUBDIRS.has(secondDir)) {
      return true;
    }
  }

  // For 01-claude, also check second-level exclusions
  if (firstDir === '01-claude' && parts.length >= 2) {
    const secondDir = parts[1];
    if (EXCLUDED_SUBDIRS.has(secondDir)) {
      return true;
    }
  }

  // Check filename against excluded patterns
  const fileName = path.basename(filePath);
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(fileName)) {
      return true;
    }
  }

  return false;
}

// Top-level content directories — used to detect content-root-relative wikilinks
const TOP_LEVEL_DIRS = [
  '01-claude', '02-inspiration', '03-reading', '04-moments',
  '05-reading', '05-reports', '06-learning', '07-projects',
  '08-health', 'templates',
];

// Fix wikilinks to use proper relative paths for Quartz's markdownLinkResolution: "relative"
// Quartz prepends "./" to all wikilinks that don't start with ".", which causes the browser
// to resolve paths relative to the current page — creating double-path 404s for cross-directory links.
function fixWikilinks(content, relativePath) {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const dirParts = parts.slice(0, -1);
  const depth = dirParts.length;
  const prefix = '../'.repeat(depth);

  return content.replace(/\[\[([^\]]+)\]\]/g, (match, target) => {
    const pipeIdx = target.indexOf('|');
    const linkTarget = pipeIdx === -1 ? target : target.slice(0, pipeIdx);
    const alias = pipeIdx === -1 ? '' : target.slice(pipeIdx + 1);

    if (linkTarget.startsWith('.')) return match;
    if (!linkTarget.includes('/')) return match;

    const firstPart = linkTarget.split('/')[0];
    if (TOP_LEVEL_DIRS.includes(firstPart)) {
      const newTarget = prefix + linkTarget;
      return alias ? `[[${newTarget}|${alias}]]` : `[[${newTarget}]]`;
    }

    return match;
  });
}

function hasPublishFalse(content) {
  try {
    const parsed = parseFrontmatter(content);
    return parsed.data && parsed.data.publish === false;
  } catch (e) {
    console.error('Frontmatter parse error:', e.message);
    return false;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureContentDir() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function syncDirectory(srcDir, destDir) {
  let syncedCount = 0;
  let skippedCount = 0;

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const relativePath = path.relative(SOURCE_DIR, srcPath);

    if (shouldExclude(srcPath)) {
      console.log(`[SKIP] ${relativePath} (excluded path/pattern)`);
      skippedCount++;
      continue;
    }

    if (entry.isDirectory()) {
      const { synced, skipped } = syncDirectory(srcPath, path.join(destDir, entry.name));
      syncedCount += synced;
      skippedCount += skipped;
    } else if (entry.isFile()) {
      // Allow both .md files and image files
      const isMarkdown = entry.name.endsWith('.md');
      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(entry.name);

      if (!isMarkdown && !isImage) {
        console.log(`[SKIP] ${relativePath} (non-markdown non-image)`);
        skippedCount++;
        continue;
      }

      if (isMarkdown) {
        let content = fs.readFileSync(srcPath, 'utf-8');
        if (hasPublishFalse(content)) {
          console.log(`[SKIP] ${relativePath} (publish: false)`);
          skippedCount++;
          continue;
        }

        // Fix image paths referencing 04-moments: use garden site URL
        // GitHub Pages project sites deploy to a subpath (/kb-garden/).
        // SPA mode + pretty URLs mean relative paths resolve against 404.html, not the content page.
        content = content.replace(
          /(!?\[([^\]]*)\])\((?:\.)?\/??04-moments\/([^)]+)\)/g,
          (match, prefix, alt, imgPath) => {
            return `${prefix}(https://myversion-1.github.io/kb-garden/04-moments/${imgPath})`;
          }
        );

        const destPath = path.join(destDir, entry.name);
        ensureDir(destDir);

        // Fix wikilinks to use proper relative paths (based on destination path within content/)
        const relPath = path.relative(CONTENT_DIR, destPath);
        content = fixWikilinks(content, relPath);

        fs.writeFileSync(destPath, content, 'utf-8');
      } else {
        const destPath = path.join(destDir, entry.name);
        ensureDir(destDir);
        fs.copyFileSync(srcPath, destPath);
      }
      console.log(`[SYNC] ${relativePath}`);
      syncedCount++;
    }
  }

  return { synced: syncedCount, skipped: skippedCount };
}

function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log(`Syncing from: ${SOURCE_DIR}`);
  console.log(`Syncing to:   ${CONTENT_DIR}`);
  console.log('');

  ensureContentDir();

  const { synced, skipped } = syncDirectory(SOURCE_DIR, CONTENT_DIR);

  // Set up home page: prefer source index.md, fallback to README.md
  const sourceIndexPath = path.join(SOURCE_DIR, 'index.md');
  const sourceReadmePath = path.join(SOURCE_DIR, 'README.md');
  const indexPath = path.join(CONTENT_DIR, 'index.md');
  if (fs.existsSync(sourceIndexPath)) {
    let content = fs.readFileSync(sourceIndexPath, 'utf-8');
    const hasFrontmatter = content.startsWith('---');
    if (hasFrontmatter) {
      const endIdx = content.indexOf('---', 3);
      if (endIdx !== -1) {
        const frontmatter = content.slice(0, endIdx + 3);
        const body = content.slice(endIdx + 3);
        content = frontmatter + fixWikilinks(body, 'index.md');
      }
    } else {
      content = fixWikilinks(content, 'index.md');
    }
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('[INFO] Copied index.md -> index.md');
  } else if (fs.existsSync(sourceReadmePath)) {
    let content = fs.readFileSync(sourceReadmePath, 'utf-8');
    content = fixWikilinks(content, 'index.md');
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('[INFO] Copied README.md -> index.md');
  }

  console.log('');
  console.log(`Done. Synced: ${synced}, Skipped: ${skipped}`);
}

main();
