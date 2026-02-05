/**
 * Gears API 實作（Firebase）
 * 任務 2-5：Firebase 邏輯集中於 API 層
 */

import { collection, addDoc, query, getDocs, updateDoc, doc, deleteDoc, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser, getCache, setCache, clearCache } from './_firebase';

export const listGears = async () => {
  const user = getCurrentUser();
  if (!user) return [];
  const cacheKey = `gears_${user.uid}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;
  const q = query(collection(db, 'users', user.uid, 'gears'));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  setCache(cacheKey, data);
  return data;
};

export const subscribeGears = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'gears'), orderBy('startDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

export const createGear = async (data) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await addDoc(collection(db, 'users', user.uid, 'gears'), {
    ...data,
    currentDistance: 0,
    createdAt: serverTimestamp(),
  });
  clearCache(`gears_${user.uid}`);
};

export const updateGear = async (gearId, updates) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await updateDoc(doc(db, 'users', user.uid, 'gears', gearId), updates);
  clearCache(`gears_${user.uid}`);
};

export const deleteGear = async (gearId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'gears', gearId));
  clearCache(`gears_${user.uid}`);
};
