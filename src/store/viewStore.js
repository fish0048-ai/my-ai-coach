/**
 * 視圖狀態管理 Store
 * 使用 zustand 統一管理視圖切換相關的全局狀態
 * RPG Phase 1：擴充 currentLocation 供基地地圖與建築切換使用。
 */

// #region agent log
fetch('http://127.0.0.1:7242/ingest/72344403-1b12-4983-948d-82f1cc7f3c6d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'viewStore.js', message: 'viewStore module load (uses zustand)', data: {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {});
// #endregion
import { create } from 'zustand';

/**
 * 視圖 Store
 * @typedef {Object} ViewStore
 * @property {string} currentView - 當前視圖名稱
 * @property {string} currentLocation - 'MAP' | 建築/視圖 ID（RPG 地圖導航用）
 * @property {boolean} isChatOpen - 聊天視窗是否開啟
 * @property {Function} setCurrentView - 設置當前視圖
 * @property {Function} setIsChatOpen - 設置聊天視窗狀態
 */

/**
 * 創建視圖狀態 Store
 */
export const useViewStore = create((set) => ({
  currentView: 'map',
  currentLocation: 'MAP',
  isChatOpen: false,

  setCurrentView: (view) =>
    set({
      currentView: view,
      currentLocation: view === 'map' ? 'MAP' : view,
    }),
  setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
}));
