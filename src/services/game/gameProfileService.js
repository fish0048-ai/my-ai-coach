/**
 * RPG 遊戲化：遊戲檔案與 XP／金幣
 * 第二階段 - 將訓練完成換算成經驗值與金幣，寫入 Firebase users/{uid}.gameProfile
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_NEXT_LEVEL_XP = 100;
const XP_PER_LEVEL = 100;

/** 預設 gameProfile 結構 */
export const getDefaultGameProfile = () => ({
  level: 1,
  currentXP: 0,
  nextLevelXP: DEFAULT_NEXT_LEVEL_XP,
  coins: 0,
  equippedSkin: 'default',
  attributes: { str: 5, end: 5, agi: 5 },
});

/**
 * 從 Firestore 讀取使用者的 gameProfile（若無則回傳預設）
 * @param {string} uid - Firebase 使用者 ID
 * @returns {Promise<Object>}
 */
export const getGameProfile = async (uid) => {
  if (!uid) return getDefaultGameProfile();
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};
  const existing = data.gameProfile || {};
  return {
    ...getDefaultGameProfile(),
    ...existing,
    attributes: { ...getDefaultGameProfile().attributes, ...(existing.attributes || {}) },
  };
};

/**
 * 計算單次訓練可獲得的 XP（依類型與距離／時長）
 * @param {Object} workout - 訓練資料 { type, runDistance, duration, runDuration, ... }
 * @returns {{ xp: number, coins: number }}
 */
export const computeRewardForWorkout = (workout) => {
  if (!workout || workout.status !== 'completed') return { xp: 0, coins: 0 };
  const type = (workout.type || '').toLowerCase();
  const distance = parseFloat(workout.runDistance) || 0;
  const duration = parseFloat(workout.runDuration || workout.duration) || 0;

  let xp = 50;
  let coins = 10;

  if (type === 'run' || type === 'running') {
    if (distance >= 5) {
      xp = 50 + Math.min(50, Math.floor(distance * 2));
      coins = 10 + Math.min(20, Math.floor(distance));
    } else if (distance > 0) {
      xp = 30 + Math.floor(distance * 4);
      coins = 10;
    }
  } else if (duration > 0) {
    xp = 30 + Math.min(40, Math.floor(duration / 5));
  }

  return { xp, coins };
};

/**
 * 增加 XP 與金幣，處理升級邏輯後寫回 Firestore
 * @param {string} uid
 * @param {number} xp
 * @param {number} coins
 * @param {{ isPR?: boolean }} options - 若為 PR 可額外獎勵（例如更多 XP）
 * @returns {Promise<Object>} 更新後的 gameProfile
 */
export const addXPAndCoins = async (uid, xp, coins, options = {}) => {
  if (!uid) return getDefaultGameProfile();
  const profile = await getGameProfile(uid);

  let currentXP = (profile.currentXP || 0) + xp;
  let level = profile.level || 1;
  let nextLevelXP = profile.nextLevelXP ?? XP_PER_LEVEL * level;

  if (options.isPR) {
    currentXP += 150;
    profile.coins = (profile.coins || 0) + 30;
  }

  while (currentXP >= nextLevelXP && nextLevelXP > 0) {
    currentXP -= nextLevelXP;
    level += 1;
    nextLevelXP = XP_PER_LEVEL * level;
  }

  const updated = {
    ...profile,
    level,
    currentXP,
    nextLevelXP,
    coins: (profile.coins || 0) + coins,
  };

  const ref = doc(db, 'users', uid);
  await setDoc(ref, { gameProfile: updated }, { merge: true });
  return updated;
};

/**
 * 訓練完成時發放獎勵（由 useCalendar / 成就流程呼叫）
 * @param {string} uid
 * @param {Object} workout - 一筆訓練資料
 * @param {{ isPR?: boolean }} options
 * @returns {Promise<{ xp: number, coins: number }>} 本次獲得的 xp、coins
 */
export const awardForWorkout = async (uid, workout, options = {}) => {
  if (!uid || !workout) return { xp: 0, coins: 0 };
  const { xp, coins } = computeRewardForWorkout(workout);
  if (xp <= 0 && coins <= 0) return { xp: 0, coins: 0 };
  await addXPAndCoins(uid, xp, coins, options);
  return { xp, coins };
};
