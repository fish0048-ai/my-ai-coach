/**
 * Gears / 裝備 API 層骨架
 * 目前直接轉呼叫既有的 calendarService 中裝備相關函數。
 */

import {
  listGears,
  subscribeGears,
  createGear,
  updateGear,
  deleteGear,
} from '../services/calendarService';

// 查詢裝備清單
export const fetchGears = () => listGears();

// 訂閱裝備變更
export const subscribeGearsStream = (callback) => subscribeGears(callback);

// 新增裝備
export const addGear = (data) => createGear(data);

// 更新裝備
export const updateGearInfo = (gearId, updates) => updateGear(gearId, updates);

// 刪除裝備
export const removeGear = (gearId) => deleteGear(gearId);

