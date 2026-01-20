/**
 * Nutrition API 層骨架
 * 目前直接轉呼叫既有的 nutritionService，未來可逐步內聚到 API 層。
 */

import {
  subscribeFoodLogsByDate,
  createFoodLog,
  deleteFoodLog,
} from '../services/nutritionService';

// 訂閱指定日期的飲食紀錄
export const subscribeNutritionByDate = (dateStr, onNext, onError) =>
  subscribeFoodLogsByDate(dateStr, onNext, onError);

// 新增飲食紀錄
export const addFoodLog = (payload) => createFoodLog(payload);

// 刪除飲食紀錄
export const removeFoodLog = (logId) => deleteFoodLog(logId);

