import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";

// 使用您提供的設定直接初始化，避開環境變數讀取失敗的問題
const firebaseConfig = {
  apiKey: "AIzaSyAzu9c8N1AK_2OhbEafQ3ul2EpjzL4mQp0",
  authDomain: "myaicoach-e38d7.firebaseapp.com",
  projectId: "myaicoach-e38d7",
  storageBucket: "myaicoach-e38d7.firebasestorage.app",
  messagingSenderId: "901069370570",
  appId: "1:901069370570:web:58cd94f587c923b8c07033",
  measurementId: "G-5K83DC8KNF"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 匯出 App / Auth / Firestore 實例供其他檔案使用
export { app };
export const auth = getAuth(app);

/** PWA 儲存瘦身：Firestore IndexedDB 快取上限 20 MB，避免大量訓練/營養紀錄拖爆使用者硬碟 */
const FIRESTORE_CACHE_MAX_BYTES = 20 * 1024 * 1024;

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    cacheSizeBytes: FIRESTORE_CACHE_MAX_BYTES
  })
});