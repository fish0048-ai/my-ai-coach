import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';
import { updateAIContext } from '../utils/contextManager';

/**
 * 訂閱身體數據記錄
 * @param {function} callback - 回調函數，接收數據陣列
 * @returns {function} 取消訂閱函數
 */
export const subscribeBodyLogs = (callback) => {
  const user = getCurrentUser();
  if (!user) return () => {};
  const q = query(collection(db, 'users', user.uid, 'body_logs'), orderBy('date', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    callback(logs);
  });
};

/**
 * 新增身體數據記錄
 * @param {string} date - 日期 YYYY-MM-DD
 * @param {number} weight - 體重 (kg)
 * @param {number} bodyFat - 體脂率 (%)
 */
export const createBodyLog = async (date, weight, bodyFat) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const w = parseFloat(weight) || 0;
  const f = parseFloat(bodyFat) || 0;
  
  await addDoc(collection(db, 'users', user.uid, 'body_logs'), {
    date,
    weight: w,
    bodyFat: f,
    createdAt: serverTimestamp()
  });

  // 更新用戶 profile
  if (w > 0 || f > 0) {
    const profileRef = doc(db, 'users', user.uid);
    const updates = { lastUpdated: new Date() };
    if (w > 0) updates.weight = w;
    if (f > 0) updates.bodyFat = f;
    await setDoc(profileRef, updates, { merge: true });
  }

  await updateAIContext();
};

/**
 * 刪除身體數據記錄
 * @param {string} logId - 記錄 ID
 */
export const deleteBodyLog = async (logId) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  await deleteDoc(doc(db, 'users', user.uid, 'body_logs', logId));
  await updateAIContext();
};
