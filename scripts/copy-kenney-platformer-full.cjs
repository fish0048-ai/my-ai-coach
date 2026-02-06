/**
 * 複製 Kenney New Platformer Pack 1.1 全素材到 public/kenney-platformer
 * 供平台場景示範與 UI 配置使用（背景、地塊、角色、敵人、HUD）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packRoot = path.join(root, 'kenny', 'kenney_new-platformer-pack-1.1');
const destRoot = path.join(root, 'public', 'kenney-platformer');

if (!fs.existsSync(packRoot)) {
  console.error('來源目錄不存在:', packRoot);
  process.exit(1);
}

const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let n = 0;
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) {
      n += copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
      n++;
    }
  }
  return n;
};

const pairs = [
  [path.join(packRoot, 'Sprites', 'Backgrounds', 'Default'), path.join(destRoot, 'backgrounds')],
  [path.join(packRoot, 'Sprites', 'Tiles', 'Default'), path.join(destRoot, 'tiles')],
  [path.join(packRoot, 'Sprites', 'Characters', 'Default'), path.join(destRoot, 'characters')],
  [path.join(packRoot, 'Sprites', 'Enemies', 'Default'), path.join(destRoot, 'enemies')],
];

let total = 0;
pairs.forEach(([src, dest]) => {
  const count = copyDir(src, dest);
  total += count;
  console.log(dest.replace(root, ''), ':', count, 'files');
});

// 同時保留 Vector 背景 SVG 到 kenney-platformer（與 kenney-bg 對齊路徑）
const vectorBg = path.join(packRoot, 'Vector', 'Backgrounds');
const destBgSvg = path.join(destRoot, 'backgrounds-svg');
if (fs.existsSync(vectorBg)) {
  const svgCount = copyDir(vectorBg, destBgSvg);
  total += svgCount;
  console.log(destBgSvg.replace(root, ''), ':', svgCount, 'SVG files');
}

console.log('完成，共', total, '個檔案');
console.log('路徑前綴: /kenney-platformer/backgrounds | /tiles | /characters | /enemies');
