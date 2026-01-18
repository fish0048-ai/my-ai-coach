import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { updateUserProfile } from '../services/userService';
import { syncBodyLogFromProfile } from '../services/bodyService';
import { getCurrentUser } from '../services/authService';
import { updateAIContext } from '../utils/contextManager';
import { handleError } from '../services/errorService';
import { calculateTDEE } from '../utils/nutritionCalculations';
import { calculateActiveMaxHR } from '../utils/heartRateCalculations';
import ProfileHeader from '../components/Profile/ProfileHeader';
import BodyDataForm from '../components/Profile/BodyDataForm';
import TrainingScheduleSection from '../components/Profile/TrainingScheduleSection';
import RunningScheduleSection from '../components/Profile/RunningScheduleSection';
import SupplementsList from '../components/Profile/SupplementsList';
import { useUserStore } from '../store/userStore';

export default function FeatureViews({ view }) {
  // 使用 zustand store 獲取和更新用戶資料
  const userData = useUserStore((state) => state.userData);
  const updateUserData = useUserStore((state) => state.updateUserData);
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
  const activeMaxHR = calculateActiveMaxHR(profile.maxHeartRate, profile.age);

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
    const tdee = calculateTDEE({
      weight: profile.weight,
      height: profile.height,
      age: profile.age,
      gender: profile.gender,
      activity: profile.activity,
      manualBmr: profile.bmr
    });
    setCalculatedTDEE(tdee);
  }, [profile.height, profile.weight, profile.age, profile.gender, profile.activity, profile.bmr]);

  const getTargetCaloriesValue = () => {
    return getTargetCalories(calculatedTDEE, profile.goal);
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
      handleError("請先登入才能儲存資料！", { context: 'FeatureViews', operation: 'handleSave' });
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

      // 4. 刷新 store 中的用戶資料
      await updateUserData();

      setIsEditing(false);
      // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
    } catch (error) {
      handleError(error, { context: 'FeatureViews', operation: 'handleSave' });
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
            <ProfileHeader 
              userData={userData} 
              profile={profile} 
              calculatedTDEE={calculatedTDEE} 
            />
            
            <TrainingScheduleSection
              profile={profile}
              isEditing={isEditing}
              onDayToggle={toggleDay}
              onTrainingTimeChange={(time) => setProfile({...profile, trainingTime: time})}
            />

          </div>

          {/* 右側：詳細數據表單 */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <BodyDataForm
              profile={profile}
              isEditing={isEditing}
              isSaving={isSaving}
              calculatedTDEE={calculatedTDEE}
              onProfileChange={setProfile}
              onSave={handleSave}
              onEdit={() => setIsEditing(true)}
            />

            <RunningScheduleSection
              profile={profile}
              isEditing={isEditing}
              activeMaxHR={activeMaxHR}
              hasManualMaxHR={!!profile.maxHeartRate}
              age={profile.age}
              onLongRunDayChange={(value) => setProfile({...profile, longRunDay: value})}
              onIntervalDayChange={(value) => setProfile({...profile, intervalDay: value})}
              onEasyRunDayToggle={toggleEasyRunDay}
            />

            <SupplementsList
              supplements={profile.supplements}
              isEditing={isEditing}
              onSupplementsChange={(value) => setProfile({...profile, supplements: value})}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}