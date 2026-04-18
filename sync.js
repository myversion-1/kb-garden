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
const ALLOWED_SUBDIRS = new Set([
  '01-claude',
  '02-inspiration',
  '03-reading',
  '04-moments',
  'templates',
]);

// Subdirectories to exclude within allowed parent dirs
const EXCLUDED_SUBDIRS = new Set([
  'memory',    // 01-claude/memory - 私人记忆
  'config',    // 01-claude/config - 配置
  'skills',    // 01-claude/skills - 技能定义
  'people',    // 04-moments/people - 人脸照片
  'screenshot', // 04-moments/screenshot - 聊天记录截图等敏感截图
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
];

// Manual YAML frontmatter parsing (no external dependency)
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { data: {} };
  }
  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) {
    return { data: {} };
  }
  const fmLines = content.slice(3, endIndex).trim().split('\n');
  const data = {};
  for (const line of fmLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    // Handle quoted values
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    data[key] = value;
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

function hasPublishFalse(content) {
  try {
    const parsed = parseFrontmatter(content);
    return parsed.data && parsed.data.publish === 'false';
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

function cleanContentDir() {
  if (fs.existsSync(CONTENT_DIR)) {
    // Remove all contents but keep the directory itself
    for (const entry of fs.readdirSync(CONTENT_DIR)) {
      const entryPath = path.join(CONTENT_DIR, entry);
      fs.rmSync(entryPath, { recursive: true, force: true });
    }
  } else {
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
        const content = fs.readFileSync(srcPath, 'utf-8');
        if (hasPublishFalse(content)) {
          console.log(`[SKIP] ${relativePath} (publish: false)`);
          skippedCount++;
          continue;
        }
      }

      const destPath = path.join(destDir, entry.name);
      ensureDir(destDir);
      fs.copyFileSync(srcPath, destPath);
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

  cleanContentDir();

  const { synced, skipped } = syncDirectory(SOURCE_DIR, CONTENT_DIR);

  // Copy README.md from source root as index.md (home page)
  const sourceReadmePath = path.join(SOURCE_DIR, 'README.md');
  const indexPath = path.join(CONTENT_DIR, 'index.md');
  if (fs.existsSync(sourceReadmePath)) {
    fs.copyFileSync(sourceReadmePath, indexPath);
    console.log('[INFO] Copied README.md -> index.md');
  }

  console.log('');
  console.log(`Done. Synced: ${synced}, Skipped: ${skipped}`);
}

main();
