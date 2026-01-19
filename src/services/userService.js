import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';

/**
 * 獲取用戶 Profile 數據（一次性查詢）
 * @returns {Promise<Object|null>} 用戶資料或 null
 */
export const getUserProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  return profileSnap.exists() ? profileSnap.data() : null;
};

/**
 * 訂閱用戶 Profile 變化（實時監聽）
 * @param {Function} callback - 回調函數，接收用戶資料
 * @returns {Function} 取消訂閱函數
 */
export const subscribeUserProfile = (callback) => {
  const user = getCurrentUser();
  if (!user) {
    callback(null);
    return () => {};
  }
  
  const profileRef = doc(db, 'users', user.uid);
  return onSnapshot(
    profileRef,
    (snapshot) => {
      callback(snapshot.exists() ? snapshot.data() : null);
    },
    (error) => {
      console.error('訂閱用戶資料失敗:', error);
      callback(null);
    }
  );
};

/**
 * 更新用戶 Profile
 * @param {Object} profileData - 要更新的資料
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (profileData) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');
  const profileRef = doc(db, 'users', user.uid);
  await setDoc(profileRef, {
    ...profileData,
    email: user.email,
    name: user.displayName || 'User',
    lastUpdated: new Date()
  }, { merge: true });
};
