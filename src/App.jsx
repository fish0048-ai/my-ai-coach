import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "firebase/app";
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

// --- Global Variables (Dynamic Init) ---
let app = null;
let auth = null;
let db = null;
let googleProvider = null;

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

// --- 肌肉部位小圖示 SVG 路徑定義 (用於列表) ---
const MUSCLE_PATHS = {
  '胸部': <path d="M4 7c0-2 3-4 8-4s8 2 8 4c0 5-4 10-8 13c-4-3-8-8-8-13z M12 3v17" />,
  '背部': <path d="M4 4l8 2 8-2l-2 12l-6 6l-6-6z M12 6v14 M4 4l3 6 M20 4l-3 6" />,
  '腿部': <path d="M5 2h4v10l-2 10h-3l-2-10v-10z M15 2h4v10l-2 10h-3l-2-10v-10z M9 2h6" />,
  '肩膀': <path d="M2 8c0-3 3-5 10-5s10 2 10 5v4l-4 2l-6-2l-6 2l-4-2z" />,
  '手臂': <path d="M6 4c0-2 2-3 4-2c3 1 5 4 5 7v10h-4v-6c0-2-2-3-4-3z M18 4c0-2-2-3-4-2c-3 1-5 4-5 7v10h4v-6c0-2 2-3 4-3z" />,
  '核心': <path d="M7 4h10v16h-10z M7 9h10 M7 14h10 M12 4v16" />,
  '其他': <circle cx="12" cy="12" r="9" />
};

const MUSCLE_COLORS = {
  '胸部': 'text-rose-400 bg-rose-400/20',
  '背部': 'text-blue-400 bg-blue-400/20',
  '腿部': 'text-purple-400 bg-purple-400/20',
  '肩膀': 'text-orange-400 bg-orange-400/20',
  '手臂': 'text-cyan-400 bg-cyan-400/20',
  '核心': 'text-yellow-400 bg-yellow-400/20',
  '其他': 'text-slate-400 bg-slate-400/20',
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
  scale: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3.3-1.2 1-2.4 1.5-3.2"/>,
  utensils: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  hash: <><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></>,
  plus: <path d="M5 12h14M12 5v14" />,
  linechart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>
};

const Icon = ({ name, className = "w-5 h-5", customPath }) => {
  if (customPath) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            {customPath}
        </svg>
    );
  }
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

// --- Body Heatmap Component ---
const BodyHeatmap = ({ muscleVolumes }) => {
    // Determine max volume to normalize opacity (0.2 to 1.0)
    const maxVol = Math.max(...Object.values(muscleVolumes), 1);
    
    const getOpacity = (part) => {
        const vol = muscleVolumes[part] || 0;
        if (vol === 0) return 0.1; // Base opacity for untrained
        // Scale between 0.3 and 1.0 based on volume
        return 0.3 + (vol / maxVol) * 0.7; 
    };

    const getColor = (part) => {
        const vol = muscleVolumes[part] || 0;
        return vol > 0 ? '#10b981' : '#334155'; // Emerald-500 vs Slate-700
    };

    const getTooltip = (part) => `${part}: ${muscleVolumes[part]?.toLocaleString() || 0} kg`;

    return (
        <div className="relative w-full h-64 flex justify-center gap-8">
            {/* Front View */}
            <svg viewBox="0 0 100 200" className="h-full w-auto overflow-visible">
                <g transform="translate(50, 0)">
                    {/* Head */}
                    <circle cx="0" cy="20" r="12" fill="#334155" />
                    
                    {/* Shoulders (Front) */}
                    <path 
                        d="M-25 35 Q-15 25 0 28 Q15 25 25 35 L30 45 L-30 45 Z" 
                        fill={getColor('肩膀')} 
                        opacity={getOpacity('肩膀')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('肩膀')}</title></path>

                    {/* Chest */}
                    <path 
                        d="M-20 45 L20 45 L15 70 L-15 70 Z" 
                        fill={getColor('胸部')} 
                        opacity={getOpacity('胸部')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('胸部')}</title></path>

                    {/* Arms (Biceps) */}
                    <path 
                        d="M-30 45 L-40 80 L-30 80 L-20 45 Z M30 45 L40 80 L30 80 L20 45 Z" 
                        fill={getColor('手臂')} 
                        opacity={getOpacity('手臂')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('手臂')}</title></path>

                    {/* Core (Abs) */}
                    <path 
                        d="M-15 70 L15 70 L15 100 L-15 100 Z" 
                        fill={getColor('核心')} 
                        opacity={getOpacity('核心')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('核心')}</title></path>

                    {/* Legs (Front Quads) */}
                    <path 
                        d="M-15 100 L-5 100 L-5 160 L-15 160 Z M15 100 L5 100 L5 160 L15 160 Z" 
                        fill={getColor('腿部')} 
                        opacity={getOpacity('腿部')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('腿部')}</title></path>
                </g>
                <text x="50" y="190" textAnchor="middle" fill="#94a3b8" fontSize="10">正面</text>
            </svg>

            {/* Back View */}
            <svg viewBox="0 0 100 200" className="h-full w-auto overflow-visible">
                <g transform="translate(50, 0)">
                    {/* Head */}
                    <circle cx="0" cy="20" r="12" fill="#334155" />

                    {/* Shoulders (Rear) */}
                    <path 
                        d="M-28 38 Q0 30 28 38 L25 45 L-25 45 Z" 
                        fill={getColor('肩膀')} 
                        opacity={getOpacity('肩膀')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('肩膀')}</title></path>

                    {/* Back (Lats/Traps) */}
                    <path 
                        d="M-25 45 L25 45 L15 90 L-15 90 Z" 
                        fill={getColor('背部')} 
                        opacity={getOpacity('背部')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('背部')}</title></path>

                    {/* Arms (Triceps) */}
                    <path 
                        d="M-30 45 L-40 75 L-32 75 L-25 45 Z M30 45 L40 75 L32 75 L25 45 Z" 
                        fill={getColor('手臂')} 
                        opacity={getOpacity('手臂')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('手臂')}</title></path>

                     {/* Legs (Hamstrings/Calves) */}
                     <path 
                        d="M-15 100 L-5 100 L-5 170 L-15 170 Z M15 100 L5 100 L5 170 L15 170 Z" 
                        fill={getColor('腿部')} 
                        opacity={getOpacity('腿部')}
                        className="transition-all duration-500 hover:opacity-100 cursor-help"
                    ><title>{getTooltip('腿部')}</title></path>
                </g>
                <text x="50" y="190" textAnchor="middle" fill="#94a3b8" fontSize="10">背面</text>
            </svg>
        </div>
    );
};

// --- Firebase Methods (Static) ---
const firebaseMethods = { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection };

