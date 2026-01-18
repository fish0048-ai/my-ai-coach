/**
 * 用戶狀態管理 Store
 * 使用 zustand 統一管理用戶相關的全局狀態
 */

import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../services/userService';

/**
 * 用戶 Store
 * @typedef {Object} UserStore
 * @property {Object|null} user - Firebase 用戶對象
 * @property {Object|null} userData - 用戶個人資料
 * @property {boolean} loading - 載入狀態
 * @property {Function} setUser - 設置用戶
 * @property {Function} setUserData - 設置用戶資料
 * @property {Function} setLoading - 設置載入狀態
 * @property {Function} initializeAuth - 初始化認證監聽
 * @property {Function} updateUserData - 更新用戶資料（自動刷新）
 */

/**
 * 創建用戶狀態 Store
 */
export const useUserStore = create((set) => ({
  // 狀態
  user: null,
  userData: null,
  loading: true,

  // Actions
  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setLoading: (loading) => set({ loading }),

  /**
   * 初始化認證監聽
   * 監聽 Firebase 認證狀態變化並自動更新用戶資料
   */
  initializeAuth: () => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      set({ user: currentUser, loading: true });
      
      if (currentUser) {
        try {
          const profile = await getUserProfile();
          set({ userData: profile, loading: false });
        } catch (error) {
          console.error('Error fetching user data:', error);
          set({ userData: null, loading: false });
        }
      } else {
        set({ userData: null, loading: false });
      }
    });

    return unsubscribe;
  },

  /**
   * 更新用戶資料
   * 手動刷新用戶資料（例如在 Profile 頁面更新資料後）
   */
  updateUserData: async () => {
    const { user } = useUserStore.getState();
    if (!user) return;

    set({ loading: true });
    try {
      const profile = await getUserProfile();
      set({ userData: profile, loading: false });
    } catch (error) {
      console.error('Error updating user data:', error);
      set({ loading: false });
    }
  },
}));
