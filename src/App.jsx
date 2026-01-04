import React, { useState, useEffect, useRef } from 'react';

// --- Firebase Imports ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  collection 
} from "firebase/firestore";

// --- Firebase Configuration ---
// ⚠️ 重要：請務必將下方的字串替換為您自己的 Firebase Config ⚠️
const firebaseConfig = {
   apiKey: "AIzaSyAzu9c8N1AK_2OhbEafQ3ul2EpjzL4mQp0",
  authDomain: "myaicoach-e38d7.firebaseapp.com",
  projectId: "myaicoach-e38d7",
  storageBucket: "myaicoach-e38d7.firebasestorage.app",
  messagingSenderId: "901069370570",
  appId: "1:901069370570:web:58cd94f587c923b8c07033"
};

// 初始化 Firebase 全域變數
let app = null;
let auth = null;
let firestoreDB = null;
let googleProvider = null;

try {
  // 只有在 Config 看起來正確時才初始化，避免立刻崩潰
  if (!firebaseConfig.apiKey.includes("請填入")) {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      firestoreDB = getFirestore(app);
      googleProvider = new GoogleAuthProvider();
  } else {
      console.warn("Firebase Config 尚未設定");
  }
} catch (e) {
  console.error("Firebase 初始化失敗:", e);
}

// --- Helper: Dynamic Script Loader ---
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// --- 內建圖標系統 ---
const ICONS = {
  dumbbell: <path d="m6.5 6.5 11 11m-12.01-1.01 1 1m16.01-16.01-1-1m-4 18 4-4m-19.01-4.99 4-4m-3 8 7-7m7 14 7-7" />,
  sparkles: <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />,
  calendar: <><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></>,
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  key: <><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
  check: <path d="M20 6 9 17l-5-5" />,
  save: <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />,
  loader2: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  alertcircle: <><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></>,
  usercircle: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></>,
  checkcircle2: <><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>,
  braincircuit: <><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></>,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  calculator: <><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></>,
  chevronleft: <path d="m15 18-6-6 6-6"/>,
  chevronright: <path d="m9 18 6-6-6-6"/>,
  trash2: <><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>,
  timer: <><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></>,
  zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>, 
  scale: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>
};

const Icon = ({ name, className = "w-5 h-5" }) => {
  const iconName = name ? name.toLowerCase().replace(/-/g, '') : '';
  const content = ICONS[iconName];
  if (!content) return null;
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {content}
    </svg>
  );
};

// --- Firebase Methods (Static to prevent re-renders and read leaks) ---
// ⚡ 關鍵修正：將這些方法移出 Hook，避免 useEffect 依賴改變導致無限迴圈
const firebaseMethods = { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection };

// --- Custom Hook: Firebase User Management ---
const useFirebase = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        const timer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("Auth listener timeout - forcing loading false");
                    return false;
                }
                return prev;
            });
        }, 2500);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const login = async () => {
        setAuthError(null);
        if (!auth) return alert("Firebase 設定未填寫正確，請檢查程式碼。");
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (e.code === 'auth/unauthorized-domain') {
                const domain = window.location.hostname;
                msg = `⛔ 網域未授權 (Unauthorized Domain)\n\nFirebase 為了安全，攔截了此登入請求。\n\n請複製目前的網域：\n${domain}\n\n並前往 Firebase Console -> Authentication -> Settings -> Authorized domains 將其加入白名單。`;
            } else if (e.code === 'auth/popup-closed-by-user') {
                return;
            }
            setAuthError(msg);
            alert(msg);
        }
    };

    const loginAnonymous = async () => {
        setAuthError(null);
        if (!auth) return alert("Firebase 設定未填寫正確。");
        try {
            await signInAnonymously(auth);
        } catch (e) {
            console.error("Anonymous login failed:", e);
            let msg = "訪客登入失敗: " + e.message;
            if (e.code === 'auth/admin-restricted-operation') {
                msg = "⛔ 訪客登入未啟用\n\n請前往 Firebase Console -> Authentication -> Sign-in method\n開啟「Anonymous (匿名)」登入選項。";
            }
            setAuthError(msg);
            alert(msg);
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (e) {
            console.error(e);
        }
    };

    return { 
        user, 
        loading, 
        login, 
        loginAnonymous, 
        logout, 
        db: firestoreDB,
        methods: firebaseMethods, // 使用靜態參考
        authError
    };
};

// --- Components (Modals) ---
const ApiKeyModal = ({ onSave, initialValue, onClose }) => {
    const [inputKey, setInputKey] = useState(initialValue || '');
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-center relative max-h-[85vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Icon name="key" className="w-8 h-8 text-emerald-500" /></div>
                <h2 className="text-xl font-bold text-white mb-2">設定 API Key</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">請輸入您的 Google Gemini API Key 以啟用 AI 功能。<br/><a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-emerald-500 hover:underline">前往取得免費 Key →</a></p>
                <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} placeholder="貼上你的 API Key (以 AIza 開頭)" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500 mb-4 text-center" />
                <button onClick={() => onSave(inputKey)} disabled={!inputKey.trim()} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-bold py-3 rounded-xl transition-all">儲存設定</button>
            </div>
        </div>
    );
};

