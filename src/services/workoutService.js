/**
 * Workout / Calendar Domain Service
 * 將與訓練紀錄相關的「跨畫面統計與聚合邏輯」集中在此處，
 * 由這裡負責呼叫 calendarService 的 CRUD / 訂閱，再輸出給 Dashboard 等頁面使用。
 */

import {
  listCalendarWorkouts,
  listCalendarWorkoutsByDateRange,
} from './calendarService';
import { processWorkoutStats, calculateMuscleFatigue } from '../utils/statsCalculations';

/**
 * 安全的日期解析函數（給 Dashboard 聚合使用）
 * @param {string} dateStr
 * @returns {number} timestamp (ms)
 */
const safeTimestamp = (dateStr) => {
  if (!dateStr) return 0;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  } catch {
    return 0;
  }
};

/**
 * 取得 TrainingDashboard 使用的統計結果
 * 封裝原本 TrainingDashboardView 的「抓取 calendar + 呼叫 processWorkoutStats」邏輯
 * @param {'week'|'month'|'year'} period
 * @returns {Promise<{
 *   totalWorkouts:number,
 *   totalDuration:number,
 *   totalDistance:string,
 *   strengthCount:number,
 *   runCount:number,
 *   chartData:Array
 * }>}
 */
export const getWorkoutStatsForPeriod = async (period) => {
  const workouts = await listCalendarWorkouts();
  const rawDocs = workouts.map((w) => {
    // 去掉 id，保持與原本工具函數相容
    const { id, ...rest } = w;
    return rest;
  });
  return processWorkoutStats(rawDocs, period);
};

/**
 * 取得 Dashboard 所需的聚合統計資料
 * 將原本 DashboardView.fetchWorkoutStats 的計算搬到這裡，
 * 讓頁面只負責呼叫與呈現。
 *
 * @param {Object} params
 * @param {Object|null} params.userData - 使用者個人資料（用於 completedGoals 與心率計算）
 * @returns {Promise<{
 *   totalWorkouts:number,
 *   caloriesBurned:number,
 *   totalHours:number,
 *   completedGoals:number,
 *   muscleFatigue:Object,
 *   latestAnalysis:Object|null,
 *   weeklyDistance:string,
 *   weeklyRuns:number,
 *   longestRun:string,
 *   zone2Percent:number
 * }>}
 */
export const getDashboardStats = async ({ userData }) => {
  // 1. 計算日期範圍 (過去 30 天)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  // 2. 使用 calendarService 取得資料
  const workouts = await listCalendarWorkoutsByDateRange(startDateStr);

  let totalSets = 0;
  let muscleScore = {};
  let totalWorkouts = 0;
  let totalRunDist = 0;
  let analysisReports = [];

  let weeklyDistance = 0;
  let weeklyRuns = 0;
  let longestRun = 0;
  let zone2Minutes = 0;
  let totalRunMinutes = 0;

  // 心率相關計算
  const age = parseInt(userData?.age) || 30;
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const zone2LowerLimit = maxHR * 0.6;
  const zone2UpperLimit = maxHR * 0.7;

  // 計算本週起始日
  const now = new Date();
  const day = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  workouts.forEach((workout) => {
    const data = workout;
    if (!data) return;

    // 統計邏輯只看已完成
    if (data.status === 'completed') {
      if (data.type !== 'analysis') {
        totalWorkouts++;
      }

      if (Array.isArray(data.exercises)) {
        data.exercises.forEach((ex) => {
          if (!ex) return;
          if (ex.targetMuscle && ex.sets) {
            const sets = parseInt(ex.sets) || 1;
            muscleScore[ex.targetMuscle] =
              (muscleScore[ex.targetMuscle] || 0) + sets;
            totalSets += sets;
          }
          if (data.type === 'analysis') {
            analysisReports.push({
              title: data.title,
              feedback: data.feedback,
              createdAt: data.createdAt || data.date,
            });
          }
        });
      }

      // analysis 也可能直接是 type
      if (data.type === 'analysis') {
        analysisReports.push({
          title: data.title,
          feedback: data.feedback,
          createdAt: data.createdAt || data.date,
        });
      }

      if (data.type === 'run' && data.runDistance) {
        const dist = parseFloat(data.runDistance) || 0;
        const duration = parseFloat(data.runDuration) || 0;
        const hr = parseFloat(data.runHeartRate) || 0;

        totalRunDist += dist;

        if (data.date >= weekStartStr) {
          weeklyDistance += dist;
          weeklyRuns++;
          if (dist > longestRun) longestRun = dist;

          totalRunMinutes += duration;
          if (hr >= zone2LowerLimit && hr <= zone2UpperLimit) {
            zone2Minutes += duration;
          }
        }
      }
    }
  });

  const rawLatestAnalysis =
    analysisReports.sort(
      (a, b) => safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt),
    )[0] || null;

  const safeLatestAnalysis = rawLatestAnalysis
    ? {
        title: String(rawLatestAnalysis.title || 'AI 分析報告'),
        feedback:
          typeof rawLatestAnalysis.feedback === 'object'
            ? JSON.stringify(rawLatestAnalysis.feedback)
            : String(rawLatestAnalysis.feedback || '無詳細建議'),
      }
    : null;

  const normalizedFatigue = calculateMuscleFatigue(muscleScore);

  return {
    totalWorkouts,
    caloriesBurned: Math.round(totalWorkouts * 250),
    totalHours: Math.round(totalWorkouts * 0.8 * 10) / 10,
    completedGoals: userData?.completedGoals || 0,
    muscleFatigue: normalizedFatigue,
    latestAnalysis: safeLatestAnalysis,
    weeklyDistance: weeklyDistance.toFixed(1),
    weeklyRuns,
    longestRun: longestRun.toFixed(1),
    zone2Percent:
      totalRunMinutes > 0
        ? Math.round((zone2Minutes / totalRunMinutes) * 100)
        : 0,
  };
};

