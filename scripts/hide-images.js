import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use resolve to get the project root, not the scripts directory
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'content');

// Common excluded subdirs (must match sync.js EXCLUDED_SUBDIRS)
const EXCLUDED_DIRS = ['people', 'screenshot', 'hidden'];

function scanImages(dir, basePath = '') {
  const images = [];
  const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  if (!fs.existsSync(dir)) return images;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(entry.name)) {
        images.push(...scanImages(fullPath, relPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (exts.includes(ext)) {
        images.push({
          path: relPath.replace(/\\/g, '/'),
          name: entry.name,
        });
      }
    }
  }
  return images;
}

function generateHtml(images) {
  const categories = {};
  for (const img of images) {
    const parts = img.path.split('/');
    const cat = parts.length > 1 ? parts[0] : 'root';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(img);
  }

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>选择要隐藏的图片</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; padding-bottom: 120px; }
    h1 { color: #333; }
    .category { margin: 20px 0; }
    .category h2 { background: #f0f0f0; padding: 10px; border-radius: 4px; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .item { border: 2px solid #ddd; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.2s; }
    .item:hover { border-color: #999; }
    .item.selected { border-color: #e00; background: #fee; }
    .item img { width: 100%; aspect-ratio: 1; object-fit: cover; }
    .item .name { padding: 5px; font-size: 12px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item input { display: none; }
    .controls { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 20px; box-shadow: 0 -2px 10px rgba(0,0,0,0.1); border-radius: 8px; text-align: center; display: flex; gap: 10px; align-items: center; }
    .controls button { padding: 10px 20px; font-size: 14px; cursor: pointer; }
    .controls button.primary { background: #e00; color: white; border: none; border-radius: 4px; }
    .controls .count { font-weight: bold; color: #e00; }
    #commands { margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; white-space: pre-wrap; font-family: monospace; display: none; }
    #commands code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>📷 选择要隐藏的图片</h1>
  <p>勾选要隐藏的图片，然后点击"生成指令"按钮</p>
  <form id="form">`;

  for (const [cat, imgs] of Object.entries(categories)) {
    html += `<div class="category">
    <h2>${cat} (${imgs.length}张)</h2>
    <div class="gallery">`;
    for (const img of imgs) {
      const srcPath = img.path;  // 04-moments/category/xxx.jpg
      html += `<label class="item">
        <input type="checkbox" name="images" value="${img.path}">
        <img src="content/${srcPath}" alt="${img.name}">
        <div class="name">${img.name}</div>
      </label>`;
    }
    html += `</div></div>`;
  }

  html += `</form>
  <div class="controls">
    <span>已选择: <span class="count" id="selectedCount">0</span> 张</span>
    <button type="button" class="primary" onclick="generateCommands()">生成指令</button>
    <button type="button" onclick="selectAll()">全选</button>
    <button type="button" onclick="clearAll()">清除</button>
  </div>
  <div id="commands"></div>
  <script>
    const checkboxes = document.querySelectorAll('input[name="images"]');
    const countSpan = document.getElementById('selectedCount');
    const commandsDiv = document.getElementById('commands');

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('.item').classList.toggle('selected', cb.checked);
        updateCount();
      });
    });

    function updateCount() {
      countSpan.textContent = document.querySelectorAll('input[name="images"]:checked').length;
    }

    function selectAll() {
      checkboxes.forEach(cb => { cb.checked = true; cb.closest('.item').classList.add('selected'); });
      updateCount();
    }

    function clearAll() {
      checkboxes.forEach(cb => { cb.checked = false; cb.closest('.item').classList.remove('selected'); });
      updateCount();
    }

    function generateCommands() {
      const selected = document.querySelectorAll('input[name="images"]:checked');
      if (selected.length === 0) {
        alert('请至少选择一张图片');
        return;
      }

      const values = Array.from(selected).map(cb => cb.value);
      let cmd = '# 隐藏图片指令 (在 KB-GH 仓库根目录执行):\n\n';
      cmd += '# 1. 移动图片到 people 目录 (sync 时会被排除)\n';
      for (const v of values) {
        const src = '04-moments/' + v;
        const dst = '04-moments/people/';
        cmd += 'git mv "' + src + '" "' + dst + '"\n';
      }
      cmd += '\n# 2. 提交并推送\n';
      cmd += 'git add -A\n';
      cmd += 'git commit -m "hide: move screenshots to excluded folder"\n';
      cmd += 'git push\n';

      commandsDiv.innerHTML = '<pre>' + cmd + '</pre>';
      commandsDiv.style.display = 'block';
      commandsDiv.scrollIntoView({ behavior: 'smooth' });
    }
  </script>
</body>
</html>`;

  return html;
}

function main() {
  console.log('🔍 扫描 04-moments 图片...');
  const momentsDir = path.join(CONTENT_DIR, '04-moments');
  console.log('扫描目录:', momentsDir);
  console.log('目录存在:', fs.existsSync(momentsDir));
  const images = scanImages(momentsDir, '04-moments');
  console.log(`找到 ${images.length} 张图片`);

  if (images.length === 0) {
    console.log('没有找到图片');
    return;
  }

  const html = generateHtml(images);
  const outputPath = path.join(PROJECT_ROOT, 'hide-images.html');
  fs.writeFileSync(outputPath, html);
  console.log(`\n✅ 已生成: ${outputPath}`);
  console.log('用浏览器打开该文件，勾选要隐藏的图片，然后执行生成的指令');
}

main();