/**
 * User API 實作（Firebase）
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentUser } from './_firebase';

export const getUserProfile = async () => {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    return profileSnap.exists() ? profileSnap.data() : null;
  } catch (error) {
    console.error('獲取用戶資料失敗:', error);
    return null;
  }
};
