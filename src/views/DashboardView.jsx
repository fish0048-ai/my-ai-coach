import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx';
import WeatherWidget from '../components/WeatherWidget.jsx';
import { Share2, Dumbbell, Zap } from 'lucide-react';
import { getDefaultGameProfile } from '../services/game/gameProfileService';
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
import { getBackupReminder } from '../services/backup/backupService';

/** RPG 遊戲化：等級、經驗條、金幣（司令部用，與 WorldMap HUD 一致） */
function GameProfileStrip({ gameProfile }) {
  const gp = gameProfile || getDefaultGameProfile();
  const level = gp.level ?? 1;
  const currentXP = gp.currentXP ?? 0;
  const nextLevelXP = Math.max(1, gp.nextLevelXP ?? 100);
  const coins = gp.coins ?? 0;
  const pct = Math.min(100, (currentXP / nextLevelXP) * 100);

  return (
    <div
      className="hud-strip shrink-0"
      role="status"
      aria-label={`等級 ${level}，經驗值 ${currentXP}/${nextLevelXP}，金幣 ${coins}`}
    >
      <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/tiles/hud_player_helmet_yellow.png`} alt="" className="w-8 h-8 object-contain" aria-hidden />
      <div className="flex items-center gap-1.5">
        <Zap size={18} className="text-game-grass" aria-hidden />
        <span className="text-sm font-bold text-level">Lv.{level}</span>
      </div>
      <div className="hidden sm:block w-24">
        <div className="h-2 bg-game-outline/30 rounded-full overflow-hidden border-2 border-game-outline">
          <div className="h-full bg-game-grass rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-game-outline/80">{currentXP}/{nextLevelXP}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/tiles/hud_coin.png`} alt="" className="w-6 h-6 object-contain" aria-hidden />
        <span className="text-sm font-bold text-level">×{coins}</span>
      </div>
      <div className="flex items-center gap-0.5 ml-1" aria-hidden>
        <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/tiles/hud_heart.png`} alt="" className="w-5 h-5 object-contain" />
        <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/tiles/hud_heart.png`} alt="" className="w-5 h-5 object-contain" />
        <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/tiles/hud_heart.png`} alt="" className="w-5 h-5 object-contain" />
      </div>
    </div>
  );
}

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
    <div className="space-y-5 animate-fade-in max-w-6xl mx-auto pb-8">
      {/* 頂部歡迎區 */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              歡迎回來，{userData?.name || '健身夥伴'}
            </h1>
            <p className="text-gray-600">今天是 {new Date().toLocaleDateString('zh-TW', {month:'long', day:'numeric', weekday:'long'})}</p>
          </div>
          {/* RPG 等級／經驗／金幣（司令部） */}
          <GameProfileStrip gameProfile={userData?.gameProfile} />
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              disabled={sharing}
              className="btn-secondary flex items-center gap-2 px-4 py-2"
              aria-expanded={showShareMenu}
            >
              <Share2 size={18} aria-hidden />
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
        <div className="lg:col-span-2 card-base p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900">肌群負荷</h3>
            <span className="text-[10px] text-gray-500">行事曆紀錄</span>
          </div>
          
          <div className="flex-1 min-h-[280px] flex flex-col rounded-game border-[3px] border-game-outline relative bg-white/70">
            <BodyHeatmap data={stats.muscleFatigue} />
            {Object.keys(stats.muscleFatigue || {}).length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-game-outline/20 z-10 pointer-events-none rounded-game">
                    <div className="text-center">
                        <Dumbbell className="mx-auto text-gray-500 mb-2" size={32} />
                        <p className="text-gray-800 font-bold">尚無訓練資料</p>
                        <p className="text-gray-600 text-sm">快去行事曆新增一筆重訓紀錄吧！</p>
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="card-base p-4 flex flex-col">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            綜合訓練建議
          </h3>
          <TrainingAdviceSection stats={stats} z2Lower={z2Lower} z2Upper={z2Upper} />
        </div>
      </div>
    </div>
  );
}