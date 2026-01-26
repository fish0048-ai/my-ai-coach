import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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
export const db = getFirestore(app);

// 啟用離線持久化（Offline Persistence）
try {
  enableIndexedDbPersistence(db).then(() => {
    console.log('✅ Firebase 離線持久化已啟用');
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ 多個分頁開啟，離線持久化僅在主要分頁中啟用');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ 瀏覽器不支援離線持久化');
    } else {
      console.error('❌ 啟用離線持久化失敗:', err);
    }
  });
} catch (error) {
  console.error('❌ 初始化離線持久化時發生錯誤:', error);
}