/**
 * API 層共用：Firebase 認證與快取
 * 供 workouts、gears、nutrition 等 API 實作使用
 */

import { auth } from '../firebase';

export const getCurrentUser = () => auth.currentUser;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return cached.data;
};

export const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const clearCache = (pattern = null) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
};
