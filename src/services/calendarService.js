/**
 * 行事曆服務層
 * 任務 2-5：改用 API 層實作，此層負責向後相容與整合
 */

import {
  listCalendarWorkouts,
  listCalendarWorkoutsByDateRange,
  listTodayWorkouts,
  listCompletedWorkouts,
  subscribeCompletedWorkouts,
  subscribeCalendarWorkouts,
  listRunLogs,
  updateCalendarWorkout,
  setCalendarWorkout,
  createCalendarWorkout,
  deleteCalendarWorkout,
} from '../api/workoutsImpl';

import {
  listGears,
  subscribeGears,
  createGear,
  updateGear,
  deleteGear,
} from '../api/gearsImpl';

import { getUserProfile } from '../api/userImpl';

import { exportWorkoutsToCSV } from '../api/workouts';

// Workouts：轉發至 API 層
export { listCalendarWorkouts, listCalendarWorkoutsByDateRange, listTodayWorkouts };
export { listCompletedWorkouts, subscribeCompletedWorkouts, subscribeCalendarWorkouts };
export { listRunLogs, updateCalendarWorkout, setCalendarWorkout };
export { createCalendarWorkout, deleteCalendarWorkout };

// Gears：轉發至 API 層
export { listGears, subscribeGears, createGear, updateGear, deleteGear };

// User
export { getUserProfile };

// CSV 匯出（API 層實作，此處轉發以保持相容）
export const generateCalendarCSVData = exportWorkoutsToCSV;
