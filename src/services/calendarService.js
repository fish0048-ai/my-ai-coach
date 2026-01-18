import { collection, addDoc, query, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * 简单内存缓存实现
 * 缓存查询结果，减少 Firebase 读取次数
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存时间

/**
 * 获取缓存数据
 * @param {string} key - 缓存键
 * @returns {any|null} 缓存数据或 null
 */
const getCache = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * 设置缓存数据
 * @param {string} key - 缓存键
 * @param {any} data - 要缓存的数据
 */
const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * 清除缓存（在数据更新时调用）
 * @param {string} pattern - 缓存键模式（可选）
 */
const clearCache = (pattern = null) => {
  if (pattern) {
    // 清除匹配模式的缓存
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // 清除所有缓存
    cache.clear();
  }
};

export const listGears = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  
  const cacheKey = `gears_${user.uid}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  const q = query(collection(db, 'users', user.uid, 'gears'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  
  setCache(cacheKey, data);
  return data;
};

export const listCalendarWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  
  const cacheKey = `calendar_workouts_${user.uid}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  const q = query(collection(db, 'users', user.uid, 'calendar'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  
  setCache(cacheKey, data);
  return data;
};

export const listCalendarWorkoutsByDateRange = async (startDate, endDate = null) => {
  const user = getCurrentUser();
  if (!user) return [];
  
  const cacheKey = `calendar_workouts_range_${user.uid}_${startDate}_${endDate || 'null'}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  const constraints = [collection(db, 'users', user.uid, 'calendar'), where('date', '>=', startDate)];
  if (endDate) {
    constraints.push(where('date', '<=', endDate));
  }
  const q = query(...constraints);
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  
  setCache(cacheKey, data);
  return data;
};

export const listTodayWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  
  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = `today_workouts_${user.uid}_${todayStr}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('date', '==', todayStr));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  
  setCache(cacheKey, data);
  return data;
};

export const listCompletedWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const subscribeCompletedWorkouts = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(data);
  });
};

export const listRunLogs = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(
    collection(db, 'users', user.uid, 'calendar'),
    where('type', '==', 'run'),
    where('status', '==', 'completed')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      date: data.date,
      distance: parseFloat(data.runDistance || 0)
    };
  });
};

export const updateCalendarWorkout = async (workoutId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await updateDoc(docRef, updates);
  
  // 清除相关缓存
  clearCache(`calendar_${user.uid}`);
};

export const setCalendarWorkout = async (workoutId, data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await setDoc(docRef, data);
  
  // 清除相关缓存
  clearCache(`calendar_${user.uid}`);
};

export const createCalendarWorkout = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const collectionRef = collection(db, 'users', user.uid, 'calendar');
  await addDoc(collectionRef, data);
  
  // 清除相关缓存
  clearCache(`calendar_${user.uid}`);
};

export const deleteCalendarWorkout = async (workoutId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'calendar', workoutId));
  
  // 清除相关缓存
  clearCache(`calendar_${user.uid}`);
};

export const getUserProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists() ? profileSnap.data() : null;
};

export const generateCalendarCSVData = async (gears = []) => {
  const workouts = await listCalendarWorkouts();
  const headers = ['活動類型', '日期', '標題', '距離', '時間', '平均心率', '平均功率', '卡路里', '總組數', '裝備', '備註'];
  const rows = [headers];

  workouts.forEach((data) => {
    const type = data.type === 'run' ? '跑步' : '肌力訓練';
    let totalSets = 0;
    if (data.exercises && Array.isArray(data.exercises)) {
      totalSets = data.exercises.reduce((sum, ex) => sum + (parseInt(ex.sets) || 0), 0);
    }
    const gearName = gears.find((g) => g.id === data.gearId)?.model || '';
    const row = [
      type, data.date || '', data.title || '', data.runDistance || '', data.runDuration || '',
      data.runHeartRate || '', data.runPower || '', data.calories || '',
      totalSets > 0 ? totalSets : '', gearName, data.notes || ''
    ];
    const escapedRow = row.map((field) => {
      const str = String(field ?? '');
      if (str.includes(',') || str.includes('\n') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
      return str;
    });
    rows.push(escapedRow);
  });

  return "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
};

// Gear 相關操作
export const subscribeGears = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'gears'), orderBy('startDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const gearData = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(gearData);
  });
};

