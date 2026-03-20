/**
 * 行事曆服務層
 * 任務 2-5：改用 API 層實作；寫入操作採樂觀 UI + 背景同步 Firestore
 */

import * as workoutsApi from '../api/workoutsImpl';
import { useWorkoutStore } from '../store/workoutStore';
import { handleError } from './core/errorService';
import { calculateTrainingLoad } from '../utils/workoutCalculations';

import {
  listGears,
  subscribeGears,
  createGear,
  updateGear,
  deleteGear,
} from '../api/gearsImpl';

import { getUserProfile } from '../api/userImpl';

/** 深拷貝單筆行事曆資料（供 rollback） */
function cloneWorkout(w) {
  try {
    return structuredClone(w);
  } catch {
    return JSON.parse(JSON.stringify(w));
  }
}

function findWorkoutSnapshot(workoutId) {
  const workouts = useWorkoutStore.getState().workouts;
  for (const date of Object.keys(workouts)) {
    const w = workouts[date].find((x) => x.id === workoutId);
    if (w) return cloneWorkout(w);
  }
  return null;
}

/**
 * 是否為「應保留樂觀狀態」的失敗（斷網／暫時不可用，寫入可能已排隊）
 */
function isOfflineOrTransientWriteFailure(err) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const code = err?.code;
  if (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'cancelled' ||
    code === 'resource-exhausted'
  ) {
    return true;
  }
  const msg = String(err?.message || '').toLowerCase();
  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('offline') ||
    msg.includes('internet connection')
  ) {
    return true;
  }
  return false;
}

// --- Workouts：查詢／訂閱仍直接轉發 API 層 ---
export {
  listCalendarWorkouts,
  listCalendarWorkoutsByDateRange,
  listTodayWorkouts,
  listCompletedWorkouts,
  subscribeCompletedWorkouts,
  subscribeCalendarWorkouts,
  listRunLogs,
} from '../api/workoutsImpl';

/**
 * 樂觀更新後背景寫入 Firestore；權限等錯誤則 rollback 並提示
 */
export const updateCalendarWorkout = async (workoutId, updates) => {
  const prev = findWorkoutSnapshot(workoutId);
  if (prev) {
    useWorkoutStore.getState().updateWorkout(workoutId, updates);
  }
  try {
    await workoutsApi.updateCalendarWorkout(workoutId, updates);
  } catch (err) {
    const transient = isOfflineOrTransientWriteFailure(err);
    if (prev && !transient) {
      useWorkoutStore.getState().updateWorkout(workoutId, prev);
    }
    handleError(err, {
      context: 'CalendarService',
      operation: 'updateCalendarWorkout',
      showToast: !transient,
    });
    if (!transient) throw err;
  }
};

export const setCalendarWorkout = async (workoutId, data) => {
  const prev = findWorkoutSnapshot(workoutId);
  const mergedForStore = prev ? { ...prev, ...data } : { ...data };
  if (prev) {
    useWorkoutStore.getState().updateWorkout(workoutId, mergedForStore);
  }
  try {
    await workoutsApi.setCalendarWorkout(workoutId, data);
  } catch (err) {
    const transient = isOfflineOrTransientWriteFailure(err);
    if (prev && !transient) {
      useWorkoutStore.getState().updateWorkout(workoutId, prev);
    }
    handleError(err, {
      context: 'CalendarService',
      operation: 'setCalendarWorkout',
      showToast: !transient,
    });
    if (!transient) throw err;
  }
};

export const createCalendarWorkout = async (data) => {
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const optimistic = { ...data, id: tempId };
  const rpe = optimistic.rpe || optimistic.runRPE;
  const duration = optimistic.runDuration || optimistic.duration;
  if (rpe && duration) {
    optimistic.trainingLoad = calculateTrainingLoad(rpe, duration);
  }
  useWorkoutStore.getState().addWorkout(optimistic);
  try {
    const docRef = await workoutsApi.createCalendarWorkout(data);
    useWorkoutStore.getState().replaceWorkoutId(tempId, docRef.id);
    return docRef;
  } catch (err) {
    const transient = isOfflineOrTransientWriteFailure(err);
    if (!transient) {
      useWorkoutStore.getState().removeWorkout(tempId);
    }
    handleError(err, {
      context: 'CalendarService',
      operation: 'createCalendarWorkout',
      showToast: !transient,
    });
    if (!transient) throw err;
    return null;
  }
};

export const deleteCalendarWorkout = async (workoutId) => {
  const prev = findWorkoutSnapshot(workoutId);
  if (prev) {
    useWorkoutStore.getState().removeWorkout(workoutId);
  }
  try {
    await workoutsApi.deleteCalendarWorkout(workoutId);
  } catch (err) {
    const transient = isOfflineOrTransientWriteFailure(err);
    if (prev && !transient) {
      useWorkoutStore.getState().addWorkout(prev);
    }
    handleError(err, {
      context: 'CalendarService',
      operation: 'deleteCalendarWorkout',
      showToast: !transient,
    });
    if (!transient) throw err;
  }
};

// Gears：轉發至 API 層
export { listGears, subscribeGears, createGear, updateGear, deleteGear };

// User
export { getUserProfile };

/** 避免與 workouts.js 靜態循環依賴：改為動態載入匯出邏輯 */
export const generateCalendarCSVData = async (gears) => {
  const { exportWorkoutsToCSV: exportFn } = await import('../api/workouts');
  return exportFn(gears);
};
