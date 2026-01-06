import React, { useState, useEffect } from 'react';
import { User, Settings, Save, Loader, Flame, Pill, Calculator, Activity, Percent, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase'; 
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
    age: '',        
    gender: 'male', 
    activity: '1.2',
    goal: '增肌',
    supplements: '',
    // 新增：訓練習慣
    trainingDays: [], // ['Mon', 'Wed', 'Fri']
    trainingTime: '20:00' // 預設時間
  });

  const [calculatedTDEE, setCalculatedTDEE] = useState(0);

  useEffect(() => {
    if (userData) {
      setProfile({
        height: userData.height || '',
        weight: userData.weight || '',
        bodyFat: userData.bodyFat || '',
        muscleRate: userData.muscleRate || '',
        bmr: userData.bmr || '',
        age: userData.age || '',
        gender: userData.gender || 'male',
        activity: userData.activity || '1.2',
        goal: userData.goal || '增肌',
        supplements: userData.supplements || '',
        // 讀取習慣設定，預設為空陣列
        trainingDays: userData.trainingDays || [],
        trainingTime: userData.trainingTime || '20:00'
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

  // 處理訓練日切換
  const toggleDay = (day) => {
    if (!isEditing) return;
    setProfile(prev => {
        const days = prev.trainingDays.includes(day)
            ? prev.trainingDays.filter(d => d !== day)
            : [...prev.trainingDays, day];
        return { ...prev, trainingDays: days };
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
      alert("個人資料已更新！(包含訓練習慣)");
    } catch (error) {
      console.error("儲存失敗:", error);
      alert("儲存失敗，請檢查網路連線。");
    } finally {
      setIsSaving(false);
    }
  };

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
            
            {/* 訓練習慣設定區塊 (新增) */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon className="text-blue-500" />
                    <h3 className="font-bold text-white">訓練習慣設定</h3>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold mb-2 block">預計訓練日</label>
                        <div className="grid grid-cols-4 gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
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