/**
 * Nutrition API 層
 * 任務 2-5：Firebase 實作集中於 nutritionImpl
 */

import {
  subscribeFoodLogsByDate,
  createFoodLog,
  deleteFoodLog,
} from './nutritionImpl';

export const subscribeNutritionByDate = (dateStr, onNext, onError) =>
  subscribeFoodLogsByDate(dateStr, onNext, onError);

export const addFoodLog = (payload) => createFoodLog(payload);

export const removeFoodLog = (logId) => deleteFoodLog(logId);
