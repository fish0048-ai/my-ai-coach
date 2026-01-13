import React, { useState, useEffect } from 'react';
// 引入完整圖示集
import { 
  User, Settings, Save, Loader, Flame, Pill, Calculator, Activity, Percent, 
  Calendar as CalendarIcon, Clock, Timer, Heart,
  // 新增功能選單需要的圖示
  Dumbbell, LineChart, ChevronRight 
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase'; 
import { updateAIContext } from '../utils/contextManager';

export default function FeatureViews({ view, userData, setCurrentView }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 初始化表單狀態
  const [profile, setProfile] = useState({
    height: '',
    weight: '',
    bodyFat: '',    
    muscleRate: '', 
    bmr: '',        
    maxHeartRate: '', 
    age: '',        
    gender: 'male', 
    activity: '1.2',
    goal: '增肌',
    supplements: '',
    trainingDays: [], 
    trainingTime: '20:00',
    longRunDay: '',    
    intervalDay: '',   
    easyRunDays: []    
  });

  const [calculatedTDEE, setCalculatedTDEE] = useState(0);

  // 計算實際使用的最大心率
  const activeMaxHR = parseInt(profile.maxHeartRate) || (profile.age ? 220 - parseInt(profile.age) : 0);

  // 心率區間計算
  const heartRateZones = (() => {
    if (!activeMaxHR) return [];
    const maxHR = activeMaxHR;
    return [
      { label: 'Z1 恢復跑 (Recovery)', range: `${Math.round(maxHR * 0.5)} - ${Math.round(maxHR * 0.6)}`, color: 'text-gray-400', bg: 'bg-gray-700/30' },
      { label: 'Z2 有氧耐力 (Aerobic)', range: `${Math.round(maxHR * 0.6)} - ${Math.round(maxHR * 0.7)}`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { label: 'Z3 節奏跑 (Tempo)', range: `${Math.round(maxHR * 0.7)} - ${Math.round(maxHR * 0.8)}`, color: 'text-green-400', bg: 'bg-green-500/10' },
      { label: 'Z4 乳酸閾值 (Threshold)', range: `${Math.round(maxHR * 0.8)} - ${Math.round(maxHR * 0.9)}`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
      { label: 'Z5 最大攝氧 (VO2 Max)', range: `${Math.round(maxHR * 0.9)} - ${maxHR}`, color: 'text-red-400', bg: 'bg-red-500/10' },
    ];
  })();

  useEffect(() => {
    if (userData) {
      setProfile({
        height: userData.height || '',
        weight: userData.weight || '',
        bodyFat: userData.bodyFat || '',
        muscleRate: userData.muscleRate || '',
        bmr: userData.bmr || '',
        maxHeartRate: userData.maxHeartRate || '', 
        age: userData.age || '',
        gender: userData.gender || 'male',
        activity: userData.activity || '1.2',
        goal: userData.goal || '增肌',
        supplements: userData.supplements || '',
        trainingDays: userData.trainingDays || [],
        trainingTime: userData.trainingTime || '20:00',
        longRunDay: userData.longRunDay || '',
        intervalDay: userData.intervalDay || '',
        easyRunDays: userData.easyRunDays || []
      });
    }
  }, [userData]);

  useEffect(() => {
    calculateTDEE();
  }, [profile.height, profile.weight, profile.age, profile.gender, profile.activity, profile.bmr]);

  const calculateTDEE = () => {
    const act = parseFloat(profile.activity);
    const manualBmr = parseFloat(profile.bmr);
    
    if (manualBmr && manualBmr > 0 && act) {
        setCalculatedTDEE(Math.round(manualBmr * act));
        return;
    }

    const w = parseFloat(profile.weight);
    const h = parseFloat(profile.height);
    const a = parseFloat(profile.age);

    if (w && h && a && act) {
      let bmr = 0;
      if (profile.gender === 'male') {
        bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
      } else {
        bmr = (10 * w) + (6.25 * h) - (5 * a) - 161;
      }
      setCalculatedTDEE(Math.round(bmr * act));
    } else {
      setCalculatedTDEE(0);
    }
  };

  const getTargetCalories = () => {
    if (!calculatedTDEE) return 0;
    switch (profile.goal) {
      case '增肌': return calculatedTDEE + 300; 
      case '減脂': return calculatedTDEE - 400; 
      default: return calculatedTDEE; 
    }
  };

  const toggleDay = (day) => {
    if (!isEditing) return;
    setProfile(prev => {
        const days = prev.trainingDays.includes(day)
            ? prev.trainingDays.filter(d => d !== day)
            : [...prev.trainingDays, day];
        return { ...prev, trainingDays: days };
    });
  };

  const toggleEasyRunDay = (day) => {
    if (!isEditing) return;
    setProfile(prev => {
        const days = prev.easyRunDays.includes(day)
            ? prev.easyRunDays.filter(d => d !== day)
            : [...prev.easyRunDays, day];
        return { ...prev, easyRunDays: days };
    });
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("請先登入才能儲存資料！");
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...profile, 
        tdee: calculatedTDEE, 
        email: user.email,
        name: user.displayName || 'User',
        lastUpdated: new Date()
      }, { merge: true });

      await updateAIContext();
      setIsEditing(false);
      alert("個人資料已更新！");
    } catch (error) {
      console.error("儲存失敗:", error);
      alert("儲存失敗，請檢查網路連線。");
    } finally {
      setIsSaving(false);
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // --- 個人檔案視圖 (Profile View) ---
  if (view === 'profile') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn p-4 md:p-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-purple-500" />
          個人檔案與數據
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左側：頭像與基本資訊 */}
          <div className="col-span-1 space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col items-center text-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 ring-4 ring-gray-800 shadow-xl overflow-hidden">
                  {userData?.photoURL ? (
                      <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                      <span>{userData?.name?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>
              </div>
              <h2 className="text-xl font-bold text-white">{userData?.name || '健身夥伴'}</h2>
              <p className="text-gray-400 text-sm mb-4">{userData?.email}</p>
              
              {calculatedTDEE > 0 && (
                <div className="w-full bg-gray-900/50 rounded-lg p-4 border border-gray-700 mt-2">
                    <div className="text-xs text-gray-500 uppercase mb-1">每日建議攝取</div>
                    <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
                        <Flame size={20} fill="currentColor" />
                        {getTargetCalories()} <span className="text-sm text-gray-400 font-normal">kcal</span>
                    </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full mt-2">
                {profile.bodyFat && (
                   <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-[10px] text-gray-500 uppercase mb-1">體脂率</div>
                      <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
                          <Percent size={14} />
                          {profile.bodyFat}<span className="text-xs font-normal">%</span>
                      </div>
                  </div>
                )}
                {profile.muscleRate && (
                   <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                      <div className="text-[10px] text-gray-500 uppercase mb-1">肌肉率</div>
                      <div className="text-lg font-bold text-blue-400 flex items-center justify-center gap-1">
                          <Activity size={14} />
                          {profile.muscleRate}<span className="text-xs font-normal">%</span>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側：詳細數據表單 */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Calculator size={18} className="text-orange-400"/>
                    身體數據與 TDEE 分析
                </h3>
                {isEditing ? (
                   <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                   >
                    {isSaving ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>}
                    儲存變更
                   </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                  >
                    <Settings size={16}/> 編輯資料
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">身高 (cm)</label>
                  <input type="number" value={profile.height} disabled={!isEditing} onChange={(e) => setProfile({...profile, height: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">體重 (kg)</label>
                  <input type="number" value={profile.weight} disabled={!isEditing} onChange={(e) => setProfile({...profile, weight: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">體脂率 (%)</label>
                  <input type="number" step="0.1" value={profile.bodyFat} disabled={!isEditing} onChange={(e) => setProfile({...profile, bodyFat: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">肌肉率 (%)</label>
                  <input type="number" step="0.1" value={profile.muscleRate} disabled={!isEditing} onChange={(e) => setProfile({...profile, muscleRate: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50" />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">基礎代謝 BMR (kcal)</label>
                  <input type="number" value={profile.bmr} disabled={!isEditing} onChange={(e) => setProfile({...profile, bmr: e.target.value})} placeholder={calculatedTDEE ? `估算值: ${Math.round(calculatedTDEE / parseFloat(profile.activity))}` : "手動輸入"} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50" />
                </div>
                <div className="col-span-1 sm:col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-semibold">日常活動量</label>
                    <select value={profile.activity} disabled={!isEditing} onChange={(e) => setProfile({...profile, activity: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50">
                        <option value="1.2">久坐 (少運動)</option>
                        <option value="1.375">輕度活動 (每週 1-3 天)</option>
                        <option value="1.55">中度活動 (每週 3-5 天)</option>
                        <option value="1.725">高度活動 (每週 6-7 天)</option>
                    </select>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Pill className="text-blue-500" />
                    <h3 className="font-bold text-white">目前使用補品</h3>
                </div>
                <textarea 
                    value={profile.supplements}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, supplements: e.target.value})}
                    className="w-full h-24 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none disabled:opacity-50 resize-none"
                    placeholder="例如：乳清蛋白、肌酸..."
                />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AI 實驗室功能列表 (Default View) ---
  const features = [
    {
      id: 'run-analysis',
      title: '跑姿分析',
      desc: '上傳影片，AI 幫您分析步頻與送髖角度。',
      icon: Activity,
      color: 'bg-blue-500',
      action: () => setCurrentView('run-analysis')
    },
    {
      id: 'strength-analysis',
      title: '重訓動作分析',
      desc: '透過鏡頭即時偵測深蹲與硬舉姿勢，預防受傷。',
      icon: Dumbbell,
      color: 'bg-purple-500',
      action: () => setCurrentView('strength-analysis')
    },
    // --- 關鍵修正：加入趨勢分析卡片 ---
    {
      id: 'trend',
      title: '身體數據趨勢',
      desc: '記錄並追蹤體重與體脂的長期變化曲線。',
      icon: LineChart,
      color: 'bg-green-500',
      action: () => setCurrentView('trend')
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn p-4 md:p-0">
       <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-bold text-white">AI 智能實驗室</h2>
          <p className="text-gray-400">探索最新的 AI 健身黑科技</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
             <button
               key={feature.id}
               onClick={feature.action}
               className="bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 rounded-2xl p-6 text-left transition-all hover:scale-[1.02] group relative overflow-hidden shadow-lg"
             >
                <div className={`absolute top-0 right-0 w-24 h-24 ${feature.color} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
                   <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed h-12">
                  {feature.desc}
                </p>
                <div className="mt-4 flex items-center text-sm font-medium text-gray-500 group-hover:text-white transition-colors">
                   立即體驗 <ChevronRight size={16} className="ml-1" />
                </div>
             </button>
          ))}
       </div>
    </div>
  );
}