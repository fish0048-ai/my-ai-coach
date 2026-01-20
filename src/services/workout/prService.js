/**
 * PR (Personal Record) 追蹤服務
 * 負責提取、計算和管理用戶的個人最佳記錄
 */

import { listCalendarWorkouts } from '../calendarService';
import { auth } from '../../firebase';

/**
 * 獲取當前用戶
 * @returns {Object|null} 當前用戶物件
 */
const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * 計算 1RM (One Rep Max)
 * 使用 Epley 公式：1RM = weight * (1 + reps / 30)
 * @param {number} weight - 重量 (kg)
 * @param {number} reps - 次數
 * @returns {number} 預估 1RM
 */
export const calculate1RM = (weight, reps) => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  // 使用 Epley 公式：1RM = weight * (1 + reps / 30)
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

/**
 * 識別並提取 PR 資料
 * @param {Array} workouts - 訓練記錄陣列
 * @returns {Object} PR 資料物件，包含 strengthPRs 和 runPRs
 */
export const extractPRs = (workouts) => {
  if (!Array.isArray(workouts)) return { strengthPRs: {}, runPRs: {} };

  const strengthPRs = {}; // { exerciseName: { max1RM, maxVolume, maxWeight, date, ... } }
  const runPRs = {
    maxDistance: null,
    fastestPace: null,
    longestDuration: null,
    fastestPaceDate: null,
    maxDistanceDate: null,
    longestDurationDate: null
  };

  workouts.forEach((workout) => {
    if (!workout || workout.status !== 'completed') return;

    // 處理力量訓練 PR
    if (workout.type === 'strength' && Array.isArray(workout.exercises)) {
      workout.exercises.forEach((exercise) => {
        if (!exercise || !exercise.name) return;

        const exerciseName = exercise.name.trim();
        const sets = parseInt(exercise.sets) || 0;
        const reps = parseInt(exercise.reps) || 0;
        const weight = parseFloat(exercise.weight) || 0;

        if (sets === 0 || reps === 0 || weight === 0) return;

        const volume = sets * reps * weight; // 總訓練量
        const max1RM = calculate1RM(weight, reps); // 預估 1RM
        const maxWeight = weight; // 最大重量

        // 初始化或更新 PR
        if (!strengthPRs[exerciseName]) {
          strengthPRs[exerciseName] = {
            max1RM: 0,
            maxVolume: 0,
            maxWeight: 0,
            maxSets: 0,
            maxReps: 0,
            firstDate: workout.date,
            lastDate: workout.date,
            prDates: {}
          };
        }

        const pr = strengthPRs[exerciseName];

        // 更新最大 1RM
        if (max1RM > pr.max1RM) {
          pr.max1RM = max1RM;
          pr.max1RMDate = workout.date;
          pr.max1RMWeight = weight;
          pr.max1RMReps = reps;
        }

        // 更新最大總訓練量
        if (volume > pr.maxVolume) {
          pr.maxVolume = volume;
          pr.maxVolumeDate = workout.date;
        }

        // 更新最大重量
        if (maxWeight > pr.maxWeight) {
          pr.maxWeight = maxWeight;
          pr.maxWeightDate = workout.date;
        }

        // 更新最大組數
        if (sets > pr.maxSets) {
          pr.maxSets = sets;
          pr.maxSetsDate = workout.date;
        }

        // 更新最大次數
        if (reps > pr.maxReps) {
          pr.maxReps = reps;
          pr.maxRepsDate = workout.date;
        }

        // 更新日期範圍
        if (workout.date < pr.firstDate) {
          pr.firstDate = workout.date;
        }
        if (workout.date > pr.lastDate) {
          pr.lastDate = workout.date;
        }
      });
    }

    // 處理跑步 PR
    if (workout.type === 'run') {
      const distance = parseFloat(workout.runDistance) || 0;
      const duration = parseFloat(workout.runDuration) || 0; // 分鐘
      const paceStr = workout.runPace || '';

      // 解析配速（格式：5'30" 或 5:30）
      let paceMinutes = 0;
      if (paceStr) {
        // 匹配 5'30" 或 5:30 格式
        const matchSingleQuote = paceStr.match(/(\d+)[\x27](\d+)/);
        const matchColon = paceStr.match(/(\d+):(\d+)/);
        const match = matchSingleQuote || matchColon;
        if (match) {
          paceMinutes = parseFloat(match[1]) + parseFloat(match[2]) / 60;
        }
      } else if (distance > 0 && duration > 0) {
        // 如果沒有配速，從距離和時間計算
        paceMinutes = duration / distance;
      }

      // 更新最大距離
      if (distance > 0 && (!runPRs.maxDistance || distance > runPRs.maxDistance)) {
        runPRs.maxDistance = distance;
        runPRs.maxDistanceDate = workout.date;
      }

      // 更新最快配速（配速越小越快）
      if (paceMinutes > 0 && (!runPRs.fastestPace || paceMinutes < runPRs.fastestPace)) {
        runPRs.fastestPace = paceMinutes;
        runPRs.fastestPaceDate = workout.date;
      }

      // 更新最長時長
      if (duration > 0 && (!runPRs.longestDuration || duration > runPRs.longestDuration)) {
        runPRs.longestDuration = duration;
        runPRs.longestDurationDate = workout.date;
      }
    }
  });

  return { strengthPRs, runPRs };
};

/**
 * 獲取用戶所有 PR 資料
 * @returns {Promise<Object>} PR 資料物件，包含 strengthPRs 和 runPRs
 */
export const getAllPRs = async () => {
  const user = getCurrentUser();
  if (!user) return { strengthPRs: {}, runPRs: {} };

  try {
    const workouts = await listCalendarWorkouts();
    return extractPRs(workouts);
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return { strengthPRs: {}, runPRs: {} };
  }
};
