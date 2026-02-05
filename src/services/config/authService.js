import { auth } from '../../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

/**
 * 獲取當前登入的用戶
 * @returns {Object|null} Firebase 用戶對象或 null
 */
export const getCurrentUser = () => auth.currentUser;

/**
 * 要求必須有登入用戶（如果未登入則拋出錯誤）
 * @returns {Object} Firebase 用戶對象
 * @throws {Error} 如果未登入則拋出錯誤
 */
export const requireUser = () => {
  const user = auth.currentUser;
  if (!user) throw new Error('請先登入');
  return user;
};

/**
 * 登出
 * @returns {Promise<void>}
 */
export const signOut = () => auth.signOut();

/**
 * 使用 Google 帳號登入
 * @returns {Promise<Object>} Firebase 認證結果
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};