const ProfileModal = ({ onSave, initialData, onClose }) => {
    const [formData, setFormData] = useState(initialData || { gender: '未設定', age: '', height: '', weight: '', notes: '', bench1rm: '', runSpm: '' });
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
                <div className="flex items-center gap-2 mb-6 text-emerald-500 font-bold justify-center"><Icon name="usercircle" className="w-6 h-6" /><span className="text-xl text-white">基本資料</span></div>
                <div className="space-y-4">
                    <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">性別</label><select name="gender" value={formData.gender} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500"><option value="未設定">請選擇</option><option value="男">男</option><option value="女">女</option><option value="其他">其他</option></select></div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">年齡</label><input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="歲" /></div>
                        <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">身高</label><input type="number" name="height" value={formData.height} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="cm" /></div>
                        <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">體重</label><input type="number" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="kg" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">臥推 1RM (kg)</label><input type="number" name="bench1rm" value={formData.bench1rm} onChange={handleChange} className="w-full bg-slate-800/50 border border-emerald-500/30 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="尚未測量" /></div>
                        <div><label className="block text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">跑步步頻 (SPM)</label><input type="number" name="runSpm" value={formData.runSpm} onChange={handleChange} className="w-full bg-slate-800/50 border border-emerald-500/30 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="尚未測量" /></div>
                    </div>
                    <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">身體狀況 / 備註</label><textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="例如：左膝蓋曾受傷..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[80px]" /></div>
                </div>
                <button onClick={() => onSave(formData)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all mt-6 shadow-lg shadow-emerald-500/20 active:scale-95">儲存資料</button>
            </div>
        </div>
    );
};

// --- Views (Main Features) ---

// 1. Generator View
const GeneratorView = ({ apiKey, requireKey, userProfile, db, user, methods }) => {
    const [goal, setGoal] = useState('');
    const [plan, setPlan] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);

    // Fetch previous plan from Firestore
    useEffect(() => {
        if (!db || !user) return;
        const fetchPlan = async () => {
            try {
                const docRef = methods.doc(db, "users", user.uid);
                const docSnap = await methods.getDoc(docRef);
                if (docSnap.exists() && docSnap.data().latestPlan) {
                    setPlan(docSnap.data().latestPlan);
                }
            } catch (e) { console.error("Error fetching plan:", e); }
        };
        fetchPlan();
    }, [db, user, methods]);

    const generatePlan = async () => {
        const currentKey = apiKey ? apiKey.trim() : "";
        if (!currentKey) { requireKey(); return; }
        if (!goal.trim()) return;
        setLoading(true); setError(null); setPlan('');

        let profilePrompt = "";
        if (userProfile) {
            const { gender, age, height, weight, notes, bench1rm, runSpm } = userProfile;
            profilePrompt = `【使用者資料】性別:${gender}, 年齡:${age}, 身高:${height}cm, 體重:${weight}kg
            ${bench1rm ? `- 實測臥推1RM: ${bench1rm}kg` : ''}
            ${runSpm ? `- 實測跑步步頻: ${runSpm} SPM` : ''}
            - 備註/傷病:${notes||"無"}
            請依此調整強度。`;
        }
        const systemPrompt = `你是一位專業健身教練。請根據目標與資料提供結構清晰的週課表(##標題, ###子標題, 條列式)。使用繁體中文。`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${profilePrompt}\n\n我的目標是：${goal}` }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] }
                    }),
                }
            );
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { 
                setPlan(text); 
                if (db && user) {
                    await methods.updateDoc(methods.doc(db, "users", user.uid), { latestPlan: text });
                }
            } else { throw new Error("AI 無法生成課表"); }
        } catch (err) {
            setError(String(err.message));
            if (String(err.message).includes('API key') || String(err.message).includes('key')) setTimeout(() => requireKey(), 2000);
        } finally { setLoading(false); }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(plan).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const renderPlan = (text) => text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-emerald-400 font-bold text-xl mt-6 mb-3 border-b border-emerald-500/20 pb-2">{line.replace('## ', '')}</h2>;
        if (line.startsWith('### ')) return <h3 key={i} className="text-slate-100 font-bold text-lg mt-4 mb-2">{line.replace('### ', '')}</h3>;
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) return <li key={i} className="text-slate-300 ml-4 list-disc mb-1">{line.trim().substring(2)}</li>;
        return <p key={i} className="text-slate-400 mb-2">{line}</p>;
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 sticky top-8">
                    <div className="flex items-center gap-2 mb-4"><div className="bg-emerald-500 p-2 rounded-lg"><Icon name="sparkles" className="w-4 h-4 text-black" /></div><h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider">目標設定</h2></div>
                    {userProfile && (
                        <div className="mb-4 text-xs text-slate-500 bg-black/20 p-3 rounded-xl border border-white/5 flex flex-wrap gap-2">
                            {userProfile.gender !== '未設定' && <span>{userProfile.gender}</span>}
                            {userProfile.age && <span>{userProfile.age}歲</span>}
                            {userProfile.bench1rm && <span className="text-emerald-400">1RM:{userProfile.bench1rm}kg</span>}
                            {userProfile.runSpm && <span className="text-emerald-400">SPM:{userProfile.runSpm}</span>}
                        </div>
                    )}
                    <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="例如：增肌減脂、半馬訓練..." className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[120px] mb-4" />
                    <button onClick={generatePlan} disabled={loading || !goal.trim()} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-95">{loading ? <Icon name="loader2" className="animate-spin w-5 h-5" /> : <Icon name="sparkles" className="w-5 h-5" />}<span>{loading ? "分析中..." : "開始生成"}</span></button>
                </div>
            </div>
            <div className="lg:col-span-8">
                {error && <div className="text-red-400 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-sm break-all"><Icon name="alertcircle" className="w-4 h-4 shrink-0" /><div><p className="font-bold">發生錯誤</p><p>{error}</p></div></div>}
                {plan ? (
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="px-8 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between"><div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest"><Icon name="calendar" className="w-4 h-4" />您的專屬週計畫</div><div className="flex gap-2"><button onClick={copyToClipboard} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${copySuccess ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-emerald-500 bg-white/5'}`}><Icon name="check" className="w-3 h-3" />{copySuccess ? "已複製" : "複製"}</button></div></div>
                        <div className="p-8 md:p-10 prose max-w-none">{renderPlan(plan)}</div>
                    </div>
                ) : !loading && <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center p-8 opacity-30"><Icon name="sparkles" className="w-12 h-12 mb-4" /><p className="text-sm">在左側輸入目標，開始生成課表</p></div>}
                {loading && <div className="h-full min-h-[400px] bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center p-8"><Icon name="loader2" className="w-16 h-16 animate-spin text-emerald-500 mb-4" /><p className="text-emerald-500 font-bold animate-pulse text-xs tracking-widest">AI 正在計算最佳路徑...</p></div>}
            </div>
        </div>
    );
};

