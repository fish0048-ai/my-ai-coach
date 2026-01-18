import React, { useState, useEffect } from 'react';
import { User, Settings, Save, Loader, Flame, Pill, Calculator, Activity, Percent, Calendar as CalendarIcon, Clock, Timer, Heart } from 'lucide-react';
import { updateUserProfile } from '../services/userService';
import { syncBodyLogFromProfile } from '../services/bodyService';
import { getCurrentUser } from '../services/authService';
import { updateAIContext } from '../utils/contextManager';

export default function FeatureViews({ view, userData }) {
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

  // 計算實際使用的最大心率 (手動優先，否則用年齡估算)
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
    const user = getCurrentUser();
    if (!user) {
      alert("請先登入才能儲存資料！");
      return;
    }

    setIsSaving(true);
    try {
      // 1. 儲存個人檔案 (Profile)
      await updateUserProfile({
        ...profile, 
        tdee: calculatedTDEE
      });

      // 2. 同步數據至「數據趨勢 (body_logs)」集合
      if (profile.weight || profile.bodyFat) {
        const todayStr = new Date().toISOString().split('T')[0];
        await syncBodyLogFromProfile(
          todayStr,
          parseFloat(profile.weight) || 0,
          parseFloat(profile.bodyFat) || 0
        );
      }

      // 3. 更新 AI 記憶上下文
      await updateAIContext();

      setIsEditing(false);
      alert("個人資料已更新！並已同步至數據趨勢紀錄。");
    } catch (error) {
      console.error("儲存失敗:", error);
      alert("儲存失敗，請檢查網路連線。");
    } finally {
      setIsSaving(false);
    }
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (view === 'training') {
    return <div className="text-white p-8">訓練功能已移至儀表板，請點擊左側「總覽 Dashboard」或「訓練儀表板」。</div>;
  }

  if (view === 'profile') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
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
                    <div className="text-xs text-gray-500 mt-2">
                        基礎代謝 (BMR): {Math.round(calculatedTDEE / parseFloat(profile.activity))}
                        {profile.bmr && <span className="text-blue-400 ml-1">(自訂)</span>}
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
            
            {/* 訓練習慣設定區塊 (一般) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon className="text-blue-500" />
                    <h3 className="font-bold text-white">一般訓練習慣</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold mb-2 block">預計訓練日</label>
                        <div className="grid grid-cols-4 gap-2">
                            {weekDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleDay(day)}
                                    disabled={!isEditing}
                                    className={`py-1.5 rounded text-xs font-medium transition-colors ${
                                        profile.trainingDays.includes(day)
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                                            : 'bg-gray-900 text-gray-500 hover:bg-gray-700'
                                    } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold mb-2 block flex items-center gap-1">
                            <Clock size={12}/> 偏好時段
                        </label>
                        <input 
                            type="time" 
                            value={profile.trainingTime}
                            disabled={!isEditing}
                            onChange={(e) => setProfile({...profile, trainingTime: e.target.value})}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                        />
                    </div>
                </div>
            </div>

            {/* 補品清單 */}
            {!isEditing && profile.supplements && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        <Pill size={18} className="text-blue-400" /> 補品清單
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.supplements.split('\n').map((item, idx) => (
                            item.trim() && (
                                <span key={idx} className="px-3 py-1 bg-blue-500/10 text-blue-300 text-sm rounded-full border border-blue-500/20">
                                    {item}
                                </span>
                            )
                        ))}
                    </div>
                </div>
            )}
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
                {/* 身高體重 */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">身高 (cm)</label>
                  <input 
                    type="number" 
                    value={profile.height}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, height: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">體重 (kg)</label>
                  <input 
                    type="number" 
                    value={profile.weight}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold flex items-center justify-between">
                    體脂率 (Body Fat)
                    <span className="text-[10px] text-gray-400 lowercase">%</span>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={profile.bodyFat}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, bodyFat: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                    placeholder="例如: 18.5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold flex items-center justify-between">
                    肌肉率 (Muscle Mass)
                    <span className="text-[10px] text-gray-400 lowercase">%</span>
                  </label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={profile.muscleRate}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, muscleRate: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                    placeholder="例如: 32.5"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold flex items-center justify-between">
                    基礎代謝 (BMR) 
                    <span className="text-[10px] text-gray-400 lowercase">kcal/day</span>
                  </label>
                  <input 
                    type="number" 
                    value={profile.bmr}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, bmr: e.target.value})}
                    placeholder={calculatedTDEE && !profile.bmr ? `自動估算: ${Math.round(calculatedTDEE / parseFloat(profile.activity))}` : "InBody 測量值"}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 placeholder-gray-600"
                  />
                </div>

                {/* 新增：最大心率 (手動輸入) */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold flex items-center justify-between">
                    最大心率 (Max HR)
                    <span className="text-[10px] text-gray-400 lowercase">bpm</span>
                  </label>
                  <input 
                    type="number" 
                    value={profile.maxHeartRate}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, maxHeartRate: e.target.value})}
                    placeholder={profile.age ? `自動估算: ${220 - parseInt(profile.age)}` : "實測值"}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 placeholder-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">年齡</label>
                  <input 
                    type="number" 
                    value={profile.age}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, age: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50"
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">性別</label>
                  <select 
                    value={profile.gender}
                    disabled={!isEditing}
                    onChange={(e) => setProfile({...profile, gender: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                  >
                    <option value="male">男性 (Male)</option>
                    <option value="female">女性 (Female)</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-semibold">日常活動量</label>
                    <select 
                        value={profile.activity}
                        disabled={!isEditing}
                        onChange={(e) => setProfile({...profile, activity: e.target.value})}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                    >
                        <option value="1.2">久坐 (辦公室工作，少運動)</option>
                        <option value="1.375">輕度活動 (每週運動 1-3 天)</option>
                        <option value="1.55">中度活動 (每週運動 3-5 天)</option>
                        <option value="1.725">高度活動 (每週運動 6-7 天)</option>
                        <option value="1.9">超高度活動 (勞力工作 + 每天訓練)</option>
                    </select>
                </div>

                <div className="col-span-1 sm:col-span-2 space-y-2">
                  <label className="text-xs text-gray-500 uppercase font-semibold">訓練目標</label>
                  <select 
                    disabled={!isEditing}
                    value={profile.goal}
                    onChange={(e) => setProfile({...profile, goal: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
                  >
                    <option value="增肌">增肌 (Muscle Gain) - 建議盈餘</option>
                    <option value="減脂">減脂 (Fat Loss) - 建議赤字</option>
                    <option value="維持">維持 (Maintain) - 保持平衡</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 跑步訓練安排 (新增區塊) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Timer className="text-orange-500" />
                    <h3 className="font-bold text-white">跑步訓練安排</h3>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-semibold">🐢 長距離日 (LSD)</label>
                            <select 
                                value={profile.longRunDay}
                                disabled={!isEditing}
                                onChange={(e) => setProfile({...profile, longRunDay: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none disabled:opacity-50 appearance-none"
                            >
                                <option value="">選擇星期...</option>
                                {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-500 uppercase font-semibold">🐇 間歇跑 (Interval)</label>
                            <select 
                                value={profile.intervalDay}
                                disabled={!isEditing}
                                onChange={(e) => setProfile({...profile, intervalDay: e.target.value})}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 outline-none disabled:opacity-50 appearance-none"
                            >
                                <option value="">選擇星期...</option>
                                {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 uppercase font-semibold">👟 輕鬆跑 (Easy Run)</label>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {weekDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => toggleEasyRunDay(day)}
                                    disabled={!isEditing}
                                    className={`py-1.5 rounded text-xs font-medium transition-colors ${
                                        profile.easyRunDays.includes(day)
                                            ? 'bg-orange-600 text-white shadow-md shadow-orange-900/50'
                                            : 'bg-gray-900 text-gray-500 hover:bg-gray-700'
                                    } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 心率區間自動計算 */}
                    <div className="mt-6 pt-6 border-t border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                         <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                           <Heart size={12} className="text-red-500" /> 心率區間 (最大心率: {activeMaxHR || '--'} bpm {profile.maxHeartRate ? '(自訂)' : '(估算)'})
                         </label>
                      </div>
                      
                      {!activeMaxHR ? (
                          <div className="text-sm text-gray-500 text-center py-2">請輸入「年齡」或「最大心率」以計算區間</div>
                      ) : (
                          <div className="space-y-2">
                              {heartRateZones.map((z, idx) => (
                                  <div key={idx} className={`flex justify-between items-center p-2 rounded ${z.bg}`}>
                                      <span className={`text-xs font-bold ${z.color}`}>{z.label}</span>
                                      <span className="text-xs text-white font-mono">{z.range} bpm</span>
                                  </div>
                              ))}
                          </div>
                      )}
                    </div>
                </div>
            </div>

            {/* 補品紀錄區塊 */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Pill className="text-blue-500" />
                    <h3 className="font-bold text-white">目前使用補品 (Supplements)</h3>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase font-semibold">記錄您正在使用的補品 (一行一項)</label>
                    <textarea 
                        value={profile.supplements}
                        disabled={!isEditing}
                        onChange={(e) => setProfile({...profile, supplements: e.target.value})}
                        className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 resize-none"
                        placeholder="例如：&#10;乳清蛋白 30g/天&#10;肌酸 5g/天&#10;魚油 1顆/餐"
                    />
                </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}