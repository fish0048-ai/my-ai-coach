/**
 * Auth API 層
 * 目前直接轉呼叫既有的 authService，之後可逐步內聚到 API 層。
 */

import { signInWithGoogle as signInWithGoogleService, signOut as signOutService, getCurrentUser as getCurrentUserService, requireUser as requireUserService } from '../services/authService';

export const signInWithGoogle = () => {
  return signInWithGoogleService();
};

export const signOut = () => {
  return signOutService();
};

export const getCurrentUser = () => {
  return getCurrentUserService();
};

export const requireUser = () => {
  return requireUserService();
};

