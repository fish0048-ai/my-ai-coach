/**
 * Workouts API 實作（Firebase）
 * 任務 2-5：Firebase 邏輯集中於 API 層
 */

import { collection, addDoc, query, getDocs, updateDoc, doc, setDoc, deleteDoc, getDoc, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { calculateTrainingLoad } from '../utils/workoutCalculations';
import { getCurrentUser, getCache, setCache, clearCache } from './_firebase';

export const listCalendarWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const cacheKey = `calendar_${user.uid}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const q = query(collection(db, 'users', user.uid, 'calendar'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    if (endDate) constraints.push(where('date', '<=', endDate));
    const q = query(...constraints);
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('查詢範圍訓練資料失敗:', error);
    return [];
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
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  setCache(cacheKey, data);
  return data;
};

export const listCompletedWorkouts = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const subscribeCompletedWorkouts = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'calendar'), where('status', '==', 'completed'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const subscribeCalendarWorkouts = (onUpdate, onError = null) => {
  const user = getCurrentUser();
  if (!user) {
    if (onError) onError(new Error('請先登入'));
    return () => {};
  }
  const q = query(collection(db, 'users', user.uid, 'calendar'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => onUpdate(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
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
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, date: data.date, distance: parseFloat(data.runDistance || 0) };
  });
};

export const updateCalendarWorkout = async (workoutId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  if (updates.rpe !== undefined || updates.runRPE !== undefined || updates.runDuration !== undefined || updates.duration !== undefined) {
    const docRef = doc(db, 'users', user.uid, 'calendar', workoutId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const existing = docSnap.data();
      const rpe = updates.rpe ?? updates.runRPE ?? existing.rpe ?? existing.runRPE;
      const duration = updates.runDuration ?? updates.duration ?? existing.runDuration ?? existing.duration;
      if (rpe && duration) updates.trainingLoad = calculateTrainingLoad(rpe, duration);
    }
  }
  await updateDoc(doc(db, 'users', user.uid, 'calendar', workoutId), updates);
  clearCache(`calendar_${user.uid}`);
};

export const setCalendarWorkout = async (workoutId, data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const rpe = data.rpe || data.runRPE;
  const duration = data.runDuration || data.duration;
  if (rpe && duration) data.trainingLoad = calculateTrainingLoad(rpe, duration);
  await setDoc(doc(db, 'users', user.uid, 'calendar', workoutId), data);
  clearCache(`calendar_${user.uid}`);
};

export const createCalendarWorkout = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const rpe = data.rpe || data.runRPE;
  const duration = data.runDuration || data.duration;
  if (rpe && duration) data.trainingLoad = calculateTrainingLoad(rpe, duration);
  await addDoc(collection(db, 'users', user.uid, 'calendar'), data);
  clearCache(`calendar_${user.uid}`);
};

export const deleteCalendarWorkout = async (workoutId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'calendar', workoutId));
  clearCache(`calendar_${user.uid}`);
};
