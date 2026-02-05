import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { Share2 } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getDashboardStats } from '../services/workoutService';
import { useTodayWorkouts } from '../hooks/useWorkouts';
import { useWorkoutStore } from '../store/workoutStore';
import PRTracker from '../components/Dashboard/PRTracker';
import AchievementPanel from '../components/Dashboard/AchievementPanel';
import ShareMenu from '../components/Dashboard/ShareMenu';
import BackupBanner from '../components/Dashboard/BackupBanner';
import TodaySchedule from '../components/Dashboard/TodaySchedule';
import StatsOverview from '../components/Dashboard/StatsOverview';
import RunningStatsSection from '../components/Dashboard/RunningStatsSection';
import TrainingAdviceSection from '../components/Dashboard/TrainingAdviceSection';
import { useUserStore } from '../store/userStore';
import { getBackupReminder } from '../services/backupService';

export default function DashboardView() {
  const userData = useUserStore((state) => state.userData);
  
  // 使用響應式 Store 獲取訓練資料
  const { workouts: allWorkouts } = useWorkoutStore();
  const { workouts: todayWorkouts } = useTodayWorkouts(); // 使用 Hook 取得今日課表
  
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    caloriesBurned: 0,
    totalHours: 0,
    completedGoals: 0,
    muscleFatigue: {},
    latestAnalysis: null,
    weeklyDistance: 0,
    weeklyRuns: 0,
    longestRun: 0,
    zone2Percent: 0,
    trainingLoad: 0,
    avgTrainingLoad: 0
  });
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [backupReminder, setBackupReminder] = useState(null);
  const [hideBackupBanner, setHideBackupBanner] = useState(false);

  // 計算 Zone 2 範圍
  const age = parseInt(userData?.age) || 30;
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const z2Lower = Math.round(maxHR * 0.6);
  const z2Upper = Math.round(maxHR * 0.7);

  // 當訓練資料或用戶資料變更時，重新計算統計
  useEffect(() => {
    const calculateStats = async () => {
      if (!userData) return;
      
      setLoading(true);
      try {
        // 將 Store 中的 workouts 轉換為陣列格式供 getDashboardStats 使用
        const workoutsArray = Object.values(allWorkouts).flat();
        const result = await getDashboardStats({ userData, workouts: workoutsArray });
        setStats(result);
      } catch (error) {
        console.error("Error calculating dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateStats();

    // 讀取備份提醒狀態（依使用者帳號）
    const user = getCurrentUser();
    if (user) {
      const info = getBackupReminder(user.uid, 30);
      setBackupReminder(info);
    }
  }, [userData, allWorkouts]);

  return (
    <div className="space-y-5 animate-fadeIn max-w-6xl mx-auto pb-8">
      {/* 頂部歡迎區 */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              歡迎回來，{userData?.name || '健身夥伴'}
            </h1>
            <p className="text-gray-400">今天是 {new Date().toLocaleDateString('zh-TW', {month:'long', day:'numeric', weekday:'long'})}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={sharing}
              className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-800/80 text-white rounded-lg transition-colors"
            >
              <Share2 size={18} />
              <span className="hidden md:inline">分享</span>
            </button>
            {showShareMenu && <ShareMenu onClose={() => setShowShareMenu(false)} onSharingChange={setSharing} />}
          </div>
        </div>

        {backupReminder?.shouldRemind && !hideBackupBanner && (
          <BackupBanner
            reminder={backupReminder}
            onDismiss={() => setHideBackupBanner(true)}
            onUpdate={(info) => setBackupReminder(info)}
          />
        )}

        <TodaySchedule workouts={todayWorkouts} />

        {/* 天氣小工具 */}
        <WeatherWidget />
      </div>

      <StatsOverview stats={stats} userData={userData} />

      {/* PR 追蹤與成就 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PRTracker />
        <AchievementPanel />
      </div>

      <RunningStatsSection stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 肌群負荷 */}
        <div className="lg:col-span-2 bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">肌群負荷</h3>
            <span className="text-[10px] text-gray-500">行事曆紀錄</span>
          </div>
          
          <div className="flex-1 min-h-[280px] flex flex-col bg-gray-900/40 rounded-lg relative">
            <BodyHeatmap data={stats.muscleFatigue} />
            {Object.keys(stats.muscleFatigue || {}).length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
                    <div className="text-center">
                        <Dumbbell className="mx-auto text-gray-500 mb-2" size={32} />
                        <p className="text-gray-300 font-bold">尚無訓練資料</p>
                        <p className="text-gray-500 text-sm">快去行事曆新增一筆重訓紀錄吧！</p>
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4 flex flex-col">
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            綜合訓練建議
          </h3>
          <TrainingAdviceSection stats={stats} z2Lower={z2Lower} z2Upper={z2Upper} />
      </div>
    </div>
  );
}