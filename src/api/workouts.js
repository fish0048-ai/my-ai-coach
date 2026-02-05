/**
 * Workouts API 層
 * 任務 2-5：Firebase 實作集中於 workoutsImpl，此層負責統一介面與匯出
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
} from './workoutsImpl';

// 查詢
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

// 匯出
export const exportWorkoutsToCSV = async (gears = []) => {
  const workouts = await listCalendarWorkouts();
  const { generateCSVData } = await import('../services/import/csvParser');
  let csvContent = generateCSVData(workouts, gears);
  const lines = csvContent.split('\n');
  if (lines.length > 0) {
    const headers = lines[0].split(',');
    if (!headers.includes('"裝備"') && !headers.includes('裝備')) {
      lines[0] = lines[0].replace(/"總次數"/, '"總次數","裝備","備註"');
    }
    for (let i = 1; i < lines.length; i++) {
      const workout = workouts[i - 1];
      if (workout) {
        const gearName = gears.find((g) => g.id === workout.gearId)?.model || '';
        const notes = workout.notes || '';
        lines[i] = lines[i].replace(/\r?\n?$/, '') + `,"${String(gearName).replace(/"/g, '""')}","${String(notes).replace(/"/g, '""')}"`;
      }
    }
  }
  return lines.join('\n');
};
