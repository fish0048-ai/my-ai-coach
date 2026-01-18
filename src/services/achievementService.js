/**
 * 訓練成就服務
 * 定義、檢測和儲存用戶訓練成就
 */

import { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { listCalendarWorkouts, listCalendarWorkoutsByDateRange } from './calendarService';

/**
 * 獲取當前用戶
 */
const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * 成就定義
 */
export const ACHIEVEMENTS = {
  // 連續訓練成就
  STREAK_3: {
    id: 'streak_3',
    name: '初出茅廬',
    description: '連續訓練 3 天',
    icon: '🔥',
    category: 'streak',
    check: async (userData, workouts) => {
      return checkStreak(workouts, 3);
    }
  },
  STREAK_7: {
    id: 'streak_7',
    name: '持之以恆',
    description: '連續訓練 7 天',
    icon: '🔥',
    category: 'streak',
    check: async (userData, workouts) => {
      return checkStreak(workouts, 7);
    }
  },
  STREAK_30: {
    id: 'streak_30',
    name: '訓練狂人',
    description: '連續訓練 30 天',
    icon: '🔥',
    category: 'streak',
    check: async (userData, workouts) => {
      return checkStreak(workouts, 30);
    }
  },

  // 總訓練次數成就
  TOTAL_10: {
    id: 'total_10',
    name: '起步者',
    description: '完成 10 次訓練',
    icon: '🏋️',
    category: 'total',
    check: async (userData, workouts) => {
      const completed = workouts.filter(w => w.status === 'completed' && w.type !== 'analysis').length;
      return completed >= 10;
    }
  },
  TOTAL_50: {
    id: 'total_50',
    name: '訓練達人',
    description: '完成 50 次訓練',
    icon: '🏋️',
    category: 'total',
    check: async (userData, workouts) => {
      const completed = workouts.filter(w => w.status === 'completed' && w.type !== 'analysis').length;
      return completed >= 50;
    }
  },
  TOTAL_100: {
    id: 'total_100',
    name: '百戰百勝',
    description: '完成 100 次訓練',
    icon: '🏋️',
    category: 'total',
    check: async (userData, workouts) => {
      const completed = workouts.filter(w => w.status === 'completed' && w.type !== 'analysis').length;
      return completed >= 100;
    }
  },

  // 跑步成就
  RUN_10KM: {
    id: 'run_10km',
    name: '十公里跑者',
    description: '單次跑步距離達到 10km',
    icon: '🏃',
    category: 'running',
    check: async (userData, workouts) => {
      const runs = workouts.filter(w => w.type === 'run' && w.status === 'completed');
      return runs.some(run => parseFloat(run.runDistance || 0) >= 10);
    }
  },
  RUN_100KM_TOTAL: {
    id: 'run_100km_total',
    name: '百公里跑者',
    description: '累計跑步距離達到 100km',
    icon: '🏃',
    category: 'running',
    check: async (userData, workouts) => {
      const runs = workouts.filter(w => w.type === 'run' && w.status === 'completed');
      const total = runs.reduce((sum, run) => sum + parseFloat(run.runDistance || 0), 0);
      return total >= 100;
    }
  },
  RUN_500KM_TOTAL: {
    id: 'run_500km_total',
    name: '五百公里跑者',
    description: '累計跑步距離達到 500km',
    icon: '🏃',
    category: 'running',
    check: async (userData, workouts) => {
      const runs = workouts.filter(w => w.type === 'run' && w.status === 'completed');
      const total = runs.reduce((sum, run) => sum + parseFloat(run.runDistance || 0), 0);
      return total >= 500;
    }
  },

  // 力量訓練成就
  STRENGTH_50: {
    id: 'strength_50',
    name: '力量初學者',
    description: '完成 50 次力量訓練',
    icon: '💪',
    category: 'strength',
    check: async (userData, workouts) => {
      const strength = workouts.filter(w => w.type === 'strength' && w.status === 'completed').length;
      return strength >= 50;
    }
  },
  STRENGTH_100: {
    id: 'strength_100',
    name: '力量達人',
    description: '完成 100 次力量訓練',
    icon: '💪',
    category: 'strength',
    check: async (userData, workouts) => {
      const strength = workouts.filter(w => w.type === 'strength' && w.status === 'completed').length;
      return strength >= 100;
    }
  },

  // 特殊成就
  FIRST_WORKOUT: {
    id: 'first_workout',
    name: '第一次',
    description: '完成第一次訓練',
    icon: '🎉',
    category: 'special',
    check: async (userData, workouts) => {
      const completed = workouts.filter(w => w.status === 'completed' && w.type !== 'analysis').length;
      return completed >= 1;
    }
  },
  WEEK_WARRIOR: {
    id: 'week_warrior',
    name: '週戰士',
    description: '一週內完成 5 次訓練',
    icon: '⚔️',
    category: 'special',
    check: async (userData, workouts) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStart = weekAgo.toISOString().split('T')[0];
      const weekWorkouts = workouts.filter(w => 
        w.status === 'completed' && 
        w.type !== 'analysis' && 
        w.date >= weekStart
      );
      return weekWorkouts.length >= 5;
    }
  }
};

/**
 * 檢查連續訓練天數
 */
const checkStreak = (workouts, targetDays) => {
  const completed = workouts
    .filter(w => w.status === 'completed' && w.type !== 'analysis')
    .map(w => w.date)
    .filter((date, index, arr) => arr.indexOf(date) === index) // 去重
    .sort()
    .reverse(); // 從最新到最舊

  if (completed.length < targetDays) return false;

  // 檢查是否連續
  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < completed.length - 1; i++) {
    const current = new Date(completed[i]);
    const next = new Date(completed[i + 1]);
    current.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      if (streak >= targetDays) return true;
    } else {
      streak = 1;
    }
  }

  return false;
};

/**
 * 獲取用戶已解鎖的成就
 */
export const getUserAchievements = async () => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const achievementsRef = collection(db, 'users', user.uid, 'achievements');
    const snapshot = await getDocs(query(achievementsRef, orderBy('unlockedAt', 'desc')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('獲取成就失敗:', error);
    return [];
  }
};

/**
 * 檢查並解鎖成就
 */
export const checkAndUnlockAchievements = async () => {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    // 獲取所有訓練記錄
    const workouts = await listCalendarWorkouts();
    
    // 獲取用戶資料
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    // 獲取已解鎖的成就
    const unlocked = await getUserAchievements();
    const unlockedIds = new Set(unlocked.map(a => a.id));

    // 檢查所有成就
    const newlyUnlocked = [];
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      // 如果已經解鎖，跳過
      if (unlockedIds.has(achievement.id)) continue;

      // 檢查是否達成
      const achieved = await achievement.check(userData, workouts);
      if (achieved) {
        // 解鎖成就
        const achievementRef = doc(db, 'users', user.uid, 'achievements', achievement.id);
        await setDoc(achievementRef, {
          ...achievement,
          unlockedAt: serverTimestamp(),
          unlockedDate: new Date().toISOString().split('T')[0]
        }, { merge: true });

        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('檢查成就失敗:', error);
    return [];
  }
};

/**
 * 訂閱用戶成就變化
 */
export const subscribeAchievements = (callback) => {
  const user = getCurrentUser();
  if (!user) {
    callback([]);
    return () => {};
  }

  const achievementsRef = collection(db, 'users', user.uid, 'achievements');
  const q = query(achievementsRef, orderBy('unlockedAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const achievements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(achievements);
  }, (error) => {
    console.error('訂閱成就失敗:', error);
    callback([]);
  });

  return unsubscribe;
};