export const createGear = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await addDoc(collection(db, 'users', user.uid, 'gears'), {
    ...data,
    currentDistance: 0,
    createdAt: serverTimestamp()
  });
  
  // 清除装备相关缓存
  clearCache(`gears_${user.uid}`);
};

export const updateGear = async (gearId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await updateDoc(doc(db, 'users', user.uid, 'gears', gearId), updates);
  
  // 清除装备相关缓存
  clearCache(`gears_${user.uid}`);
};

export const deleteGear = async (gearId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'gears', gearId));
  
  // 清除装备相关缓存
  clearCache(`gears_${user.uid}`);
};

/**
 * PR (Personal Record) 追踪相关函数
 */

/**
 * 计算 1RM (One Rep Max)
 * @param {number} weight - 重量 (kg)
 * @param {number} reps - 次数
 * @returns {number} 预估 1RM
 */
const calculate1RM = (weight, reps) => {
  if (!weight || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  // 使用 Epley 公式：1RM = weight × (1 + reps / 30)
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

/**
 * 识别并提取 PR 数据
 * @param {Array} workouts - 训练记录数组
 * @returns {Object} PR 数据对象
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

    // 处理力量训练 PR
    if (workout.type === 'strength' && Array.isArray(workout.exercises)) {
      workout.exercises.forEach((exercise) => {
        if (!exercise || !exercise.name) return;

        const exerciseName = exercise.name.trim();
        const sets = parseInt(exercise.sets) || 0;
        const reps = parseInt(exercise.reps) || 0;
        const weight = parseFloat(exercise.weight) || 0;

        if (sets === 0 || reps === 0 || weight === 0) return;

        const volume = sets * reps * weight; // 总训练量
        const max1RM = calculate1RM(weight, reps); // 预估 1RM
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

        // 更新最大总训练量
        if (volume > pr.maxVolume) {
          pr.maxVolume = volume;
          pr.maxVolumeDate = workout.date;
        }

        // 更新最大重量
        if (maxWeight > pr.maxWeight) {
          pr.maxWeight = maxWeight;
          pr.maxWeightDate = workout.date;
        }

        // 更新最大组数
        if (sets > pr.maxSets) {
          pr.maxSets = sets;
          pr.maxSetsDate = workout.date;
        }

        // 更新最大次数
        if (reps > pr.maxReps) {
          pr.maxReps = reps;
          pr.maxRepsDate = workout.date;
        }

        // 更新日期范围
        if (workout.date < pr.firstDate) {
          pr.firstDate = workout.date;
        }
        if (workout.date > pr.lastDate) {
          pr.lastDate = workout.date;
        }
      });
    }

    // 处理跑步 PR
    if (workout.type === 'run') {
      const distance = parseFloat(workout.runDistance) || 0;
      const duration = parseFloat(workout.runDuration) || 0; // 分钟
      const paceStr = workout.runPace || '';

      // 解析配速（格式：5'30" 或 5:30）
      let paceMinutes = 0;
      if (paceStr) {
        const match = paceStr.match(/(\d+)[':](\d+)/);
        if (match) {
          paceMinutes = parseFloat(match[1]) + parseFloat(match[2]) / 60;
        }
      } else if (distance > 0 && duration > 0) {
        // 如果没有配速，从距离和时间计算
        paceMinutes = duration / distance;
      }

      // 更新最大距离
      if (distance > 0 && (!runPRs.maxDistance || distance > runPRs.maxDistance)) {
        runPRs.maxDistance = distance;
        runPRs.maxDistanceDate = workout.date;
      }

      // 更新最快配速（配速越小越快）
      if (paceMinutes > 0 && (!runPRs.fastestPace || paceMinutes < runPRs.fastestPace)) {
        runPRs.fastestPace = paceMinutes;
        runPRs.fastestPaceDate = workout.date;
      }

      // 更新最长时长
      if (duration > 0 && (!runPRs.longestDuration || duration > runPRs.longestDuration) {
        runPRs.longestDuration = duration;
        runPRs.longestDurationDate = workout.date;
      }
    }
  });

  return { strengthPRs, runPRs };
};

/**
 * 获取用户所有 PR 数据
 * @returns {Promise<Object>} PR 数据对象
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
