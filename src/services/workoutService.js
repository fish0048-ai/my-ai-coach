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
 * 計算單次訓練的訓練負荷（Training Load）
 * 使用混合方法：有心率數據用 TRIMP，無心率數據用簡化 sRPE
 * 
 * @param {Object} workout - 訓練資料
 * @param {Object} userData - 使用者資料（包含 maxHeartRate, age, gender）
 * @returns {number} 訓練負荷值
 */
const calculateTrainingLoadAdvanced = (workout, userData) => {
  const age = parseInt(userData?.age) || 30;
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const restingHR = parseInt(userData?.restingHeartRate) || 60;
  const gender = userData?.gender || 'male'; // 'male' or 'female'
  
  const duration = parseFloat(workout.runDuration || workout.duration || 0); // 分鐘
  
  if (duration <= 0) return 0;
  
  // 方法 1: 如果有心率數據，使用 TRIMP
  if (workout.type === 'run' && workout.runHeartRate) {
    const hrStr = String(workout.runHeartRate || '');
    // 處理心率格式：可能是 "140-150" 或 "145" 或 "145 bpm"
    const hrMatch = hrStr.match(/(\d+)/);
    if (hrMatch) {
      const avgHR = parseFloat(hrMatch[1]);
      
      if (avgHR > restingHR && avgHR <= maxHR) {
        // 計算 %HRR (Heart Rate Reserve)
        const hrr = (avgHR - restingHR) / (maxHR - restingHR);
        
        // TRIMP 加權因子（根據性別）
        // 男性: y = 0.64 * e^(1.92 * %HRR)
        // 女性: y = 0.64 * e^(1.67 * %HRR)
        const exponent = gender === 'female' ? 1.67 : 1.92;
        const weightingFactor = 0.64 * Math.exp(exponent * hrr);
        
        // TRIMP = Time (minutes) × %HRR × Weighting Factor
        const trimp = duration * hrr * weightingFactor;
        return Math.round(trimp * 10) / 10; // 保留一位小數
      }
    }
  }
  
  // 方法 2: 無心率數據時，使用簡化 sRPE（基於訓練類型估算 RPE）
  let estimatedRPE = 5; // 預設中等強度
  
  if (workout.type === 'run') {
    const runType = workout.runType || '';
    if (runType === 'Interval' || runType === '間歇') {
      estimatedRPE = 9; // 高強度間歇
    } else if (runType === 'MP' || runType === '馬拉松配速') {
      estimatedRPE = 7; // 中高強度
    } else if (runType === 'LSD' || runType === '長距離') {
      estimatedRPE = 6; // 中強度
    } else if (runType === 'Easy' || runType === '輕鬆') {
      estimatedRPE = 4; // 低強度
    } else {
      // 根據配速估算（如果有配速數據）
      const pace = workout.runPace || '';
      if (pace) {
        // 簡化：配速越快，RPE 越高（這裡用粗略估算）
        estimatedRPE = 5.5;
      }
    }
  } else if (workout.type === 'strength') {
    // 重訓通常為中高強度
    estimatedRPE = 7;
  }
  
  // sRPE = RPE × Duration (minutes)
  const srpe = estimatedRPE * duration;
  return Math.round(srpe * 10) / 10; // 保留一位小數
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
 * @param {Array} [params.workouts] - 可選的訓練資料陣列（如果提供則使用，否則查詢資料庫）
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
export const getDashboardStats = async ({ userData, workouts: providedWorkouts = null }) => {
  // 1. 計算日期範圍 (過去 30 天，含今天；排除未來)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

  // 2. 取得資料（如果提供了 workouts 則使用，否則查詢資料庫）
  let workouts;
  if (providedWorkouts) {
    workouts = providedWorkouts.filter(
      (w) => w.date && w.date >= startDateStr && w.date <= todayStr
    );
  } else {
    workouts = await listCalendarWorkoutsByDateRange(startDateStr, todayStr);
  }

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
  let totalTrainingLoad = 0; // 總訓練負荷

  // 心率相關計算
  const age = parseInt(userData?.age) || 30;
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const zone2LowerLimit = maxHR * 0.6;
  const zone2UpperLimit = maxHR * 0.7;

  // 計算本週起始日
  const day = now.getDay() || 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - day + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  workouts.forEach((workout) => {
    const data = workout;
    if (!data) return;

    // 統計邏輯：已完成（舊資料無 status 視為 completed，與趨勢／statsCalculations 一致）
    if ((data.status || 'completed') === 'completed') {
      if (data.type !== 'analysis') {
        totalWorkouts++;
        // 計算訓練負荷
        totalTrainingLoad += calculateTrainingLoadAdvanced(data, userData);
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
    trainingLoad: Math.round(totalTrainingLoad), // 總訓練負荷（整數）
    avgTrainingLoad: totalWorkouts > 0 
      ? Math.round((totalTrainingLoad / totalWorkouts) * 10) / 10 
      : 0, // 平均每次訓練負荷
  };
};

