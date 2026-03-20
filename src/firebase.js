import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

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

export { app };
export const auth = getAuth(app);

/**
 * Firestore：離線優先 — IndexedDB 持久化快取 + 多分頁同步（Firebase JS SDK v9+ modular）
 * 須在其它 getFirestore() 呼叫前先初始化；已讀取的 Calendar 等資料在斷網時仍可由快取提供。
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
