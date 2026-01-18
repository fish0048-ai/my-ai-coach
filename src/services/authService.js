import { auth } from '../firebase';

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
