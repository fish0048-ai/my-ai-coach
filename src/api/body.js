/**
 * Body / 身體數據 API 層骨架
 * 目前直接轉呼叫既有的 bodyService。
 */

import {
  subscribeBodyLogs,
  createBodyLog,
  deleteBodyLog,
  syncBodyLogFromProfile,
} from '../services/bodyService';

// 訂閱身體數據
export const subscribeBodyLogsStream = (callback) => subscribeBodyLogs(callback);

// 新增身體數據
export const addBodyLog = (date, weight, bodyFat) =>
  createBodyLog(date, weight, bodyFat);

// 刪除身體數據
export const removeBodyLog = (logId) => deleteBodyLog(logId);

// 從 Profile 同步身體數據
export const syncBodyLog = (date, weight, bodyFat) =>
  syncBodyLogFromProfile(date, weight, bodyFat);

