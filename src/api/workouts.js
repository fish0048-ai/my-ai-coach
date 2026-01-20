/**
 * Workouts API 層骨架
 * 目前直接轉呼叫既有的 calendarService，未來可逐步遷移 Firebase 邏輯至此。
 */

import {
  listCalendarWorkouts,
  listCalendarWorkoutsByDateRange,
  listTodayWorkouts,
  listCompletedWorkouts,
  listRunLogs,
  updateCalendarWorkout,
  setCalendarWorkout,
  createCalendarWorkout,
  deleteCalendarWorkout,
  subscribeCompletedWorkouts,
  generateCalendarCSVData,
} from '../services/calendarService';

// 查詢相關
export const fetchAllWorkouts = () => listCalendarWorkouts();

export const fetchWorkoutsByDateRange = (startDate, endDate = null) =>
  listCalendarWorkoutsByDateRange(startDate, endDate);

export const fetchTodayWorkouts = () => listTodayWorkouts();

export const fetchCompletedWorkouts = () => listCompletedWorkouts();

export const fetchRunLogs = () => listRunLogs();

// 訂閱
export const subscribeCompletedWorkoutsStream = (callback) =>
  subscribeCompletedWorkouts(callback);

// CRUD
export const createWorkout = (data) => createCalendarWorkout(data);

export const updateWorkout = (workoutId, updates) =>
  updateCalendarWorkout(workoutId, updates);

export const upsertWorkout = (workoutId, data) =>
  setCalendarWorkout(workoutId, data);

export const deleteWorkout = (workoutId) => deleteCalendarWorkout(workoutId);

// 匯出工具
export const exportWorkoutsToCSV = (gears = []) =>
  generateCalendarCSVData(gears);