// --- Setup Screen: 第一次使用時設定 Firebase ---
const FirebaseSetup = ({ onComplete }) => {
    const [configJson, setConfigJson] = useState('');
    const [error, setError] = useState(null);

    const handleSave = () => {
        try {
            let cleanString = configJson.trim();
            const firstBrace = cleanString.indexOf('{');
            const lastBrace = cleanString.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanString = cleanString.substring(firstBrace, lastBrace + 1);
            } else {
                throw new Error("無法找到物件大括號 { }，請確認複製範圍。");
            }

            let config;
            try {
                const parseFn = new Function(`return ${cleanString};`);
                config = parseFn();
            } catch (evalErr) {
                const sanitized = cleanString.replace(/[\u00A0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g, ' ');
                const parseFnRetry = new Function(`return ${sanitized};`);
                config = parseFnRetry();
            }
            
            if (!config || !config.apiKey || !config.projectId) {
                throw new Error("設定檔解析成功，但缺少必要欄位 (apiKey, projectId)");
            }

            localStorage.setItem('firebase_config', JSON.stringify(config));
            onComplete();
        } catch (e) {
            console.error(e);
            setError("設定失敗: " + e.message + "\n請確認您複製的是完整的 const firebaseConfig = { ... } 內容");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                        <Icon name="zap" className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">連接您的資料庫</h1>
                    <p className="text-slate-400 text-sm">請貼上您的 Firebase Config 物件內容。</p>
                </div>

                <div className="mb-6">
                    <label className="block text-slate-300 text-xs font-bold uppercase mb-2">Firebase Config</label>
                    <textarea 
                        value={configJson}
                        onChange={(e) => setConfigJson(e.target.value)}
                        className="w-full h-48 bg-black/50 border border-white/10 rounded-xl p-4 text-xs font-mono text-emerald-400 outline-none focus:border-emerald-500 transition-colors resize-none"
                        placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "...",\n  ...\n};`}
                    />
                    {error && <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400 text-xs">
                        <Icon name="alertcircle" className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{error}</span>
                    </div>}
                </div>

                <button onClick={handleSave} disabled={!configJson.trim()} className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20">
                    儲存並啟動 App
                </button>
                
                <div className="mt-6 text-center">
                    <a href="https://console.firebase.google.com/" target="_blank" className="text-xs text-slate-500 hover:text-white flex items-center justify-center gap-1 transition-colors">
                        如何取得? 前往 Firebase Console <Icon name="chevronright" className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
};

// --- Custom Hook: Firebase User Management ---
const useFirebase = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        const savedConfig = localStorage.getItem('firebase_config');
        if (savedConfig) {
            try {
                const config = JSON.parse(savedConfig);
                if (!getApps().length) {
                    app = initializeApp(config);
                } else {
                    app = getApp();
                }
                
                auth = getAuth(app);
                db = getFirestore(app);
                googleProvider = new GoogleAuthProvider();
                
                setIsConfigured(true);
            } catch (e) {
                console.error("Firebase Init Error:", e);
                localStorage.removeItem('firebase_config');
                setIsConfigured(false);
            }
        } else {
            setIsConfigured(false);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, [isConfigured]);

    const login = async () => {
        setAuthError(null);
        if (!auth) return;
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (e.code === 'auth/unauthorized-domain') {
                const domain = window.location.hostname;
                msg = `網域未授權：請複製 ${domain} 至 Firebase Console。`;
            } else if (e.code === 'auth/popup-closed-by-user') {
                return;
            }
            setAuthError(msg);
            alert(msg);
        }
    };

    const loginAnonymous = async () => {
        setAuthError(null);
        if (!auth) return;
        try {
            await signInAnonymously(auth);
        } catch (e) {
            setAuthError(e.message);
            alert("訪客登入失敗: " + e.message);
        }
    };

    const logout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
        } catch (e) { console.error(e); }
    };

    const resetConfig = () => {
        if(confirm("確定要清除 Firebase 設定嗎？這將會登出並重置應用程式。")) {
            localStorage.removeItem('firebase_config');
            window.location.reload();
        }
    };

    return { 
        user, 
        loading, 
        login, 
        loginAnonymous, 
        logout, 
        db,
        methods: firebaseMethods,
        authError,
        isConfigured,
        setIsConfigured, 
        resetConfig
    };
};

// --- Components (Modals & Views) ---
const ApiKeyModal = ({ onSave, initialValue, onClose }) => {
    const [inputKey, setInputKey] = useState(initialValue || '');
    const handleClearKey = () => {
        localStorage.removeItem('gemini_key');
        setInputKey('');
        onSave('');
        alert("API Key 已清除");
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-8 shadow-2xl text-center relative max-h-[85vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><Icon name="key" className="w-8 h-8 text-emerald-500" /></div>
                <h2 className="text-xl font-bold text-white mb-2">設定 Gemini API Key</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">請輸入您的 Google Gemini API Key 以啟用 AI 功能。</p>
                <input type="password" value={inputKey} onChange={(e) => setInputKey(e.target.value)} placeholder="貼上 API Key (AIza...)" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500 mb-4 text-center" />
                <div className="flex gap-2">
                    <button onClick={handleClearKey} className="flex-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 font-bold py-3 rounded-xl transition-all text-sm">清除 Key</button>
                    <button onClick={() => onSave(inputKey)} disabled={!inputKey.trim()} className="flex-[2] bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-bold py-3 rounded-xl transition-all">儲存設定</button>
                </div>
            </div>
        </div>
    );
};

const ProfileModal = ({ onSave, initialData, onClose }) => {
    const [formData, setFormData] = useState(initialData || { gender: '未設定', age: '', height: '', weight: '', notes: '', supplements: '', bench1rm: '', runSpm: '', tdee: '' });
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
                    <div><label className="block text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">每日消耗 TDEE (kcal)</label><input type="number" name="tdee" value={formData.tdee} onChange={handleChange} className="w-full bg-slate-800/50 border border-orange-500/30 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="尚未測量" /></div>
                    <div><label className="block text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">目前使用的藥物與補品</label><textarea name="supplements" value={formData.supplements} onChange={handleChange} placeholder="例如：乳清蛋白、肌酸、綜合維他命..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-purple-500 min-h-[60px]" /></div>
                    <div><label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">身體狀況 / 備註</label><textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="例如：左膝蓋曾受傷..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[80px]" /></div>
                </div>
                <button onClick={() => onSave(formData)} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-all mt-6 shadow-lg shadow-emerald-500/20 active:scale-95">儲存資料</button>
            </div>
        </div>
    );
};

// --- Views ---

// 1. Dashboard View
const DashboardView = ({ userLogs, userProfile }) => {
    // Dynamic Stats Range with Offset
    const [statsRange, setStatsRange] = useState('week'); // 'week', 'month', 'year'
    const [dateOffset, setDateOffset] = useState(0);

    // Reset offset when changing range type
    const handleRangeChange = (type) => {
        setStatsRange(type);
        setDateOffset(0);
    };

    const handlePrev = () => setDateOffset(prev => prev - 1);
    const handleNext = () => setDateOffset(prev => prev + 1);

    // Calculate Date Range & Label
    const { startDate, endDate, dateLabel } = useMemo(() => {
        const now = new Date();
        let start, end, label;

        if (statsRange === 'week') {
            // Monday based
            const currentDay = now.getDay();
            const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday
            const monday = new Date(now);
            monday.setDate(diff + (dateOffset * 7));
            monday.setHours(0,0,0,0);
            
            start = new Date(monday);
            end = new Date(monday);
            end.setDate(end.getDate() + 7);
            
            // For display label
            const endDisp = new Date(end);
            endDisp.setDate(endDisp.getDate() - 1);
            
            label = `${start.getMonth()+1}/${start.getDate()} - ${endDisp.getMonth()+1}/${endDisp.getDate()}`;
        } else if (statsRange === 'month') {
            start = new Date(now.getFullYear(), now.getMonth() + dateOffset, 1);
            end = new Date(now.getFullYear(), now.getMonth() + dateOffset + 1, 1);
            label = `${start.getFullYear()}年 ${start.getMonth()+1}月`;
        } else { // year
            start = new Date(now.getFullYear() + dateOffset, 0, 1);
            end = new Date(now.getFullYear() + dateOffset + 1, 0, 1);
            label = `${start.getFullYear()}年`;
        }
        return { startDate: start, endDate: end, dateLabel: label };
    }, [statsRange, dateOffset]);

    // Calculate Stats based on range
    const totalLogs = Object.keys(userLogs).length; // Total ever
    const sortedDates = Object.keys(userLogs).sort();

    let periodCount = 0;
    let periodRunDistance = 0;
    const runTrend = [];
    const muscleVolumes = {}; // For heatmap

    sortedDates.forEach(dateStr => {
        const log = userLogs[dateStr];
        const logDate = new Date(dateStr);
        
        // Check if log is within the selected range [start, end)
        if (logDate >= startDate && logDate < endDate) {
            periodCount++;
            
            if (log.type === 'run' && log.data?.distance) {
                const dist = parseFloat(log.data.distance);
                if (!isNaN(dist)) {
                    periodRunDistance += dist;
                    runTrend.push(dist);
                }
            } else if (log.type === 'weight' && log.data && Array.isArray(log.data)) {
                // Calculate Muscle Volumes
                log.data.forEach(ex => {
                    const vol = (parseFloat(ex.weight) || 0) * (parseFloat(ex.sets) || 0) * (parseFloat(ex.reps) || 0);
                    if (vol > 0 && ex.part) {
                        muscleVolumes[ex.part] = (muscleVolumes[ex.part] || 0) + vol;
                    }
                });
            }
        }
    });

    const bmiValue = userProfile?.height && userProfile?.weight 
        ? (userProfile.weight / Math.pow(userProfile.height/100, 2)).toFixed(1) 
        : '--';
    
    // Helper to get range label
    const getRangeLabel = () => {
        switch(statsRange) {
            case 'week': return '本週';
            case 'month': return '本月';
            case 'year': return '今年';
            default: return '本週';
        }
    };

    const renderRunChart = () => {
        if (runTrend.length < 2) return <div className="text-slate-500 text-xs text-center py-8">累積更多跑步紀錄以顯示圖表</div>;
        
        const maxVal = Math.max(...runTrend);
        const points = runTrend.map((val, idx) => {
            const x = (idx / (runTrend.length - 1)) * 100;
            const y = 100 - (val / maxVal) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="relative h-24 w-full mt-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>
                    <polyline
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        points={points}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="drop-shadow-lg"
                    />
                </svg>
            </div>
        );
    };

    return (
        <div className="pb-24 max-w-lg mx-auto">
            {/* Range Selector */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-4">
                {['week', 'month', 'year'].map(r => (
                    <button 
                        key={r}
                        onClick={() => handleRangeChange(r)} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statsRange === r ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {r === 'week' ? '週' : r === 'month' ? '月' : '年'}
                    </button>
                ))}
            </div>

            {/* Date Navigator */}
            <div className="flex items-center justify-between mb-6 bg-black/40 rounded-xl p-2 border border-white/5">
                <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronleft" /></button>
                <span className="text-sm font-bold text-white tracking-wider">{dateLabel}</span>
                <button onClick={handleNext} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronright" /></button>
            </div>

            {/* Muscle Heatmap (New!) */}
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl mb-6">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-4">
                    <Icon name="dumbbell" className="w-5 h-5" /> 肌群訓練熱力圖
                </div>
                <BodyHeatmap muscleVolumes={muscleVolumes} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2 font-bold text-xs uppercase tracking-wider">
                        <Icon name="activity" className="w-4 h-4" /> 期間訓練
                    </div>
                    <div className="text-3xl font-black text-white">{periodCount} <span className="text-sm font-normal text-slate-500">次</span></div>
                </div>
                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="flex items-center gap-2 text-orange-400 mb-2 font-bold text-xs uppercase tracking-wider">
                        <Icon name="scale" className="w-4 h-4" /> BMI 指數
                    </div>
                    <div className="text-3xl font-black text-white">{bmiValue}</div>
                </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl mb-6">
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold">
                        <Icon name="linechart" className="w-5 h-5" /> 跑步里程 ({dateLabel})
                    </div>
                    <span className="text-2xl font-black text-white">{periodRunDistance.toFixed(1)} <span className="text-sm text-slate-500">km</span></span>
                 </div>
                 {renderRunChart()}
            </div>

             <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                <div className="text-slate-400 font-bold mb-4 text-xs uppercase tracking-wider">歷史活動紀錄</div>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {sortedDates.slice().reverse().map(date => (
                        <div key={date} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                            <span className="text-emerald-500 font-bold text-xs shrink-0 mr-4">{date}</span>
                            <span className="text-slate-300 text-xs truncate flex-1 text-right">{userLogs[date].content}</span>
                        </div>
                    ))}
                    {sortedDates.length === 0 && <div className="text-center text-slate-600 text-xs py-2">尚無紀錄</div>}
                </div>
             </div>
        </div>
    );
};

// 2. Generator View
const GeneratorView = ({ apiKey, requireKey, userProfile, db, user, methods, userLogs }) => {
    const [goal, setGoal] = useState('');
    const [plan, setPlan] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [genType, setGenType] = useState('workout');

    useEffect(() => {
        if (!db || !user) return;
        const fetchPlan = async () => {
            try {
                const docRef = methods.doc(db, "users", user.uid);
                const docSnap = await methods.getDoc(docRef);
                if (docSnap.exists()) {
                    const fieldName = genType === 'workout' ? 'latestPlan' : 'latestDiet';
                    if(docSnap.data()[fieldName]) setPlan(docSnap.data()[fieldName]);
                    else setPlan('');
                }
            } catch (e) { console.error("Error fetching plan:", e); }
        };
        fetchPlan();
    }, [db, user, methods, genType]);

    const generatePlan = async () => {
        const currentKey = apiKey ? apiKey.trim() : "";
        if (!currentKey) { requireKey(); return; }
        if (!goal.trim()) return;
        setLoading(true); setError(null); setPlan('');

        let profilePrompt = "";
        let logsSummary = "";

        if (userLogs && Object.keys(userLogs).length > 0) {
            const sortedDates = Object.keys(userLogs).sort().reverse().slice(0, 7); 
            logsSummary = "\n\n【最近 7 天訓練紀錄】(供參考)：\n" + sortedDates.map(date => `- ${date}: ${userLogs[date].content}`).join('\n');
        }

        if (userProfile) {
            const { gender, age, height, weight, notes, bench1rm, runSpm, tdee, supplements } = userProfile;
            profilePrompt = `【使用者資料】性別:${gender}, 年齡:${age}, 身高:${height}cm, 體重:${weight}kg
            ${bench1rm ? `- 1RM:${bench1rm}kg` : ''} 
            ${runSpm ? `- 跑步步頻:${runSpm}` : ''}
            ${tdee ? `- TDEE:${tdee} kcal` : ''}
            ${supplements ? `- 使用藥物/補品:${supplements}` : ''}
            - 備註/傷病:${notes||"無"}
            ${logsSummary}
            請依此調整強度。`;
        }
        
        let systemPrompt = "";
        if (genType === 'workout') {
            systemPrompt = `你是一位專業健身教練。請根據使用者資料與近期紀錄，設計一週訓練課表。
            要求：
            1. 參考「最近訓練紀錄」來安排適當的負荷（若最近練很勤則安排恢復，若久未練則安排適應期）。
            2. 使用 Markdown 格式，包含 ## 標題。
            3. 如果有表格，請使用 Markdown Table 格式 (| 標題 |...)。`;
        } else {
             systemPrompt = `你是一位專業營養師。請根據資料(特別是TDEE與近期運動消耗)設計一日三餐飲食建議與熱量分配。
             目標：${goal}。
             要求：
             1. 針對使用者的 TDEE 計算熱量缺口或盈餘。
             2. 參考運動紀錄來建議碳水與蛋白質攝取時機。
             3. 考慮使用者目前的補品/藥物狀況給予建議。
             4. 使用 Markdown 格式，列出熱量與營養素估算。`;
        }

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
            
            if (data.error) throw new Error(data.error.message || "Gemini API Error");
            
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) { 
                setPlan(text); 
                if (db && user) {
                    const fieldName = genType === 'workout' ? 'latestPlan' : 'latestDiet';
                    await methods.updateDoc(methods.doc(db, "users", user.uid), { [fieldName]: text });
                }
            } else { throw new Error("AI 無法生成內容"); }
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

    // 🌟 Enhanced Markdown Renderer with Table Support
    const renderPlan = (text) => {
        const lines = text.split('\n');
        const elements = [];
        let tableBuffer = [];
        let inTable = false;

        const formatText = (str) => {
            const parts = str.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index} className="text-emerald-400 font-bold">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        const renderTable = (rows, keyPrefix) => {
            if (rows.length < 2) return null;
            
            const headers = rows[0].split('|').map(c => c.trim()).filter(c => c);
            const dataRows = rows.slice(2).map(row => 
                row.split('|').map(c => c.trim()).filter(c => c !== '') 
            ).filter(row => row.length > 0);

            return (
                <div key={keyPrefix} className="my-6 overflow-x-auto rounded-xl border border-white/10 shadow-xl">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-emerald-400 uppercase bg-black/40 border-b border-white/10">
                            <tr>
                                {headers.map((h, i) => <th key={i} className="px-6 py-3 whitespace-nowrap">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {dataRows.map((row, i) => (
                                <tr key={i} className="bg-white/5 border-b border-white/5 hover:bg-white/10 transition-colors">
                                    {row.map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap">{formatText(cell)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        };

        lines.forEach((line, i) => {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('|')) {
                if (!inTable) inTable = true;
                tableBuffer.push(trimmed);
            } else {
                if (inTable) {
                    if (tableBuffer.length > 0) elements.push(renderTable(tableBuffer, `table-${i}`));
                    tableBuffer = [];
                    inTable = false;
                }

                if (trimmed === '') {
                    elements.push(<div key={i} className="h-2"></div>);
                } else if (trimmed.startsWith('## ')) {
                    elements.push(<h2 key={i} className="text-emerald-400 font-bold text-xl mt-8 mb-4 border-b border-emerald-500/30 pb-2">{trimmed.replace('## ', '')}</h2>);
                } else if (trimmed.startsWith('### ')) {
                    elements.push(<h3 key={i} className="text-white font-bold text-lg mt-6 mb-3 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>{trimmed.replace('### ', '')}</h3>);
                } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    elements.push(<li key={i} className="text-slate-300 ml-4 list-disc mb-1 pl-1 marker:text-emerald-500/50">{formatText(trimmed.substring(2))}</li>);
                } else if (trimmed === '---') {
                    elements.push(<hr key={i} className="border-white/10 my-6" />);
                } else {
                    elements.push(<p key={i} className="text-slate-400 mb-2 leading-relaxed">{formatText(line)}</p>);
                }
            }
        });

        if (tableBuffer.length > 0) {
            elements.push(renderTable(tableBuffer, 'table-end'));
        }

        return elements;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
            <div className="lg:col-span-4 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 sticky top-8">
                     {/* Toggle Switch */}
                    <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                        <button onClick={() => setGenType('workout')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${genType === 'workout' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="dumbbell" className="w-4 h-4" /> 運動課表</button>
                        <button onClick={() => setGenType('diet')} className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${genType === 'diet' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="utensils" className="w-4 h-4" /> 飲食菜單</button>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                         <div className={`p-2 rounded-lg ${genType === 'workout' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                            <Icon name={genType === 'workout' ? "sparkles" : "flame"} className="w-4 h-4 text-black" />
                        </div>
                        <h2 className="text-slate-200 text-sm font-bold uppercase tracking-wider">{genType === 'workout' ? '訓練目標' : '飲食目標'}</h2>
                    </div>
                    {userProfile && (
                        <div className="mb-4 text-xs text-slate-500 bg-black/20 p-3 rounded-xl border border-white/5 flex flex-wrap gap-2">
                            {userProfile.gender !== '未設定' && <span>{userProfile.gender}</span>}
                            {userProfile.bench1rm && <span className="text-emerald-400">1RM:{userProfile.bench1rm}kg</span>}
                            {userProfile.tdee && <span className="text-orange-400">TDEE:{userProfile.tdee}</span>}
                        </div>
                    )}
                    <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={genType === 'workout' ? "例如：增肌減脂、半馬訓練..." : "例如：低碳飲食、增肌高蛋白..."} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[120px] mb-4" />
                    <button onClick={generatePlan} disabled={loading || !goal.trim()} className={`w-full text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-colors ${genType === 'workout' ? 'bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500' : 'bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500'}`}>{loading ? <Icon name="loader2" className="animate-spin w-5 h-5" /> : <Icon name="sparkles" className="w-5 h-5" />}<span>{loading ? "分析中..." : "開始生成"}</span></button>
                </div>
            </div>
            <div className="lg:col-span-8">
                {error && <div className="text-red-400 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2 text-sm break-all"><Icon name="alertcircle" className="w-4 h-4 shrink-0" /><div><p className="font-bold">發生錯誤</p><p>{error}</p></div></div>}
                {plan ? (
                    <div className="bg-[#111] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="px-8 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between"><div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-widest"><Icon name="calendar" className="w-4 h-4" />您的專屬{genType === 'workout' ? '計畫' : '菜單'}</div><div className="flex gap-2"><button onClick={copyToClipboard} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${copySuccess ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-emerald-500 bg-white/5'}`}><Icon name="check" className="w-3 h-3" />{copySuccess ? "已複製" : "複製"}</button></div></div>
                        <div className="p-8 md:p-10 prose max-w-none">{renderPlan(plan)}</div>
                    </div>
                ) : !loading && <div className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-center p-8 opacity-30"><Icon name={genType === 'workout' ? "dumbbell" : "utensils"} className="w-12 h-12 mb-4" /><p className="text-sm">在左側輸入目標，開始生成</p></div>}
                {loading && <div className="h-full min-h-[400px] bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center p-8"><Icon name="loader2" className="w-16 h-16 animate-spin text-emerald-500 mb-4" /><p className="text-emerald-500 font-bold animate-pulse text-xs tracking-widest">AI 正在計算最佳路徑...</p></div>}
            </div>
        </div>
    );
};

// 3. Calendar View
const CalendarView = ({ user, db, methods, logs }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form States
    const [logType, setLogType] = useState('general'); 
    const [runData, setRunData] = useState({ time: '', distance: '', pace: '', power: '' }); 
    const [weightData, setWeightData] = useState({ part: '胸部', action: '', sets: '', weight: '', reps: '' }); 
    const [editingText, setEditingText] = useState("");
    const [weightExercises, setWeightExercises] = useState([]);
    const quickTags = ['休息日', '瑜珈', '核心', '伸展'];

    // Auto-detect muscle group based on keyword
    const detectMuscleGroup = (name) => {
        if (!name) return '其他';
        const n = name.toLowerCase();
        if (n.match(/臥推|飛鳥|伏地挺身|胸|push up|bench press|chest|夾胸/)) return '胸部';
        if (n.match(/划船|拉背|引體向上|硬舉|背|row|pull up|deadlift|back|pull-down|pulldown/)) return '背部';
        if (n.match(/深蹲|腿推|分腿蹲|弓箭步|腿|squat|leg|lunge|calf|提踵/)) return '腿部';
        if (n.match(/推舉|平舉|面拉|肩|shoulder|press|deltoid/)) return '肩膀';
        if (n.match(/二頭|三頭|彎舉|臂|arm|curl|tricep|bicep|dip/)) return '手臂';
        if (n.match(/卷腹|棒式|核心|腹|plank|crunch|core|abs|sit up/)) return '核心';
        return '其他';
    };

    const addTag = (tag) => {
        setEditingText(prev => {
            if (!prev) return `[${tag}] `;
            return prev.endsWith(' ') || prev.endsWith('\n') ? prev + `[${tag}] ` : prev + `\n[${tag}] `;
        });
    };

    const handleRunBlur = (field) => {
        let { distance, time, pace, power } = runData;
        let d = parseFloat(distance);
        let t = parseFloat(time);
        
        let p = 0;
        if (pace && pace.includes(':')) {
            const [min, sec] = pace.split(':').map(Number);
            p = min + (sec / 60);
        } else {
            p = parseFloat(pace);
        }

        if (field === 'distance' || field === 'time') {
            if (d > 0 && t > 0) {
                const paceMin = Math.floor(t / d);
                const paceSec = Math.round(((t / d) - paceMin) * 60);
                pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
            } else if (d > 0 && p > 0 && !t) {
                t = d * p;
                time = t.toFixed(1);
            }
        } else if (field === 'pace') {
            if (d > 0 && p > 0) {
                t = d * p;
                time = t.toFixed(1);
            } else if (t > 0 && p > 0 && !d) {
                d = t / p;
                distance = d.toFixed(2);
            }
        }
        setRunData({ distance, time, pace, power });
    };

    const handleActionChange = (e) => {
        const action = e.target.value;
        const part = detectMuscleGroup(action);
        // Only auto-switch part if user hasn't manually selected one (or if it's currently default/empty)
        // For simplicity, let's always suggest, user can change back.
        setWeightData({ ...weightData, action, part });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const handleDateClick = (d) => { 
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d); 
        setSelectedDate(dateStr); 
        
        setLogType('general');
        setRunData({ time: '', distance: '', pace: '', power: '' }); 
        setWeightData({ part: '胸部', action: '', sets: '', weight: '', reps: '' });
        setWeightExercises([]);
        setEditingText("");

        const log = logs[dateStr];
        if (log) {
            setEditingText(log.content || "");
            if (log.type === 'run') {
                setLogType('run');
                setRunData(log.data || { time: '', distance: '', pace: '', power: '' });
            } else if (log.type === 'weight') {
                setLogType('weight');
                if (Array.isArray(log.data)) {
                    setWeightExercises(log.data);
                } else if (log.data) {
                    setWeightExercises([log.data]);
                }
            } else {
                setLogType('general');
            }
        }
    };

    const handleAddWeightExercise = () => {
        if (!weightData.action) return;
        const newExercise = { ...weightData };
        // Auto Calculate Volume
        if (newExercise.weight && newExercise.sets && newExercise.reps) {
            newExercise.volume = parseFloat(newExercise.weight) * parseFloat(newExercise.sets) * parseFloat(newExercise.reps);
        }
        setWeightExercises([...weightExercises, newExercise]);
        // Reset form but keep part same for convenience
        setWeightData({ ...weightData, action: '', sets: '', weight: '', reps: '' }); 
    };

    const handleRemoveWeightExercise = (index) => {
        const newList = [...weightExercises];
        newList.splice(index, 1);
        setWeightExercises(newList);
    };
    
    const saveLog = async () => { 
        if (!user || !db || !selectedDate) return;
        setIsLoading(true);
        try {
            let finalContent = editingText;
            let dataToSave = { 
                type: logType,
                updatedAt: new Date()
            };

            if (logType === 'general') {
                if (!editingText.trim()) {
                    await methods.deleteDoc(methods.doc(db, "users", user.uid, "logs", selectedDate));
                    setSelectedDate(null);
                    setIsLoading(false);
                    return;
                }
                dataToSave.content = editingText;
            } else if (logType === 'run') {
                dataToSave.data = runData;
                const parts = [];
                if (runData.distance) parts.push(`${runData.distance}km`);
                if (runData.time) parts.push(`${runData.time}min`);
                if (runData.pace) parts.push(`${runData.pace}/km`);
                
                dataToSave.content = parts.join(' | ') || '跑步訓練';
            } else if (logType === 'weight') {
                let currentExercises = [...weightExercises];
                if (weightData.action) {
                    const ex = {...weightData};
                    if (ex.weight && ex.sets && ex.reps) {
                        ex.volume = parseFloat(ex.weight) * parseFloat(ex.sets) * parseFloat(ex.reps);
                    }
                    currentExercises.push(ex);
                }

                if (currentExercises.length === 0) {
                     await methods.deleteDoc(methods.doc(db, "users", user.uid, "logs", selectedDate));
                     setSelectedDate(null);
                     setIsLoading(false);
                     return;
                }

                dataToSave.data = currentExercises;
                const summary = currentExercises.map(ex => `${ex.action}`).join(', ');
                dataToSave.content = `[重訓] ${summary}`;
            }

            await methods.setDoc(methods.doc(db, "users", user.uid, "logs", selectedDate), dataToSave, { merge: true });
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
            const hasLog = !!logData;
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            
            days.push(
                <div key={day} onClick={() => handleDateClick(day)} className={`grid grid-rows-[auto_1fr] min-h-[80px] md:min-h-[100px] border border-white/5 rounded-xl p-2 relative cursor-pointer hover:bg-white/5 group transition-all ${isToday ? 'bg-white/5 ring-1 ring-emerald-500/50' : 'bg-[#0a0a0a]'}`}>
                    <span className={`text-sm font-bold ${isToday ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300'}`}>{day}</span>
                    {hasLog && (
                        <div className="mt-1 overflow-hidden flex flex-col gap-1">
                            {logData.type === 'run' ? (
                                <div className="bg-sky-500/20 text-sky-300 px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 truncate">
                                    <Icon name="activity" className="w-3 h-3 flex-shrink-0" />
                                    <span>{logData.content}</span>
                                </div>
                            ) : logData.type === 'weight' ? (
                                <div className="bg-orange-500/20 text-orange-300 px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 truncate">
                                    <Icon name="dumbbell" className="w-3 h-3 flex-shrink-0" />
                                    <span>{logData.content.replace('[重訓] ', '')}</span>
                                </div>
                            ) : (
                                <div className="bg-slate-700/50 text-slate-300 px-1.5 py-1 rounded text-[10px] truncate border-l-2 border-slate-500">
                                    {logData.content}
                                </div>
                            )}
                        </div>
                    )}
                    {!hasLog && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="plus" className="w-4 h-4 text-emerald-500/50" /></div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 bg-[#111] p-4 rounded-2xl border border-white/5 shadow-lg"><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronleft" /></button><h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2"><Icon name="calendar" className="w-5 h-5 text-emerald-500" />{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</h2><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"><Icon name="chevronright" /></button></div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center bg-[#111] p-3 rounded-xl border border-white/5">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-xs text-slate-500 font-bold">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarGrid()}</div>
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-6 shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2 text-white font-bold"><span className='text-emerald-500'>{selectedDate}</span> 訓練紀錄</div><button onClick={() => setSelectedDate(null)} className="text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button></div>
                        <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                            <button onClick={() => setLogType('general')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'general' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="save" className="w-3 h-3" /> 一般</button>
                            <button onClick={() => setLogType('run')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'run' ? 'bg-sky-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="activity" className="w-3 h-3" /> 跑步</button>
                            <button onClick={() => setLogType('weight')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${logType === 'weight' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}><Icon name="dumbbell" className="w-3 h-3" /> 重訓</button>
                        </div>
                        <div className="mb-6 space-y-4">
                            {logType === 'general' && (<><div className="flex flex-wrap gap-2 mb-2">{quickTags.map(tag => <button key={tag} onClick={() => addTag(tag)} className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-white/5 rounded-lg text-xs font-medium transition-all">+ {tag}</button>)}</div><textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} placeholder="輸入訓練筆記..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[120px] resize-none" autoFocus /></>)}
                            
                            {logType === 'run' && (<div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">總距離 (km)</label><input type="number" value={runData.distance} onChange={(e) => setRunData({...runData, distance: e.target.value})} onBlur={() => handleRunBlur('distance')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="5" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">總時間 (分鐘)</label><input type="number" value={runData.time} onChange={(e) => setRunData({...runData, time: e.target.value})} onBlur={() => handleRunBlur('time')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="30" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均配速 (分:秒/km)</label><input type="text" value={runData.pace} onChange={(e) => setRunData({...runData, pace: e.target.value})} onBlur={() => handleRunBlur('pace')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="5:30" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均功率 (W)</label><input type="number" value={runData.power} onChange={(e) => setRunData({...runData, power: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="200" /></div>
                                </div>
                            </div>)}
                            
                            {logType === 'weight' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2 mb-2">
                                        <div className="flex-[2]">
                                            <label className="text-xs text-orange-400 font-bold block mb-1">動作名稱</label>
                                            <input type="text" value={weightData.action} onChange={handleActionChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="例如：深蹲" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-orange-400 font-bold block mb-1">部位</label>
                                            <select value={weightData.part} onChange={(e) => setWeightData({...weightData, part: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500">
                                                <option>胸部</option><option>背部</option><option>腿部</option><option>肩膀</option><option>手臂</option><option>核心</option><option>其他</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <label className="text-xs text-orange-400 font-bold block mb-1">重量(kg)</label>
                                            <input type="number" value={weightData.weight} onChange={(e) => setWeightData({...weightData, weight: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="100" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-orange-400 font-bold block mb-1">組數</label>
                                            <input type="number" value={weightData.sets} onChange={(e) => setWeightData({...weightData, sets: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="5" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-orange-400 font-bold block mb-1">次數(Reps)</label>
                                            <input type="number" value={weightData.reps} onChange={(e) => setWeightData({...weightData, reps: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="10" />
                                        </div>
                                        <div className="flex items-end">
                                            <button onClick={handleAddWeightExercise} className="bg-orange-500 hover:bg-orange-400 text-black p-3 rounded-xl shadow-lg active:scale-95 transition-all"><Icon name="plus" className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                    
                                    {/* Added Exercises List with Icons */}
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                        {weightExercises.map((ex, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${MUSCLE_COLORS[ex.part] || 'text-slate-400 bg-slate-400/20'}`}>
                                                            <Icon name="" className="w-3 h-3" customPath={MUSCLE_PATHS[ex.part]} />
                                                            {ex.part}
                                                        </span>
                                                        <span className="text-sm font-bold text-white">{ex.action}</span>
                                                    </div>
                                                    <span className="text-xs text-slate-400 mt-1 pl-1">
                                                        <span className="text-orange-400 font-bold">{ex.weight}kg</span> x {ex.sets}組 x {ex.reps}下 
                                                        {ex.volume ? <span className="text-slate-500 ml-1"> (總量: {ex.volume}kg)</span> : ''}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleRemoveWeightExercise(i)} className="text-slate-500 hover:text-red-400 p-2"><Icon name="trash2" className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                        {weightExercises.length === 0 && <div className="text-center text-slate-600 text-xs py-2">尚未加入動作</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3"><button onClick={() => setSelectedDate(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">取消</button><button onClick={saveLog} disabled={isLoading} className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${logType === 'run' ? 'bg-sky-600 hover:bg-sky-500' : logType === 'weight' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{isLoading ? <Icon name="loader2" className="animate-spin w-4 h-4" /> : <Icon name="check" className="w-4 h-4" />}{isLoading ? "儲存中..." : "確認儲存"}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. Analysis View (Fixed Video Height + Min Height)
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
                
                {/* 1. Video Container: Force 16:9 aspect ratio and min height */}
                <div className="relative w-full flex-1 aspect-video min-h-[300px] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
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

// --- 工具箱 (Multiple Tools) ---
const ToolsView = ({ userProfile, onUpdateProfile }) => {
    const [activeTool, setActiveTool] = useState('bmi');
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60); // 預設 60 秒
    const [timerType, setTimerType] = useState('rest'); // 'rest' | 'tabata'
    const timerRef = useRef(null);
    
    // BMI State
    const [height, setHeight] = useState(''); 
    const [weight, setWeight] = useState(''); 
    const [bmi, setBmi] = useState(null); 
    const [bmiStatus, setBmiStatus] = useState('');

    // TDEE State
    const [tdeeAge, setTdeeAge] = useState('');
    const [tdeeGender, setTdeeGender] = useState('male');
    const [tdeeHeight, setTdeeHeight] = useState('');
    const [tdeeWeight, setTdeeWeight] = useState('');
    const [activityLevel, setActivityLevel] = useState('1.2');
    const [tdee, setTdee] = useState(null);

    // 1RM State
    const [liftWeight, setLiftWeight] = useState('');
    const [reps, setReps] = useState('');
    const [oneRm, setOneRm] = useState(null);

    // Init from Profile
    useEffect(() => {
        if (userProfile) {
            if (userProfile.height) {
                setHeight(userProfile.height);
                setTdeeHeight(userProfile.height);
            }
            if (userProfile.weight) {
                setWeight(userProfile.weight);
                setTdeeWeight(userProfile.weight);
            }
            if (userProfile.age) setTdeeAge(userProfile.age);
            if (userProfile.gender) setTdeeGender(userProfile.gender === '女' ? 'female' : 'male');
        }
    }, [userProfile]);

    // Timer Logic
    useEffect(() => {
        if (isTimerRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            // 可以加入音效提示
            alert("時間到！");
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTimerRunning, timeLeft]);

    const toggleTimer = () => {
        setIsTimerRunning(!isTimerRunning);
    };

    const resetTimer = (seconds) => {
        setIsTimerRunning(false);
        setTimeLeft(seconds);
    };

    // BMI Calculation
    const calculateBMI = () => { 
        if (!height || !weight) return; 
        const h = parseFloat(height) / 100; 
        const w = parseFloat(weight); 
        const value = (w / (h * h)).toFixed(1); 
        setBmi(value); 
        if (value < 18.5) setBmiStatus('體重過輕'); 
        else if (value < 24) setBmiStatus('健康體位'); 
        else if (value < 27) setBmiStatus('過重'); 
        else setBmiStatus('肥胖'); 
    };

    // TDEE Calculation (Mifflin-St Jeor Equation)
    const calculateTDEE = () => {
        if (!tdeeAge || !tdeeHeight || !tdeeWeight) return;
        const w = parseFloat(tdeeWeight);
        const h = parseFloat(tdeeHeight);
        const a = parseFloat(tdeeAge);
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr = tdeeGender === 'male' ? bmr + 5 : bmr - 161;
        setTdee(Math.round(bmr * parseFloat(activityLevel)));
    };

    // 1RM Calculation (Epley Formula)
    const calculate1RM = () => {
        if (!liftWeight || !reps) return;
        const w = parseFloat(liftWeight);
        const r = parseFloat(reps);
        setOneRm(Math.round(w * (1 + r / 30)));
    };

    // Save Functions
    const saveTDEE = () => {
        if (tdee && onUpdateProfile) {
            onUpdateProfile({ tdee: tdee }, `Updated TDEE: ${tdee} kcal`);
            alert("TDEE 已儲存至個人檔案！");
        }
    };

    const save1RM = () => {
        if (oneRm && onUpdateProfile) {
            onUpdateProfile({ bench1rm: oneRm }, `Updated 1RM: ${oneRm} kg`);
            alert("1RM 已儲存至個人檔案！");
        }
    };

    return (
        <div className="pb-24 max-w-lg mx-auto">
             {/* Tool Selector Tabs */}
             <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl mb-8">
                <button onClick={() => setActiveTool('bmi')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTool === 'bmi' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <Icon name="scale" className="w-4 h-4" /> BMI
                </button>
                <button onClick={() => setActiveTool('tdee')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTool === 'tdee' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <Icon name="zap" className="w-4 h-4" /> TDEE
                </button>
                <button onClick={() => setActiveTool('1rm')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTool === '1rm' ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <Icon name="dumbbell" className="w-4 h-4" /> 1RM
                </button>
                 <button onClick={() => setActiveTool('timer')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTool === 'timer' ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}>
                    <Icon name="timer" className="w-4 h-4" /> Timer
                </button>
            </div>

            {/* Timer Tool */}
            {activeTool === 'timer' && (
                <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300 text-center">
                    <div className="flex items-center gap-2 mb-6 text-purple-500 font-bold justify-center">
                        <Icon name="timer" className="w-6 h-6" />
                        <span className="text-xl text-white">訓練計時器</span>
                    </div>

                    <div className="text-8xl font-black text-white mb-8 tracking-tighter tabular-nums">
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-8">
                        <button onClick={() => resetTimer(30)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm font-bold">30s</button>
                        <button onClick={() => resetTimer(60)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm font-bold">60s</button>
                        <button onClick={() => resetTimer(90)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm font-bold">90s</button>
                    </div>

                    <button 
                        onClick={toggleTimer} 
                        className={`w-full font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all ${isTimerRunning ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-purple-500 text-black hover:bg-purple-400'}`}
                    >
                        {isTimerRunning ? "暫停計時" : "開始計時"}
                    </button>
                </div>
            )}

            {/* BMI Calculator */}
            {activeTool === 'bmi' && (
                <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-6 text-emerald-500 font-bold justify-center">
                        <Icon name="scale" className="w-6 h-6" />
                        <span className="text-xl text-white">BMI 計算機</span>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">身高 (cm)</label>
                            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center text-lg outline-none focus:ring-1 focus:ring-emerald-500" placeholder="175" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">體重 (kg)</label>
                            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center text-lg outline-none focus:ring-1 focus:ring-emerald-500" placeholder="70" />
                        </div>
                    </div>

                    <button onClick={calculateBMI} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/10 active:scale-95 mb-8 transition-all">開始計算</button>

                    {bmi && (
                        <div className="text-center animate-in slide-in-from-bottom-2">
                            <p className="text-slate-400 text-sm mb-1">您的 BMI 指數</p>
                            <div className="text-6xl font-black text-white mb-2 tracking-tighter">{bmi}</div>
                            <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${bmiStatus === '健康體位' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-yellow-500/20 text-yellow-500'}`}>{bmiStatus}</div>
                        </div>
                    )}
                </div>
            )}

            {/* TDEE Calculator */}
            {activeTool === 'tdee' && (
                <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-6 text-orange-500 font-bold justify-center">
                        <Icon name="zap" className="w-6 h-6" />
                        <span className="text-xl text-white">TDEE 熱量計算</span>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-slate-400 text-xs font-bold uppercase mb-2 block">性別</label><select value={tdeeGender} onChange={(e) => setTdeeGender(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white"><option value="male">男</option><option value="female">女</option></select></div>
                            <div><label className="text-slate-400 text-xs font-bold uppercase mb-2 block">年齡</label><input type="number" value={tdeeAge} onChange={(e) => setTdeeAge(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center" placeholder="25" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-slate-400 text-xs font-bold uppercase mb-2 block">身高 (cm)</label><input type="number" value={tdeeHeight} onChange={(e) => setTdeeHeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center" placeholder="175" /></div>
                            <div><label className="text-slate-400 text-xs font-bold uppercase mb-2 block">體重 (kg)</label><input type="number" value={tdeeWeight} onChange={(e) => setTdeeWeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-center" placeholder="70" /></div>
                        </div>
                        <div>
                            <label className="text-slate-400 text-xs font-bold uppercase mb-2 block">活動量</label>
                            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm">
                                <option value="1.2">久坐 (辦公室工作)</option>
                                <option value="1.375">輕量活動 (每週運動1-3天)</option>
                                <option value="1.55">中度活動 (每週運動3-5天)</option>
                                <option value="1.725">高度活動 (每週運動6-7天)</option>
                                <option value="1.9">超高度活動 (勞力工作/運動員)</option>
                            </select>
                        </div>
                    </div>

                    <button onClick={calculateTDEE} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-orange-500/10 active:scale-95 mb-4 transition-all">計算每日消耗</button>

                    {tdee && (
                        <div className="text-center animate-in slide-in-from-bottom-2">
                            <p className="text-slate-400 text-sm mb-1">每日建議攝取熱量</p>
                            <div className="text-6xl font-black text-white mb-2 tracking-tighter">{tdee} <span className="text-xl text-slate-500 font-normal">kcal</span></div>
                            <button onClick={saveTDEE} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors">儲存至個人檔案</button>
                        </div>
                    )}
                </div>
            )}

            {/* 1RM Calculator */}
            {activeTool === '1rm' && (
                <div className="bg-[#111] border border-white/10 rounded-[2rem] p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 mb-6 text-sky-500 font-bold justify-center">
                        <Icon name="dumbbell" className="w-6 h-6" />
                        <span className="text-xl text-white">1RM 最大肌力</span>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">訓練重量 (kg)</label>
                            <input type="number" value={liftWeight} onChange={(e) => setLiftWeight(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center text-lg outline-none focus:ring-1 focus:ring-sky-500" placeholder="100" />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">重複次數 (Reps)</label>
                            <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center text-lg outline-none focus:ring-1 focus:ring-sky-500" placeholder="5" />
                        </div>
                    </div>

                    <button onClick={calculate1RM} className="w-full bg-sky-500 hover:bg-sky-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-sky-500/10 active:scale-95 mb-4 transition-all">計算極限重量</button>

                    {oneRm && (
                        <div className="text-center animate-in slide-in-from-bottom-2">
                            <p className="text-slate-400 text-sm mb-1">預估最大肌力 (1RM)</p>
                            <div className="text-6xl font-black text-white mb-2 tracking-tighter">{oneRm} <span className="text-xl text-slate-500 font-normal">kg</span></div>
                            <button onClick={save1RM} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors mb-4">儲存至個人檔案</button>
                            <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-white/5">
                                <div><div className="text-xs text-slate-500 mb-1">肌肥大 (8-12RM)</div><div className="font-bold text-sky-400">{Math.round(oneRm * 0.75)} kg</div></div>
                                <div><div className="text-xs text-slate-500 mb-1">最大肌力 (1-5RM)</div><div className="font-bold text-sky-400">{Math.round(oneRm * 0.90)} kg</div></div>
                                <div><div className="text-xs text-slate-500 mb-1">爆發力 (3-6RM)</div><div className="font-bold text-sky-400">{Math.round(oneRm * 0.60)} kg</div></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- App Root ---
const App = () => {
    const { user, loading, login, loginAnonymous, logout, db, methods, authError, isConfigured, resetConfig } = useFirebase(); // Added loginAnonymous
    const [currentTab, setCurrentTab] = useState('generator');
    const [userApiKey, setUserApiKey] = useState(localStorage.getItem('gemini_key') || '');
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [userLogs, setUserLogs] = useState({}); // New State for Logs

    useEffect(() => {
        if (!user || !db) return;
        
        // 1. Fetch Profile
        const unsubProfile = methods.onSnapshot(methods.doc(db, "users", user.uid), (doc) => {
            if (doc.exists()) setUserProfile(doc.data());
            else methods.setDoc(methods.doc(db, "users", user.uid), { email: user.isAnonymous ? 'guest' : user.email, joined: new Date() });
        });

        // 2. Fetch Logs (Lifted State)
        const q = methods.collection(db, "users", user.uid, "logs");
        const unsubLogs = methods.onSnapshot(q, (snapshot) => {
            const newLogs = {};
            snapshot.forEach((doc) => {
                newLogs[doc.id] = doc.data(); 
            });
            setUserLogs(newLogs);
        });

        return () => {
            unsubProfile();
            unsubLogs();
        };
    }, [user, db, methods]);

    const handleUpdateProfile = async (data, note) => {
        if (!db || !user) return;
        try {
            await methods.updateDoc(methods.doc(db, "users", user.uid), data);
            setShowProfileModal(false);
        } catch(e) { console.error("Update profile failed:", e); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><Icon name="loader2" className="w-10 h-10 text-emerald-500 animate-spin" /></div>;

    // Show setup screen if not configured
    if (!isConfigured) {
        return <FirebaseSetup onComplete={() => window.location.reload()} />;
    }
    
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
                <button onClick={resetConfig} className="mt-4 text-xs text-slate-500 hover:text-red-400 underline">重置資料庫設定</button>
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
                {currentTab === 'generator' && <GeneratorView apiKey={effectiveApiKey} requireKey={()=>setShowKeyModal(true)} userProfile={userProfile} db={db} user={user} methods={methods} userLogs={userLogs} />}
                {currentTab === 'calendar' && <CalendarView user={user} db={db} methods={methods} logs={userLogs} />}
                {currentTab === 'dashboard' && <DashboardView userLogs={userLogs} userProfile={userProfile} />}
                {currentTab === 'analysis' && <AnalysisView apiKey={effectiveApiKey} requireKey={()=>setShowKeyModal(true)} userProfile={userProfile} onUpdateProfile={handleUpdateProfile} />}
                {currentTab === 'tools' && <ToolsView userProfile={userProfile} onUpdateProfile={handleUpdateProfile} />}
            </main>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-white/10 p-2 rounded-2xl flex gap-4 shadow-2xl backdrop-blur-md z-40">
                <button onClick={()=>setCurrentTab('generator')} className={`p-3 rounded-xl transition-all ${currentTab==='generator'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="sparkles" /></button>
                <button onClick={()=>setCurrentTab('calendar')} className={`p-3 rounded-xl transition-all ${currentTab==='calendar'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="calendar" /></button>
                <button onClick={()=>setCurrentTab('dashboard')} className={`p-3 rounded-xl transition-all ${currentTab==='dashboard'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="linechart" /></button>
                <button onClick={()=>setCurrentTab('analysis')} className={`p-3 rounded-xl transition-all ${currentTab==='analysis'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="activity" /></button>
                <button onClick={()=>setCurrentTab('tools')} className={`p-3 rounded-xl transition-all ${currentTab==='tools'?'text-emerald-500 bg-white/10':'text-slate-500'}`}><Icon name="wrench" /></button>
            </div>

            {showKeyModal && <ApiKeyModal onSave={(k)=>{localStorage.setItem('gemini_key', k); setUserApiKey(k); setShowKeyModal(false)}} initialValue={userApiKey} onClose={()=>setShowKeyModal(false)} />}
            {showProfileModal && <ProfileModal onSave={(data)=>handleUpdateProfile(data)} initialData={userProfile} onClose={()=>setShowProfileModal(false)} />}
        </div>
    );
};

export default App;