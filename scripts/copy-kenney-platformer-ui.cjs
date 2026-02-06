/**
 * 複製 Kenney New Platformer Pack 的 UI 相關圖檔到 public/kenney-ui
 * 供整體 UI 大更新使用（金幣、愛心、區塊等）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'kenny', 'kenney_new-platformer-pack-1.1', 'Sprites', 'Tiles', 'Double');
const destDir = path.join(root, 'public', 'kenney-ui');

if (!fs.existsSync(srcDir)) {
  console.error('來源目錄不存在:', srcDir);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

const uiSprites = [
  'coin_gold.png',
  'coin_silver.png',
  'heart.png',
  'block_yellow.png',
  'block_green.png',
  'block_blue.png',
  'grass.png',
];

uiSprites.forEach((f) => {
  const src = path.join(srcDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(destDir, f));
    console.log('已複製:', f);
  }
});

console.log('完成，共', uiSprites.filter((f) => fs.existsSync(path.join(srcDir, f))).length, '個檔案');
