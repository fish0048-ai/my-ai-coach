import { collection, addDoc, query, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { calculateTrainingLoad } from '../utils/workoutCalculations';

const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * 簡單記憶體快取實作
 * 快取查詢結果，減少 Firebase 讀取次數
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘快取時間

/**
 * 獲取快取資料
 * @param {string} key - 快取鍵
 * @returns {any|null} 快取資料或 null
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
 * 設定快取資料
 * @param {string} key - 快取鍵
 * @param {any} data - 要快取的資料
 */
const setCache = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * 清除快取（在資料更新時呼叫）
 * @param {string} pattern - 快取鍵模式（可選）
 */
const clearCache = (pattern = null) => {
  if (pattern) {
    // 清除匹配模式的快取
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    // 清除所有快取
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
  
  // 使用與清除快取時一致的 key，確保更新後能立即反映在 UI
  const cacheKey = `calendar_${user.uid}`;
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
  
  try {
    const constraints = [collection(db, 'users', user.uid, 'calendar'), where('date', '>=', startDate)];
    if (endDate) {
      constraints.push(where('date', '<=', endDate));
    }
    const q = query(...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('查詢範圍訓練資料失敗:', error);
    return []; // 失敗時回傳空陣列，避免中斷 AI 生成
  }
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

/**
 * 訂閱所有訓練資料（實時更新）
 * @param {Function} onUpdate - 資料更新回調函數
 * @param {Function} [onError] - 錯誤回調函數（可選）
 * @returns {Function} 取消訂閱函數
 */
export const subscribeCalendarWorkouts = (onUpdate, onError = null) => {
  const user = getCurrentUser();
  if (!user) {
    if (onError) onError(new Error('請先登入'));
    return () => {};
  }

  const q = query(
    collection(db, 'users', user.uid, 'calendar'),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      onUpdate(data);
    },
    (error) => {
      console.error('Error subscribing to calendar workouts:', error);
      if (onError) onError(error);
    }
  );
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
  
  // 如果更新了 RPE 或時間，重新計算 Training Load
  if (updates.rpe !== undefined || updates.runRPE !== undefined || updates.runDuration !== undefined || updates.duration !== undefined) {
    // 需要先獲取現有資料來計算
    const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const rpe = updates.rpe || updates.runRPE || existingData.rpe || existingData.runRPE;
      const duration = updates.runDuration || updates.duration || existingData.runDuration || existingData.duration;
      if (rpe && duration) {
        updates.trainingLoad = calculateTrainingLoad(rpe, duration);
      }
    }
  }
  
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await updateDoc(docRef, updates);
  
  // 清除相關快取
  clearCache(`calendar_${user.uid}`);
};

export const setCalendarWorkout = async (workoutId, data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  
  // 自動計算 Training Load（如果有 RPE 和時間）
  const rpe = data.rpe || data.runRPE;
  const duration = data.runDuration || data.duration;
  if (rpe && duration) {
    data.trainingLoad = calculateTrainingLoad(rpe, duration);
  }
  
  const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
  await setDoc(docRef, data);
  
  // 清除相關快取
  clearCache(`calendar_${user.uid}`);
};

export const createCalendarWorkout = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  
  // 自動計算 Training Load（如果有 RPE 和時間）
  const rpe = data.rpe || data.runRPE;
  const duration = data.runDuration || data.duration;
  if (rpe && duration) {
    data.trainingLoad = calculateTrainingLoad(rpe, duration);
  }
  
  const collectionRef = collection(db, 'users', user.uid, 'calendar');
  await addDoc(collectionRef, data);
  
  // 清除相關快取
  clearCache(`calendar_${user.uid}`);
};

export const deleteCalendarWorkout = async (workoutId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'calendar', workoutId));
  
  // 清除相關快取
  clearCache(`calendar_${user.uid}`);
};

export const getUserProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    return profileSnap.exists() ? profileSnap.data() : null;
  } catch (error) {
    console.error('獲取用戶資料失敗:', error);
    return null; // 失敗時回傳 null，讓 AI 服務使用預設值而非拋出權限錯誤
  }
};

/**
 * 生成行事曆 CSV 資料（用於匯出）
 * 使用 csvParser 服務的 generateCSVData，並添加裝備和備註欄位
 * @param {Array} gears - 裝備陣列（可選）
 * @returns {Promise<string>} CSV 字串
 */
export const generateCalendarCSVData = async (gears = []) => {
  const workouts = await listCalendarWorkouts();
  const { generateCSVData } = await import('./import/csvParser');
  
  // 使用 csvParser 生成基礎 CSV
  let csvContent = generateCSVData(workouts, gears);
  
  // 添加裝備和備註欄位（擴展功能）
  const lines = csvContent.split('\n');
  if (lines.length > 0) {
    // 更新標題列
    const headers = lines[0].split(',');
    if (!headers.includes('"裝備"') && !headers.includes('裝備')) {
      lines[0] = lines[0].replace(/"總次數"/, '"總次數","裝備","備註"');
    }
    
    // 為每筆資料添加裝備和備註
    for (let i = 1; i < lines.length; i++) {
      const workout = workouts[i - 1];
      if (workout) {
        const gearName = gears.find((g) => g.id === workout.gearId)?.model || '';
        const notes = workout.notes || '';
        // 移除行尾的換行符，添加新欄位
        lines[i] = lines[i].replace(/\r?\n?$/, '') + `,"${gearName.replace(/"/g, '""')}","${notes.replace(/"/g, '""')}"`;
      }
    }
  }
  
  return lines.join('\n');
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
  
  // 清除裝備相關快取
  clearCache(`gears_${user.uid}`);
};

export const updateGear = async (gearId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await updateDoc(doc(db, 'users', user.uid, 'gears', gearId), updates);
  
  // 清除裝備相關快取
  clearCache(`gears_${user.uid}`);
};

export const deleteGear = async (gearId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'gears', gearId));
  
  // 清除裝備相關快取
  clearCache(`gears_${user.uid}`);
};