// 2. Calendar View (Updated for Structured Inputs)
const CalendarView = ({ user, db, methods }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [logs, setLogs] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    
    // Form States
    const [logType, setLogType] = useState('general'); // general, run, weight
    const [editingText, setEditingText] = useState("");
    
    // Run States
    const [runData, setRunData] = useState({ time: '', pace: '', power: '' });
    
    // Weight States
    const [weightData, setWeightData] = useState({ action: '', sets: '', weight: '' });

    const quickTags = ['休息日', '瑜珈', '核心', '伸展'];

    useEffect(() => {
        if (!user || !db) return;
        const q = methods.collection(db, "users", user.uid, "logs");
        const unsubscribe = methods.onSnapshot(q, (snapshot) => {
            const newLogs = {};
            snapshot.forEach((doc) => {
                newLogs[doc.id] = doc.data(); 
            });
            setLogs(newLogs);
        });

        return () => unsubscribe();
    }, [user, db, methods]);

    const addTag = (tag) => {
        setEditingText(prev => {
            if (!prev) return `[${tag}] `;
            return prev.endsWith(' ') || prev.endsWith('\n') ? prev + `[${tag}] ` : prev + `\n[${tag}] `;
        });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const handleDateClick = (d) => { 
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d); 
        setSelectedDate(dateStr); 
        
        // Reset forms
        setLogType('general');
        setRunData({ time: '', pace: '', power: '' });
        setWeightData({ action: '', sets: '', weight: '' });
        
        const content = logs[dateStr]?.content || "";
        setEditingText(content);
        
        // Simple auto-detection could go here, but manual selection is safer for now
        if (content.includes('[跑步]')) setLogType('run');
        if (content.includes('[重訓]')) setLogType('weight');
    };
    
    const saveLog = async () => { 
        if (!user || !db || !selectedDate) return;
        setIsLoading(true);
        try {
            let finalContent = editingText;
            
            // Format structured data into string if in specific modes
            if (logType === 'run' && (runData.time || runData.pace)) {
                finalContent = `[跑步] ${runData.time ? `時間:${runData.time}分` : ''} ${runData.pace ? `| 配速:${runData.pace}` : ''} ${runData.power ? `| 功率:${runData.power}W` : ''}`;
            } else if (logType === 'weight' && weightData.action) {
                finalContent = `[重訓] ${weightData.action} ${weightData.sets ? `| ${weightData.sets}組` : ''} ${weightData.weight ? `| ${weightData.weight}kg` : ''}`;
            }

            const docRef = methods.doc(db, "users", user.uid, "logs", selectedDate);
            if (!finalContent.trim()) {
                await methods.deleteDoc(docRef);
            } else {
                await methods.setDoc(docRef, { 
                    content: finalContent, 
                    updatedAt: new Date() 
                }, { merge: true });
            }
            setSelectedDate(null); 
        } catch (e) {
            console.error("Save failed:", e);
            alert("儲存失敗，請檢查網路連線");
        } finally {
            setIsLoading(false);
        }
    };

    const renderCalendarGrid = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="p-2"></div>);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
            const logData = logs[dateStr];
            const hasLog = logData && logData.content && logData.content.trim().length > 0;
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            // Check log type for color coding
            let logColor = "text-slate-400";
            let dotColor = "bg-slate-500";
            if (hasLog) {
                if (logData.content.includes('[跑步]')) {
                    logColor = "text-sky-400";
                    dotColor = "bg-sky-500";
                } else if (logData.content.includes('[重訓]')) {
                    logColor = "text-orange-400";
                    dotColor = "bg-orange-500";
                } else {
                    logColor = "text-emerald-400";
                    dotColor = "bg-emerald-500";
                }
            }
            
            days.push(
                <div key={day} onClick={() => handleDateClick(day)} className={`grid grid-rows-[auto_1fr] min-h-[80px] md:min-h-[100px] border border-white/5 rounded-xl p-2 relative cursor-pointer hover:bg-white/5 group transition-all ${isToday ? 'bg-white/5 ring-1 ring-emerald-500/50' : 'bg-[#0a0a0a]'}`}>
                    <span className={`text-sm font-bold ${isToday ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300'}`}>{day}</span>
                    
                    {hasLog && (
                        <div className="mt-1 overflow-hidden">
                            <div className="flex items-center gap-1 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                            </div>
                            <div className={`text-[10px] truncate leading-tight ${logColor}`}>
                                {logData.content}
                            </div>
                        </div>
                    )}
                    
                    {!hasLog && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon name="plus" className="w-4 h-4 text-emerald-500/50" />
                        </div>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 bg-[#111] p-4 rounded-2xl border border-white/5 shadow-lg">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronleft" /></button>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">
                    <Icon name="calendar" className="w-5 h-5 text-emerald-500" />
                    {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
                </h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronright" /></button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center bg-[#111] p-3 rounded-xl border border-white/5">
                {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-xs text-slate-500 font-bold">{d}</div>)}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarGrid()}</div>

            {/* Modal */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-6 shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-white font-bold">
                                <span className='text-emerald-500'>{selectedDate}</span> 訓練紀錄
                            </div>
                            <button onClick={() => setSelectedDate(null)} className="text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
                        </div>
                        
                        {/* Type Switcher */}
                        <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                            <button onClick={() => setLogType('general')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'general' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="save" className="w-3 h-3" /> 一般</button>
                            <button onClick={() => setLogType('run')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'run' ? 'bg-sky-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="activity" className="w-3 h-3" /> 跑步</button>
                            <button onClick={() => setLogType('weight')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'weight' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="dumbbell" className="w-3 h-3" /> 重訓</button>
                        </div>

                        {/* Dynamic Form Content */}
                        <div className="mb-6 space-y-4">
                            {logType === 'general' && (
                                <>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {quickTags.map(tag => (
                                            <button key={tag} onClick={() => addTag(tag)} className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-white/5 rounded-lg text-xs font-medium transition-all">+ {tag}</button>
                                        ))}
                                    </div>
                                    <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} placeholder="輸入訓練筆記..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[120px] resize-none" autoFocus />
                                </>
                            )}

                            {logType === 'run' && (
                                <div className="space-y-3">
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">總時間 (分鐘)</label><input type="number" value={runData.time} onChange={(e) => setRunData({...runData, time: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="e.g. 30" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均配速 (分/公里)</label><input type="text" value={runData.pace} onChange={(e) => setRunData({...runData, pace: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="e.g. 5:30" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均功率 (瓦特)</label><input type="number" value={runData.power} onChange={(e) => setRunData({...runData, power: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="e.g. 200" /></div>
                                </div>
                            )}

                            {logType === 'weight' && (
                                <div className="space-y-3">
                                    <div><label className="text-xs text-orange-400 font-bold block mb-1">動作名稱</label><input type="text" value={weightData.action} onChange={(e) => setWeightData({...weightData, action: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. 深蹲" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-xs text-orange-400 font-bold block mb-1">組數</label><input type="number" value={weightData.sets} onChange={(e) => setWeightData({...weightData, sets: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. 5" /></div>
                                        <div><label className="text-xs text-orange-400 font-bold block mb-1">重量 (kg)</label><input type="number" value={weightData.weight} onChange={(e) => setWeightData({...weightData, weight: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. 100" /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex gap-3">
                            <button onClick={() => setSelectedDate(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">取消</button>
                            <button onClick={saveLog} disabled={isLoading} className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${logType === 'run' ? 'bg-sky-600 hover:bg-sky-500' : logType === 'weight' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                {isLoading ? <Icon name="loader2" className="animate-spin w-4 h-4" /> : <Icon name="check" className="w-4 h-4" />}
                                {isLoading ? "儲存中..." : "確認儲存"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 3. Analysis View
const AnalysisView = ({ apiKey, requireKey, userProfile, onUpdateProfile }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [mode, setMode] = useState('bench');
    const [weight, setWeight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [status, setStatus] = useState('載入模型中...');
    const [metricsHtml, setMetricsHtml] = useState(null);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [detectedStats, setDetectedStats] = useState(null);
    const [synced, setSynced] = useState(false);
    
    // Using refs instead of state for loop variables to avoid re-renders
    const detectorRef = useRef(null);
    const requestRef = useRef(null);
    const wristPathRef = useRef([]);
    const benchStatsRef = useRef({ reps: 0, lastY: 0, state: 'TOP', minY: Infinity, maxY: -Infinity, concentricStart: 0, repTimes: [] });
    const runDataRef = useRef({ kneeAngles: [], hipHeights: [], timestamps: [], steps: 0, lastKneePeak: 0, isKneeExtending: false });

    useEffect(() => {
        const initModel = async () => {
            try {
                // Load TensorFlow scripts dynamically from CDN
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core');
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter');
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl');
                await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection');

                if (window.tf) {
                    await window.tf.ready();
                    const model = window.poseDetection.SupportedModels.MoveNet;
                    const detectorConfig = { modelType: window.poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
                    detectorRef.current = await window.poseDetection.createDetector(model, detectorConfig);
                    setIsLoading(false);
                    setStatus('準備就緒');
                } else {
                    throw new Error("TensorFlow failed to load");
                }
            } catch (error) {
                setStatus(`載入失敗: ${String(error)}`);
            }
        };
        initModel();
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error("API 錯誤");
            return await response.json();
        } catch (err) {
            if (retries <= 0) throw err;
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, options, retries - 1, backoff * 2);
        }
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        if (videoRef.current) { videoRef.current.src = url; videoRef.current.load(); }
        resetAnalysis(); setIsPlaying(false); setStatus('準備就緒'); setMetricsHtml(null); setAiAnalysis(null); setAiError(null); setDetectedStats(null); setSynced(false);
    };

    const resetAnalysis = () => {
        wristPathRef.current = [];
        benchStatsRef.current = { reps: 0, lastY: 0, state: 'TOP', minY: Infinity, maxY: -Infinity, concentricStart: 0, repTimes: [] };
        runDataRef.current = { kneeAngles: [], hipHeights: [], timestamps: [], steps: 0, lastKneePeak: 0, isKneeExtending: false };
        const canvas = canvasRef.current, ctx = canvas?.getContext('2d'), video = videoRef.current;
        if (canvas && ctx && video) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(video, 0, 0, canvas.width, canvas.height); }
        setMetricsHtml(null); setAiAnalysis(null); setAiError(null); setDetectedStats(null); setSynced(false);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video || !video.src) return;
        if (video.paused) { video.play(); setIsPlaying(true); setStatus('AI 運算中...'); analyzeFrame(); }
        else { video.pause(); setIsPlaying(false); setStatus('暫停 (生成報告)'); cancelAnimationFrame(requestRef.current); generateReport(); }
    };

    const analyzeFrame = async () => {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || video.paused || video.ended) { if (video?.ended) { setIsPlaying(false); setStatus('分析完成'); generateReport(); } return; }
        const ctx = canvas.getContext('2d');
        let poses = [];
        try { 
            if (detectorRef.current) {
                poses = await detectorRef.current.estimatePoses(video); 
            }
        } catch (err) { console.error(err); }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (poses.length > 0) {
            const keypoints = poses[0].keypoints, timestamp = Date.now();
            drawSkeleton(ctx, keypoints, 0.4);
            if (mode === 'bench') analyzeBench(ctx, keypoints, timestamp);
            else analyzeRun(ctx, keypoints, timestamp);
        }
        requestRef.current = requestAnimationFrame(analyzeFrame);
    };

    const drawSkeleton = (ctx, keypoints, opacity) => {
        if (!window.poseDetection) return;
        const connections = window.poseDetection.util.getAdjacentPairs(window.poseDetection.SupportedModels.MoveNet);
        ctx.globalAlpha = opacity;
        for (const [i, j] of connections) {
            const kp1 = keypoints[i], kp2 = keypoints[j];
            if (kp1.score > 0.4 && kp2.score > 0.4) { ctx.beginPath(); ctx.moveTo(kp1.x, kp1.y); ctx.lineTo(kp2.x, kp2.y); ctx.lineWidth = 1; ctx.strokeStyle = 'white'; ctx.stroke(); }
        }
        ctx.globalAlpha = 1.0;
    };

    const analyzeBench = (ctx, keypoints, timestamp) => {
        const leftWrist = keypoints.find(k => k.name === 'left_wrist'), rightWrist = keypoints.find(k => k.name === 'right_wrist');
        let activeWrist = (leftWrist.score > rightWrist.score) ? leftWrist : rightWrist;
        if (activeWrist && activeWrist.score > 0.4) {
            const stats = benchStatsRef.current;
            wristPathRef.current.push({ x: activeWrist.x, y: activeWrist.y, t: timestamp });
            const y = activeWrist.y, threshold = 30;
            if (stats.minY === Infinity) stats.minY = y;
            if (stats.maxY === -Infinity) stats.maxY = y;
            if (y < stats.minY) stats.minY = y; 
            if (y > stats.maxY) stats.maxY = y;

            if (stats.state === 'TOP' && y > stats.minY + threshold) { stats.state = 'DOWN'; } 
            else if (stats.state === 'DOWN' && y < stats.lastY - 5) { stats.state = 'UP'; stats.concentricStart = timestamp; } 
            else if (stats.state === 'UP' && y < stats.minY + threshold) { stats.reps++; stats.state = 'TOP'; if (stats.concentricStart > 0) stats.repTimes.push(timestamp - stats.concentricStart); }
            stats.lastY = y;

            const path = wristPathRef.current;
            if (path.length > 1) { ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y); for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y); ctx.lineWidth = 4; ctx.strokeStyle = '#38bdf8'; ctx.stroke(); }
            ctx.beginPath(); ctx.arc(activeWrist.x, activeWrist.y, 8, 0, 2 * Math.PI); ctx.fillStyle = '#facc15'; ctx.fill();
        }
    };

    const analyzeRun = (ctx, keypoints, timestamp) => {
        const hip = keypoints[11], knee = keypoints[13], ankle = keypoints[15]; 
        if (hip.score > 0.4 && knee.score > 0.4 && ankle.score > 0.4) {
            ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(knee.x, knee.y); ctx.lineWidth = 5; ctx.strokeStyle = '#4ade80'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(knee.x, knee.y); ctx.lineTo(ankle.x, ankle.y); ctx.stroke();
            const radians = Math.atan2(ankle.y - knee.y, ankle.x - knee.x) - Math.atan2(hip.y - knee.y, hip.x - knee.x);
            let angle = Math.abs(radians * 180.0 / Math.PI); if (angle > 180.0) angle = 360 - angle;
            
            const data = runDataRef.current;
            data.kneeAngles.push(angle);
            data.hipHeights.push(hip.y);
            data.timestamps.push(timestamp);
            if (data.timestamps.length > 5) {
                if (data.isKneeExtending && angle < data.lastKneePeak) { if (data.lastKneePeak > 150) data.steps++; data.isKneeExtending = false; } 
                else if (angle > data.lastKneePeak) data.isKneeExtending = true;
            }
            data.lastKneePeak = angle;
        }
    };

    const generateAiReport = async () => {
        setAiError(null);
        const currentKey = apiKey ? apiKey.trim() : "";
        if (!currentKey) { alert("請先設定 Google Gemini API Key 才能使用深度分析功能。"); requireKey(); return; }
        setIsAiLoading(true);

        let analysisData = {};
        let profileInfo = userProfile ? `使用者資料：性別 ${userProfile.gender}, ${userProfile.age}歲, ${userProfile.height}cm, ${userProfile.weight}kg` : "";

        if (mode === 'bench') {
            const stats = benchStatsRef.current;
            const path = wristPathRef.current;
            if (path.length > 0) {
                let xValues = path.map(p => p.x);
                analysisData = { exercise: "Bench Press", reps: stats.reps, weight: weight || "0", avgVelocityMs: stats.repTimes.length > 0 ? (stats.repTimes.reduce((a, b) => a + b, 0) / stats.repTimes.length).toFixed(0) : 0, stability: (Math.max(...xValues) - Math.min(...xValues)).toFixed(0) };
            }
        } else {
            const data = runDataRef.current;
            if (data.timestamps.length > 30) {
                const duration = (data.timestamps[data.timestamps.length - 1] - data.timestamps[0]) / 1000;
                const spm = Math.round((data.steps * 2 / duration) * 60) || 0;
                analysisData = { exercise: "Running", cadenceSPM: spm, maxKnee: Math.round(Math.max(...data.kneeAngles)) };
            }
        }

        const systemPrompt = `你是一位運動生物力學專家。請根據數據與資料分析並提供建議。結構：1. ## 綜合評分 2. ### 優點 3. ### 問題 4. ### 訓練建議。使用繁體中文 Markdown。`;

        try {
            const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `${profileInfo}\n模式：${mode}\n數據：${JSON.stringify(analysisData)}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } }) });
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) setAiAnalysis(text); else throw new Error("無內容");
        } catch (err) { setAiError(String(err.message)); if(String(err.message).includes('API')) setTimeout(requireKey, 2000); } 
        finally { setIsAiLoading(false); }
    };

    const generateReport = () => {
        let html = '';
        let menuItems = [];
        let stats = null;

        if (mode === 'bench') {
            const s = benchStatsRef.current;
            const path = wristPathRef.current;
            if (path.length < 20) return;
            let xValues = path.map(p => p.x);
            let stability = (Math.max(...xValues) - Math.min(...xValues)) < 30 ? "優秀" : "普通";
            const avgTimeMs = s.repTimes.length > 0 ? s.repTimes.reduce((a, b) => a + b, 0) / s.repTimes.length : 0;
            const avgTimeSec = (avgTimeMs / 1000).toFixed(2);
            let w = parseFloat(weight) || 0;
            let rm = w > 0 && s.reps > 0 ? Math.round(w * (1 + s.reps / 30)) : 0;
            
            stats = { type: 'bench', rm, stability };
            setDetectedStats(stats);

            let zone = "一般肌力"; if (avgTimeSec < 0.5) zone = "爆發力"; else if (avgTimeSec > 1.3) zone = "肌力/力竭";
            if (stability !== '優秀') menuItems.push({ name: "暫停式臥推", desc: "增加底部控制力", set: "3x5" });
            
            html = `<div class="space-y-4"><div class="text-sky-400 font-bold border-b border-slate-600 pb-2">🏋️ 臥推報告</div><div class="grid grid-cols-2 gap-2"><div class="metric-card"><div class="text-xs text-slate-400">平均速度</div><div class="text-xl font-bold text-white">${avgTimeSec} s</div></div><div class="metric-card"><div class="text-xs text-slate-400">區間</div><div class="text-base font-bold text-emerald-400">${zone}</div></div>${rm > 0 ? `<div class="metric-card" style="border-left-color: #facc15"><div class="text-xs text-slate-400">預估 1RM</div><div class="text-xl font-bold text-white">${rm} kg</div></div>` : ''}</div></div>`;
        } else {
            const data = runDataRef.current;
            if (data.timestamps.length < 30) return;
            const duration = (data.timestamps[data.timestamps.length - 1] - data.timestamps[0]) / 1000;
            const spm = Math.round((data.steps * 2 / duration) * 60) || 0;
            const maxKnee = Math.max(...data.kneeAngles);
            
            stats = { type: 'run', spm, knee: Math.round(maxKnee) };
            setDetectedStats(stats);

            if (spm < 170) menuItems.push({ name: "節拍器跑", desc: "設定180bpm", set: "10min" });
            html = `<div class="space-y-4"><div class="text-sky-400 font-bold border-b border-slate-600 pb-2">🏃 跑姿報告</div><div class="grid grid-cols-2 gap-2"><div class="metric-card"><div class="text-xs text-slate-400">步頻</div><div class="text-xl font-bold text-white">${spm}</div></div><div class="metric-card"><div class="text-xs text-slate-400">觸地膝角</div><div class="text-xl font-bold text-white">${Math.round(maxKnee)}°</div></div></div></div>`;
        }

        const menuHtml = menuItems.map(item => `<div class="border-b border-slate-700 pb-2 mb-2"><div class="flex justify-between"><span class="text-emerald-400 text-xs font-bold">${item.name}</span><span class="text-[10px] bg-slate-700 px-1 rounded">${item.set}</span></div></div>`).join('');
        html += `<div class="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mt-2"><div class="text-xs font-bold text-slate-300 mb-2">📋 推薦菜單</div>${menuHtml}</div>`;
        setMetricsHtml(html);
    };

    const syncToProfile = () => {
        if (!detectedStats) return;
        const today = new Date().toISOString().split('T')[0];
        let note = "";
        let updates = {};

        if (mode === 'bench') {
            if (detectedStats.rm > 0) updates.bench1rm = detectedStats.rm;
            note = `${today} [臥推分析] 1RM:${detectedStats.rm}kg, 穩定度:${detectedStats.stability}`;
        } else {
            if (detectedStats.spm > 0) updates.runSpm = detectedStats.spm;
            note = `${today} [跑姿分析] 步頻:${detectedStats.spm} SPM, 膝角:${detectedStats.knee}`;
        }

        onUpdateProfile(updates, note);
        setSynced(true);
    };

    const renderAiReport = (text) => {
        const formatLine = (c) => c.split(/(\*\*.*?\*\*)/g).map((p, i) => p.startsWith('**') ? <strong key={i} className="text-emerald-300 font-bold">{p.slice(2, -2)}</strong> : p);
        return text.split('\n').map((l, i) => {
            const t = l.trim(); if (!t) return <div key={i} className="h-2"></div>;
            if (l.startsWith('## ')) return <div key={i} className="mt-6 mb-3 border-b border-emerald-500/30 pb-2"><h2 className="text-xl font-black text-emerald-400 flex items-center gap-2"><Icon name="checkcircle2" className="w-5 h-5" />{l.replace('## ', '')}</h2></div>;
            if (l.startsWith('### ')) return <h3 key={i} className="text-white font-bold text-base mt-4 mb-2 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>{l.replace('### ', '')}</h3>;
            if (t.startsWith('- ') || t.startsWith('* ')) return <li key={i} className="text-slate-300 ml-4 list-disc mb-1 pl-1 marker:text-emerald-500/50">{formatLine(t.substring(2))}</li>;
            return <p key={i} className="text-slate-400 text-sm leading-relaxed mb-1">{formatLine(l)}</p>;
        });
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div><label className="block text-sm font-bold text-emerald-500 mb-2">1. 上傳影片</label><input type="file" accept="video/*" onChange={handleFile} className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer bg-slate-800 rounded-lg p-1"/></div>
                    <div><label className="block text-sm font-bold text-emerald-500 mb-2">2. 選擇模式</label><select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg p-2.5"><option value="bench">🏋️ 臥推 (VBT & 軌跡)</option><option value="run">🏃 跑姿 (步頻 & 經濟性)</option></select></div>
                    <div><label className="block text-sm font-bold text-emerald-500 mb-2">3. 輸入重量 (選填)</label><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="kg" className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg w-full p-2.5" /></div>
                </div>
                <div className="flex gap-3 justify-center border-t border-slate-800 pt-4">
                    <button onClick={togglePlay} disabled={isLoading || !videoRef.current?.src} className="px-8 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed">{isPlaying ? "暫停 / 生成報告" : "播放 / 開始分析"}</button>
                    <button onClick={resetAnalysis} disabled={isLoading} className="px-8 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition">重置</button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                
                {/* 1. Video Container: Force 16:9 aspect ratio */}
                <div className="relative w-full flex-1 aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    {isLoading && <div className="loading-overlay"><div className="spinner mb-3"></div><span className="text-sm font-light text-white">載入 AI 模型中...</span></div>}
                    {!videoRef.current?.src && !isLoading && <p className="text-slate-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">請上傳影片以開始</p>}
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-contain opacity-0" onLoadedMetadata={() => { canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight; resetAnalysis(); }} playsInline muted></video>
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain"></canvas>
                </div>

                {/* 2. Report Container: Fixed max height to prevent overflow */}
                <div className="w-full lg:w-96 flex-shrink-0">
                    <div className="bg-[#111] p-5 rounded-xl shadow-lg border border-white/10 h-[500px] lg:max-h-[600px] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-800 pb-2 flex justify-between items-center">分析結果<span className={`text-xs px-2 py-1 rounded ${status.includes('中') ? 'bg-yellow-900 text-yellow-200 animate-pulse' : 'bg-slate-800 text-slate-300'}`}>{status}</span></h3>
                        {metricsHtml ? (
                            <>
                                <div dangerouslySetInnerHTML={{ __html: metricsHtml }} />
                                {detectedStats && (
                                    <button 
                                        onClick={syncToProfile} 
                                        disabled={synced}
                                        className={`w-full mt-3 font-bold py-2 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm ${synced ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                                    >
                                        <Icon name={synced ? "check" : "save"} className="w-4 h-4" />
                                        {synced ? "已同步至個人檔案" : "同步數據至個人檔案"}
                                    </button>
                                )}
                                {!aiAnalysis && !isAiLoading && !aiError && (
                                    <button onClick={generateAiReport} className="w-full mt-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95">
                                        <Icon name="sparkles" className="w-4 h-4" /> 取得 AI 深度生物力學報告
                                    </button>
                                )}
                                {isAiLoading && (
                                    <div className="mt-4 p-4 bg-slate-800/50 rounded-xl text-center border border-indigo-500/30">
                                        <Icon name="loader2" className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                                        <p className="text-xs text-indigo-400 font-bold animate-pulse">AI 生物力學專家正在診斷中...</p>
                                    </div>
                                )}
                                {aiError && (
                                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2">
                                        <Icon name="alertcircle" className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{aiError}</span>
                                    </div>
                                )}
                                {aiAnalysis && (
                                    <div className="mt-4 p-4 bg-slate-800/80 rounded-xl border border-purple-500/30 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold border-b border-purple-500/20 pb-2">
                                            <Icon name="braincircuit" className="w-5 h-5" /> AI 專家診斷
                                        </div>
                                        <div className="markdown-report">
                                            {renderAiReport(aiAnalysis)}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center text-slate-500 py-10 text-sm">點擊播放開始蒐集數據...<br/><br/><span className="text-xs block">📸 拍攝建議：<br/>臥推：側面 45 度<br/>跑姿：正側面全身</span></div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- App Root ---
const App = () => {
    const { user, loading, login, loginAnonymous, logout, db, methods, authError } = useFirebase(); // Added loginAnonymous
    const [currentTab, setCurrentTab] = useState('generator');
    const [userApiKey, setUserApiKey] = useState(localStorage.getItem('gemini_key') || '');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        if (!user || !db) return;
        const unsub = methods.onSnapshot(methods.doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
            else methods.setDoc(methods.doc(db, "users", user.uid), { email: user.isAnonymous ? 'guest' : user.email, joined: new Date() });
        });
        return () => unsub();
    }, [user, db, methods]);

    const handleUpdateProfile = async (data, note) => {
        if (!db || !user) return;
        try {
            await methods.updateDoc(methods.doc(db, "users", user.uid), data);
            // note 可以選擇性寫入日誌集合，此處省略以保持簡潔
            setShowProfileModal(false);
        } catch(e) { console.error("Update profile failed:", e); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Icon name="loader2" className="w-10 h-10 text-emerald-500 animate-spin" /></div>;
    
    if (!user) return (
        <div className="min-h-screen flex items-center justify-center bg-black/90 p-4">
            <div className="bg-[#111] border border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Icon name="dumbbell" className="w-10 h-10 text-emerald-500" /></div>
                <h1 className="text-2xl font-black text-white mb-2">AI 健身教練 Pro</h1>
                <p className="text-slate-400 text-sm mb-8">雲端全端版 • 資料永久保存</p>
                <button onClick={login} className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all mb-3">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    使用 Google 帳號登入
                </button>
                <button onClick={loginAnonymous} className="w-full bg-slate-800 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all text-sm">
                    訪客試用 (無需登入)
                </button>

                {/* 增加未設定 Config 的提示 */}
                {firebaseConfig.apiKey.includes("請填入") && (
                    <div className="mt-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-left">
                        <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-2"><Icon name="alertcircle" className="w-4 h-4" /> 設定未完成</p>
                        <p className="text-red-300 text-xs leading-relaxed">請打開 <code>src/App.jsx</code>，將 <code>firebaseConfig</code> 內的內容替換為您 Firebase 專案的設定。</p>
                    </div>
                )}
                 
                 {/* Helper to copy current domain for Firebase Auth */}
                 <div className="mt-6 p-3 bg-slate-800 rounded-xl text-xs text-left border border-slate-700">
                    <p className="text-slate-400 mb-2 font-bold flex items-center gap-1"><Icon name="key" className="w-3 h-3"/> 授權網域 (Authorized Domain)</p>
                    <p className="text-slate-500 mb-2">若登入出現 "Unauthorized domain" 錯誤，請複製下方網址至 Firebase Console → Authentication → Settings → Authorized domains。</p>
                    <div className="flex items-center gap-2 bg-black/50 p-2 rounded border border-slate-700">
                        <code className="text-emerald-400 flex-1 overflow-x-auto whitespace-nowrap selection:bg-emerald-900">
                            {window.location.hostname}
                        </code>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.hostname);
                                alert("網域已複製！請去 Firebase Console 貼上。");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                        >
                            複製
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const effectiveApiKey = userApiKey.trim();

    return (
        <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto pb-32">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 p-2 rounded-xl"><Icon name="dumbbell" className="text-black" /></div>
                    <div><h1 className="text-xl font-bold">AI Coach <span className="text-emerald-500">Cloud</span></h1><p className="text-xs text-slate-500">{user.email || 'Guest'}</p></div>
                </div>
                <div className="flex gap-2">
                    <button onClick={()=>setShowProfileModal(true)} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300"><Icon name="user" className="w-5 h-5" /></button>
                    <button onClick={()=>setShowKeyModal(true)} className={`p-2 rounded-lg ${effectiveApiKey ? 'bg-slate-800 text-slate-300' : 'bg-red-900 text-red-200 animate-pulse'}`}><Icon name="key" className="w-5 h-5" /></button>
                    <button onClick={logout} className="p-2 bg-slate-800 rounded-lg hover:text-red-400 text-slate-300"><Icon name="logout" className="w-5 h-5" /></button>
                </div>
            </header>

            <main>
                {currentTab === 'generator' && <GeneratorView apiKey={effectiveApiKey} requireKey={()=>setShowKeyModal(true)} userProfile={userProfile} db={db} user={user} methods={methods} />}
                {currentTab === 'calendar' && <CalendarView user={user} db={db} methods={methods} />} {/* Fixed prop passing */}
                {currentTab === 'analysis' && <AnalysisView apiKey={effectiveApiKey} requireKey={()=>setShowKeyModal(true)} userProfile={userProfile} onUpdateProfile={handleUpdateProfile} />}
                {currentTab === 'tools' && <ToolsView />}
            </main>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/10 p-2 rounded-2xl flex gap-4 shadow-2xl backdrop-blur-md z-40">
                <button onClick={()=>setCurrentTab('generator')} className={`p-3 rounded-xl transition-all ${currentTab==='generator'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="sparkles" /></button>
                <button onClick={()=>setCurrentTab('calendar')} className={`p-3 rounded-xl transition-all ${currentTab==='calendar'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="calendar" /></button>
                <button onClick={()=>setCurrentTab('analysis')} className={`p-3 rounded-xl transition-all ${currentTab==='analysis'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="activity" /></button>
                <button onClick={()=>setCurrentTab('tools')} className={`p-3 rounded-xl transition-all ${currentTab==='tools'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="wrench" /></button>
            </div>

            {showKeyModal && <ApiKeyModal onSave={(k)=>{localStorage.setItem('gemini_key', k); setUserApiKey(k); setShowKeyModal(false)}} initialValue={userApiKey} onClose={()=>setShowKeyModal(false)} />}
            {showProfileModal && <ProfileModal onSave={(data)=>handleUpdateProfile(data)} initialData={userProfile} onClose={()=>setShowProfileModal(false)} />}
        </div>
    );
};

export default App;