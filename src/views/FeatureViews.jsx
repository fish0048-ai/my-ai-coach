import React, { useState, useEffect, useRef } from 'react';
import { User, Download, Upload, Database, AlertCircle, Loader, CheckCircle2 } from 'lucide-react';
import { updateUserProfile } from '../services/userService';
import { syncBodyLogFromProfile } from '../services/bodyService';
import { getCurrentUser } from '../services/authService';
import { updateAIContext } from '../utils/contextManager';
import { handleError } from '../services/core/errorService';
import { calculateTDEE, getTargetCalories } from '../utils/nutritionCalculations';
import { calculateActiveMaxHR } from '../utils/heartRateCalculations';
import ProfileHeader from '../components/Profile/ProfileHeader';
import BodyDataForm from '../components/Profile/BodyDataForm';
import TrainingScheduleSection from '../components/Profile/TrainingScheduleSection';
import RunningScheduleSection from '../components/Profile/RunningScheduleSection';
import SupplementsList from '../components/Profile/SupplementsList';
import { useUserStore } from '../store/userStore';
import { downloadBackup, readBackupFile, restoreFromBackup } from '../services/backup/backupService';

export default function FeatureViews({ view }) {
  // 使用 zustand store 獲取和更新用戶資料
  const userData = useUserStore((state) => state.userData);
  const updateUserData = useUserStore((state) => state.updateUserData);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const backupFileInputRef = useRef(null);
  
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

      // 2. 同步資料至「資料趨勢 (body_logs)」集合
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
          個人檔案與資料
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

            {/* 資料備份與恢復 */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Database className="text-blue-400" />
                資料備份與恢復
              </h3>
              
              <div className="space-y-4">
                {/* 備份功能 */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">備份所有資料到本地檔案</p>
                  <button
                    onClick={async () => {
                      setBackingUp(true);
                      try {
                        await downloadBackup();
                        handleError('備份已成功下載！', { context: 'FeatureViews', operation: 'downloadBackup' });
                      } catch (error) {
                        handleError(error, { context: 'FeatureViews', operation: 'downloadBackup' });
                      } finally {
                        setBackingUp(false);
                      }
                    }}
                    disabled={backingUp}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {backingUp ? (
                      <>
                        <Loader size={18} className="animate-spin"/>
                        <span>備份中...</span>
                      </>
                    ) : (
                      <>
                        <Download size={18}/>
                        <span>下載備份</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 恢復功能 */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">從備份檔案恢復資料</p>
                  <input
                    type="file"
                    ref={backupFileInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setRestoring(true);
                      setRestoreResult(null);
                      try {
                        const backupData = await readBackupFile(file);
                        const confirmed = window.confirm(
                          '確定要恢復備份資料嗎？這將覆蓋現有資料。\n\n' +
                          `備份日期：${backupData.exportDate ? new Date(backupData.exportDate).toLocaleString('zh-TW') : '未知'}\n` +
                          `訓練記錄：${backupData.stats?.calendarCount || 0} 筆\n` +
                          `身體數據：${backupData.stats?.bodyLogsCount || 0} 筆\n` +
                          `營養記錄：${backupData.stats?.foodLogsCount || 0} 筆`
                        );
                        
                        if (confirmed) {
                          const result = await restoreFromBackup(backupData, { overwrite: true });
                          setRestoreResult(result);
                          if (result.success) {
                            handleError('資料恢復成功！', { context: 'FeatureViews', operation: 'restoreBackup' });
                            // 刷新用戶資料
                            await updateUserData();
                          } else {
                            handleError(`恢復完成，但有部分錯誤：${result.errors.join(', ')}`, { context: 'FeatureViews', operation: 'restoreBackup' });
                          }
                        }
                      } catch (error) {
                        handleError(error, { context: 'FeatureViews', operation: 'restoreBackup' });
                      } finally {
                        setRestoring(false);
                        if (backupFileInputRef.current) backupFileInputRef.current.value = '';
                      }
                    }}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => backupFileInputRef.current?.click()}
                    disabled={restoring}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {restoring ? (
                      <>
                        <Loader size={18} className="animate-spin"/>
                        <span>恢復中...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={18}/>
                        <span>選擇備份檔案恢復</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 恢復結果 */}
                {restoreResult && (
                  <div className={`p-4 rounded-lg border ${
                    restoreResult.success 
                      ? 'bg-green-900/20 border-green-700/50' 
                      : 'bg-yellow-900/20 border-yellow-700/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {restoreResult.success ? (
                        <CheckCircle2 className="text-green-400" size={18}/>
                      ) : (
                        <AlertCircle className="text-yellow-400" size={18}/>
                      )}
                      <span className="text-sm font-semibold text-white">
                        {restoreResult.success ? '恢復完成' : '恢復部分完成'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-300 space-y-1">
                      {restoreResult.restored.profile && <p>✓ 用戶資料：已恢復</p>}
                      {restoreResult.restored.calendar && <p>✓ 訓練記錄：{restoreResult.restored.calendar} 筆</p>}
                      {restoreResult.restored.bodyLogs && <p>✓ 身體數據：{restoreResult.restored.bodyLogs} 筆</p>}
                      {restoreResult.restored.foodLogs && <p>✓ 營養記錄：{restoreResult.restored.foodLogs} 筆</p>}
                      {restoreResult.restored.gears && <p>✓ 裝備記錄：{restoreResult.restored.gears} 筆</p>}
                      {restoreResult.restored.achievements && <p>✓ 成就記錄：{restoreResult.restored.achievements} 筆</p>}
                      {restoreResult.errors && restoreResult.errors.length > 0 && (
                        <div className="mt-2 text-yellow-400">
                          <p className="font-semibold">錯誤：</p>
                          {restoreResult.errors.map((err, idx) => (
                            <p key={idx}>• {err}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                  <p>💡 建議定期備份資料，保護您的訓練記錄</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}