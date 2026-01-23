/**
 * 訓練資料狀態管理 Store
 * 使用 zustand 統一管理訓練資料的全局狀態，實現響應式資料流
 */

import { create } from 'zustand';
import { subscribeCalendarWorkouts } from '../services/calendarService';

/**
 * 訓練資料 Store
 * @typedef {Object} WorkoutStore
 * @property {Object} workouts - 訓練資料，格式：{ 'YYYY-MM-DD': [workout1, workout2] }
 * @property {boolean} loading - 載入狀態
 * @property {Error|null} error - 錯誤狀態
 * @property {Function} setWorkouts - 設置訓練資料
 * @property {Function} setLoading - 設置載入狀態
 * @property {Function} setError - 設置錯誤狀態
 * @property {Function} initializeWorkouts - 初始化訓練資料訂閱
 * @property {Function} updateWorkout - 更新單筆訓練資料（本地狀態）
 * @property {Function} addWorkout - 新增單筆訓練資料（本地狀態）
 * @property {Function} removeWorkout - 移除單筆訓練資料（本地狀態）
 */

/**
 * 創建訓練資料狀態 Store
 */
export const useWorkoutStore = create((set, get) => ({
  // 狀態
  workouts: {}, // { 'YYYY-MM-DD': [workout1, workout2] }
  loading: true,
  error: null,
  unsubscribe: null, // 訂閱取消函數

  // Actions
  setWorkouts: (workouts) => set({ workouts }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  /**
   * 初始化訓練資料訂閱
   * 訂閱所有訓練資料的實時更新
   */
  initializeWorkouts: () => {
    const { unsubscribe: prevUnsubscribe } = get();
    
    // 取消之前的訂閱
    if (prevUnsubscribe) {
      prevUnsubscribe();
    }

    set({ loading: true, error: null });

    const unsubscribe = subscribeCalendarWorkouts(
      (data) => {
        // 將資料按日期分組
        const grouped = {};
        data.forEach((workout) => {
          if (workout.date) {
            if (!grouped[workout.date]) {
              grouped[workout.date] = [];
            }
            grouped[workout.date].push(workout);
          }
        });

        set({ workouts: grouped, loading: false, error: null });
      },
      (err) => {
        console.error('Workout subscription error:', err);
        set({ error: err, loading: false });
      }
    );

    set({ unsubscribe });
    return unsubscribe;
  },

  /**
   * 更新單筆訓練資料（本地狀態）
   * 用於優化 UI 響應，在資料庫更新前先更新本地狀態
   * @param {string} workoutId - 訓練 ID
   * @param {Object} updates - 更新資料
   */
  updateWorkout: (workoutId, updates) => {
    const { workouts } = get();
    const newWorkouts = { ...workouts };

    // 找到並更新對應的訓練
    Object.keys(newWorkouts).forEach((date) => {
      newWorkouts[date] = newWorkouts[date].map((workout) => {
        if (workout.id === workoutId) {
          return { ...workout, ...updates };
        }
        return workout;
      });
    });

    set({ workouts: newWorkouts });
  },

  /**
   * 新增單筆訓練資料（本地狀態）
   * @param {Object} workout - 訓練資料
   */
  addWorkout: (workout) => {
    const { workouts } = get();
    const newWorkouts = { ...workouts };

    if (workout.date) {
      if (!newWorkouts[workout.date]) {
        newWorkouts[workout.date] = [];
      }
      newWorkouts[workout.date].push(workout);
    }

    set({ workouts: newWorkouts });
  },

  /**
   * 移除單筆訓練資料（本地狀態）
   * @param {string} workoutId - 訓練 ID
   */
  removeWorkout: (workoutId) => {
    const { workouts } = get();
    const newWorkouts = { ...workouts };

    Object.keys(newWorkouts).forEach((date) => {
      newWorkouts[date] = newWorkouts[date].filter(
        (workout) => workout.id !== workoutId
      );
      // 如果該日期沒有訓練了，移除該日期
      if (newWorkouts[date].length === 0) {
        delete newWorkouts[date];
      }
    });

    set({ workouts: newWorkouts });
  },

  /**
   * 清理訂閱
   */
  cleanup: () => {
    const { unsubscribe } = get();
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribe: null });
    }
  },
}));
