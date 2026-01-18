import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './authService';

/**
 * 獲取用戶 Profile 數據
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
