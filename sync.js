import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
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

// Path blacklist: these directories/files are NEVER synced
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
  'templates',
  'node_modules',
]);

const EXCLUDED_PATTERNS = [
  /^session-.*\.md$/i,           // session-*.md
  /\.original$/i,                // *.original
  /^entities\.json$/i,           // entities.json
  /^mempalace\.yaml$/i,          // mempalace.yaml
  /^\.env/i,                     // .env*
  /^package.*\.json$/i,          // package.json / package-lock.json
];

function shouldExclude(filePath) {
  const relativePath = path.relative(SOURCE_DIR, filePath);
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/');

  // Check if any parent directory is in the excluded list
  let current = '';
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (EXCLUDED_DIRS.has(current)) {
      return true;
    }
  }

  // Fine-grained control for 04-moments: only allow 04-moments/taste
  if (normalized.startsWith('04-moments/')) {
    if (!normalized.startsWith('04-moments/taste')) {
      return true;
    }
  }
  if (normalized === '04-moments') {
    return true;
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
    const parsed = matter(content);
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
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = fs.readFileSync(srcPath, 'utf-8');
      if (hasPublishFalse(content)) {
        console.log(`[SKIP] ${relativePath} (publish: false)`);
        skippedCount++;
        continue;
      }

      const destPath = path.join(destDir, entry.name);
      ensureDir(destDir);
      fs.copyFileSync(srcPath, destPath);
      console.log(`[SYNC] ${relativePath}`);
      syncedCount++;
    } else {
      // Non-markdown files: skip by default
      console.log(`[SKIP] ${relativePath} (non-markdown)`);
      skippedCount++;
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

  // Rename README.md to index.md so it becomes the Quartz home page
  const readmePath = path.join(CONTENT_DIR, 'README.md');
  const indexPath = path.join(CONTENT_DIR, 'index.md');
  if (fs.existsSync(readmePath)) {
    fs.renameSync(readmePath, indexPath);
    console.log('[INFO] Renamed README.md -> index.md');
  }

  console.log('');
  console.log(`Done. Synced: ${synced}, Skipped: ${skipped}`);
}

main();
