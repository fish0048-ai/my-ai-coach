import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ 重要：請將下方的字串替換為你自己的 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA7GsUsqHeIEQ840XlJTdKKRx_Trg1FDE8",
  authDomain: "myaicoach-e38d7.firebaseapp.com",
  projectId: "myaicoach-e38d7",
  storageBucket: "myaicoach-e38d7.firebasestorage.app",
  messagingSenderId: "901069370570",
  appId: "1:901069370570:web:58cd94f587c923b8c07033"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 匯出工具給 App.jsx 使用
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);