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
  /** 瀏覽器連線狀態（offline 時樂觀變更仍保留，將於恢復連線後與 Firestore 同步） */
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  setCurrentView: (view) =>
    set({
      currentView: view,
      currentLocation: view,
    }),
  setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  setIsOnline: (isOnline) => set({ isOnline }),
}));

/** 註冊 window online/offline；請在 App 掛載時呼叫一次，回傳 cleanup */
export function initConnectivityListeners() {
  const sync = () => {
    useViewStore.getState().setIsOnline(
      typeof navigator !== 'undefined' ? navigator.onLine : true
    );
  };
  sync();
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  return () => {
    window.removeEventListener('online', sync);
    window.removeEventListener('offline', sync);
  };
}
