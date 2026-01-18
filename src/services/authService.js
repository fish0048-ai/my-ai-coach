import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const requireUser = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('請先登入');
  }
  return user;
};

/**
 * 登出
 */
export const signOut = () => {
  return auth.signOut();
};

/**
 * 使用 Google 登入
 */
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};
