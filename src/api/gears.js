/**
 * Gears API 層
 * 任務 2-5：Firebase 實作集中於 gearsImpl
 */

import {
  listGears,
  subscribeGears,
  createGear,
  updateGear,
  deleteGear,
} from './gearsImpl';

export const fetchGears = () => listGears();
export const subscribeGearsStream = (callback) => subscribeGears(callback);
export const addGear = (data) => createGear(data);
export const updateGearInfo = (gearId, updates) => updateGear(gearId, updates);
export const removeGear = (gearId) => deleteGear(gearId);
