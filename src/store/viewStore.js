/**
 * 視圖狀態管理 Store
 * 使用 zustand 統一管理視圖切換相關的全局狀態
 * currentLocation 與 currentView 同步（預留未來地圖／世界模式擴充）。
 */

import { create } from 'zustand';

/**
 * 視圖 Store
 * @typedef {Object} ViewStore
 * @property {string} currentView - 當前視圖名稱
 * @property {string} currentLocation - 與 currentView 相同（曾用於基地地圖）
 * @property {boolean} isChatOpen - 聊天視窗是否開啟
 * @property {Function} setCurrentView - 設置當前視圖
 * @property {Function} setIsChatOpen - 設置聊天視窗狀態
 */

/**
 * 創建視圖狀態 Store
 */
export const useViewStore = create((set) => ({
  currentView: 'dashboard',
  currentLocation: 'dashboard',
  isChatOpen: false,

  setCurrentView: (view) =>
    set({
      currentView: view,
      currentLocation: view,
    }),
  setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
}));
