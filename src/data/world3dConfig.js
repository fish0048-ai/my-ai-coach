/**
 * 3D 虛擬城市世界腳本（資料驅動）
 * 對應 .cursor/plans 專案狀態檢視中的 World DSL。
 * 供 World3DView 解析，生成 Three.js 場景。
 */

/** 建築物網格半徑（建築間距約 * 1.5） */
const GRID_UNIT = 12;

/** 建築物 3D 空間座標（XZ 平面，Y=0 為地面） */
const BUILDING_POSITIONS = {
  calendar: [0, 0, 0],
  dashboard: [GRID_UNIT * 1.5, 0, 0],
  nutrition: [GRID_UNIT * 1.5, 0, GRID_UNIT * 1.5],
  ai_coach: [0, 0, GRID_UNIT * 1.5],
  knowledge_base: [-GRID_UNIT * 1.5, 0, GRID_UNIT * 1.5],
  trend: [-GRID_UNIT * 1.5, 0, 0],
};

/** 建築物尺寸 [寬, 高, 深] 與顏色（hex） */
const BUILDING_SPEC = {
  calendar: { size: [6, 5, 6], color: 0x3b82f6 },
  dashboard: { size: [6, 6, 6], color: 0x8b5cf6 },
  nutrition: { size: [5, 5, 5], color: 0xf59e0b },
  ai_coach: { size: [6, 7, 6], color: 0x06b6d4 },
  knowledge_base: { size: [7, 6, 6], color: 0x10b981 },
  trend: { size: [5, 7, 5], color: 0xec4899 },
};

/** 進入建築時觸發的動作 → 對應 App 的 view 或 panel */
const ROOM_ACTIONS = {
  'calendar.lobby': { action: 'navigate', targetView: 'calendar' },
  'dashboard.overview': { action: 'navigate', targetView: 'dashboard' },
  'nutrition.today_logs': { action: 'navigate', targetView: 'nutrition' },
  'ai_coach.lobby': { action: 'openPanel', target: 'CoachChat' },
  'knowledge_base.shelf_overview': { action: 'navigate', targetView: 'knowledge-base' },
  'trend.trends': { action: 'navigate', targetView: 'trend' },
};

export const avatar = {
  id: 'player',
  startRoom: 'calendar.lobby',
  startPosition: [BUILDING_POSITIONS.calendar[0] + 4, 0, BUILDING_POSITIONS.calendar[2]],
  moveSpeed: 0.15,
  enterRadius: 5,
};

export const buildings = [
  { id: 'calendar', name: '行事曆館', ...BUILDING_SPEC.calendar, position: BUILDING_POSITIONS.calendar, lobby: 'calendar.lobby' },
  { id: 'dashboard', name: '訓練儀表板', ...BUILDING_SPEC.dashboard, position: BUILDING_POSITIONS.dashboard, lobby: 'dashboard.overview' },
  { id: 'nutrition', name: '營養研究所', ...BUILDING_SPEC.nutrition, position: BUILDING_POSITIONS.nutrition, lobby: 'nutrition.today_logs' },
  { id: 'ai_coach', name: 'AI 教練中心', ...BUILDING_SPEC.ai_coach, position: BUILDING_POSITIONS.ai_coach, lobby: 'ai_coach.lobby' },
  { id: 'knowledge_base', name: '個人知識庫圖書館', ...BUILDING_SPEC.knowledge_base, position: BUILDING_POSITIONS.knowledge_base, lobby: 'knowledge_base.shelf_overview' },
  { id: 'trend', name: '趨勢分析塔', ...BUILDING_SPEC.trend, position: BUILDING_POSITIONS.trend, lobby: 'trend.trends' },
];

export const links = [
  { id: 'l1', from: 'calendar', to: 'dashboard', sync: { type: 'workouts_history', triggers: ['workoutCompleted', 'importFinished'] } },
  { id: 'l2', from: 'calendar', to: 'trend', sync: { type: 'workouts_history', triggers: ['workoutCompleted', 'importFinished'] } },
  { id: 'l3', from: 'calendar', to: 'ai_coach', sync: { type: 'ai_context', triggers: ['workoutCompleted', 'contextUpdated'] } },
  { id: 'l4', from: 'nutrition', to: 'knowledge_base', sync: { type: 'nutrition_logs', triggers: ['foodLogCreated'] } },
  { id: 'l5', from: 'knowledge_base', to: 'ai_coach', sync: { type: 'rag_context', triggers: ['coachQuery'] } },
];

export const getRoomAction = (roomId) => ROOM_ACTIONS[roomId] || null;
export const getBuildingById = (id) => buildings.find((b) => b.id === id);
export const getLinkById = (id) => links.find((l) => l.id === id);
