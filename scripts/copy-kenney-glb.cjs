/**
 * 將 kenny 目錄下的 City Kit Industrial GLB 複製到 public/models/kenney
 * 執行：node scripts/copy-kenney-glb.cjs
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'kenny', 'kenney_city-kit-industrial_1.0', 'Models', 'GLB format');
const destDir = path.join(root, 'public', 'models', 'kenney');

if (!fs.existsSync(srcDir)) {
  console.error('來源目錄不存在:', srcDir);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.glb'));
files.forEach((f) => {
  fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
  console.log('已複製:', f);
});

const texDir = path.join(srcDir, 'Textures');
if (fs.existsSync(texDir)) {
  fs.readdirSync(texDir).forEach((f) => {
    const dest = path.join(destDir, f);
    fs.copyFileSync(path.join(texDir, f), dest);
    console.log('已複製貼圖:', f);
  });
}

console.log('完成，共', files.length, '個 GLB');
