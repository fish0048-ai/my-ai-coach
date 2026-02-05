/**
 * Athletica 基地地圖設定（RPG 遊戲化 Phase 1）
 * 供 WorldMap.jsx 使用：建築 ID、遊戲化名稱、對應 view 或開面板。
 */

/** 建築列表：grid 為 [row, col] 或 [x%, y%]，label 為遊戲化名稱 */
export const MAP_BUILDINGS = [
  { id: 'dashboard', view: 'dashboard', label: '司令部', sublabel: 'My Room', grid: [0, 0], color: '#818cf8' },
  { id: 'calendar', view: 'calendar', label: '競技場', sublabel: 'Training Camp', grid: [0, 1], color: '#93c5fd' },
  { id: 'nutrition', view: 'nutrition', label: '補給站', sublabel: 'Canteen', grid: [0, 2], color: '#fde68a' },
  { id: 'ai_coach', openChat: true, label: '賢者之塔', sublabel: "Oracle's Tower", grid: [1, 0], color: '#7dd3fc' },
  { id: 'trend', view: 'trend', label: '科技實驗室', sublabel: 'Tech Lab', grid: [1, 1], color: '#f9a8d4' },
  { id: 'gear', view: 'gear', label: '裝備庫', sublabel: 'Armory', grid: [1, 2], color: '#fdba74' },
];

/** 地圖標題 */
export const MAP_TITLE = 'Athletica';
export const MAP_SUBTITLE = '訓練基地 · 點擊建築進入';
