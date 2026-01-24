import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import WeatherWidget from '../components/WeatherWidget.jsx'; 
// 新增 CalendarClock, CheckCircle2, Circle
import { Activity, Flame, Trophy, Timer, Dumbbell, Sparkles, AlertCircle, BarChart2, TrendingUp, Calendar, BookOpen, Heart, CalendarClock, CheckCircle2, Circle, ArrowRight, Share2, Download, FileText, Image } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getDashboardStats } from '../services/workoutService';
import { useTodayWorkouts } from '../hooks/useWorkouts';
import { useWorkoutStore } from '../store/workoutStore';
import StatCard from '../components/Dashboard/StatCard';
import PRTracker from '../components/Dashboard/PRTracker';
import AchievementPanel from '../components/Dashboard/AchievementPanel';
import { useUserStore } from '../store/userStore';
import { useViewStore } from '../store/viewStore';
import { exportTrainingDataJSON, exportTrainingDataCSV, copyReportToClipboard, downloadReportImage, downloadReportPDF } from '../utils/reportGenerator';
import { getBackupReminder, downloadBackup } from '../services/backupService';
import { handleError } from '../services/errorService';

// 安全的日期解析函數
const safeTimestamp = (dateStr) => {
    if (!dateStr) return 0;
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch {
        return 0;
    }
};

export default function DashboardView() {
  // 使用 zustand store 獲取全局狀態
  const userData = useUserStore((state) => state.userData);
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  
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
    zone2Percent: 0
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
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-8">
      {/* 頂部歡迎區 */}
      <div className="flex flex-col gap-6">
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
              className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-800/80 text-white rounded-lg transition-colors"
            >
              <Share2 size={18} />
              <span className="hidden md:inline">分享</span>
            </button>
            
            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-gray-800 rounded-lg shadow-xl z-50">
                <button
                  onClick={async () => {
                    setSharing(true);
                    try {
                      const success = await copyReportToClipboard();
                      if (success) {
                        handleError('報告已複製到剪貼簿！', { context: 'DashboardView', operation: 'shareReport' });
                      }
                    } catch (error) {
                      handleError(error, { context: 'DashboardView', operation: 'shareReport' });
                    } finally {
                      setSharing(false);
                      setShowShareMenu(false);
                    }
                  }}
                  disabled={sharing}
                  className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
                >
                  <FileText size={16} />
                  複製文字報告
                </button>
                <button
                  onClick={async () => {
                    setSharing(true);
                    try {
                      await downloadReportImage();
                      handleError('報告圖片已下載！', { context: 'DashboardView', operation: 'shareReport' });
                    } catch (error) {
                      handleError(error, { context: 'DashboardView', operation: 'shareReport' });
                    } finally {
                      setSharing(false);
                      setShowShareMenu(false);
                    }
                  }}
                  disabled={sharing}
                  className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
                >
                  <Image size={16} />
                  下載圖片報告
                </button>
                <button
                  onClick={async () => {
                    setSharing(true);
                    try {
                      await downloadReportPDF();
                      handleError('PDF 報告已下載！', { context: 'DashboardView', operation: 'shareReport' });
                    } catch (error) {
                      handleError(error, { context: 'DashboardView', operation: 'shareReport' });
                    } finally {
                      setSharing(false);
                      setShowShareMenu(false);
                    }
                  }}
                  disabled={sharing}
                  className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
                >
                  <FileText size={16} />
                  下載 PDF 報告
                </button>
                <button
                  onClick={async () => {
                    setSharing(true);
                    try {
                      await exportTrainingDataJSON();
                      handleError('JSON 資料已下載！', { context: 'DashboardView', operation: 'shareReport' });
                    } catch (error) {
                      handleError(error, { context: 'DashboardView', operation: 'shareReport' });
                    } finally {
                      setSharing(false);
                      setShowShareMenu(false);
                    }
                  }}
                  disabled={sharing}
                  className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Download size={16} />
                  匯出 JSON
                </button>
                <button
                  onClick={async () => {
                    setSharing(true);
                    try {
                      await exportTrainingDataCSV();
                      handleError('CSV 資料已下載！', { context: 'DashboardView', operation: 'shareReport' });
                    } catch (error) {
                      handleError(error, { context: 'DashboardView', operation: 'shareReport' });
                    } finally {
                      setSharing(false);
                      setShowShareMenu(false);
                    }
                  }}
                  disabled={sharing}
                  className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors border-t border-gray-800"
                >
                  <Download size={16} />
                  匯出 CSV
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 定期備份提醒區塊 */}
        {backupReminder?.shouldRemind && !hideBackupBanner && (
          <div className="bg-yellow-900/30 border border-yellow-500/40 text-yellow-100 px-4 py-3 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="text-yellow-400" size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">建議定期下載備份，保護您的訓練資料。</p>
                <p className="text-xs text-yellow-100/80 mt-1">
                  {backupReminder.lastDate
                    ? `上次備份日期：${backupReminder.lastDate}（約 ${backupReminder.daysSince} 天前）`
                    : '尚未偵測到備份紀錄，建議先建立第一份備份檔案。'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadBackup();
                    const user = getCurrentUser();
                    if (user) {
                      const info = getBackupReminder(user.uid, 30);
                      setBackupReminder(info);
                    }
                    handleError('備份檔案已下載完成！', { context: 'DashboardView', operation: 'downloadBackup' });
                  } catch (error) {
                    handleError(error, { context: 'DashboardView', operation: 'downloadBackup' });
                  }
                }}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-semibold rounded-lg transition-colors"
              >
                立即備份
              </button>
              <button
                type="button"
                onClick={() => setHideBackupBanner(true)}
                className="text-xs text-yellow-200/80 hover:text-yellow-100 underline-offset-2 hover:underline"
              >
                稍後再提醒
              </button>
            </div>
          </div>
        )}

        {/* 新增：今日課表提醒區塊 */}
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 p-5 rounded-xl border border-blue-500/30">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
               <CalendarClock className="text-blue-400" /> 
               今日訓練課表
            </h3>
            
            {todayWorkouts.length > 0 ? (
                <div className="space-y-3">
                    {todayWorkouts.map(workout => (
                        <div key={workout.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${workout.status === 'completed' ? 'bg-green-900/20 border-green-500/30' : 'bg-gray-800/80 border-gray-600'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${workout.type === 'run' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                    {workout.type === 'run' ? <TrendingUp size={20}/> : <Dumbbell size={20}/>}
                                </div>
                                <div>
                                    <h4 className={`font-bold ${workout.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                                        {workout.title}
                                    </h4>
                                    <p className="text-xs text-gray-400">
                                        {workout.type === 'run' 
                                            ? `目標: ${workout.runDistance || '?'} km / ${workout.runDuration || '?'} min` 
                                            : `目標: ${workout.exercises?.length || 0} 組動作`
                                        }
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {workout.status === 'completed' ? (
                                    <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-900/30 px-3 py-1.5 rounded-full">
                                        <CheckCircle2 size={14} /> 已完成
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-gray-400 text-xs bg-gray-700/50 px-3 py-1.5 rounded-full border border-gray-600">
                                        <Circle size={14} /> 待執行
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* 引導到行事曆按鈕 */}
                    {todayWorkouts.some(w => w.status !== 'completed') && (
                        <div className="text-right mt-2">
                            <button 
                                onClick={() => {
                                    setCurrentView('calendar');
                                }}
                                className="text-xs text-blue-300 hover:text-blue-200 flex items-center justify-end gap-1 cursor-pointer hover:underline transition-colors"
                            >
                                前往行事曆打卡 <ArrowRight size={12}/>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-gray-400 mb-2">今天尚無安排訓練計畫。</p>
                    <p className="text-xs text-gray-500">休息是為了走更長遠的路，或是前往行事曆安排自主訓練？</p>
                </div>
            )}
        </div>

        {/* 天氣小工具 */}
        <WeatherWidget />
      </div>

      {/* 第一層：總覽統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Activity} 
          label="近30天訓練" 
          value={stats.totalWorkouts} 
          color="bg-blue-500" 
        />
        <StatCard 
          icon={Flame} 
          label="消耗熱量 (估)" 
          value={`${stats.caloriesBurned} kcal`} 
          color="bg-orange-500" 
        />
        <StatCard 
          icon={Timer} 
          label="訓練時數 (估)" 
          value={`${stats.totalHours} h`} 
          color="bg-purple-500" 
        />
        <StatCard 
          icon={Trophy} 
          label="達成目標" 
          value={String(userData?.goal || '未設定')} 
          color="bg-yellow-500" 
        />
      </div>

      {/* 第二層：PR 追蹤與成就 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PRTracker />
        <AchievementPanel />
      </div>

      {/* 第三層：跑步週統計 */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-400" />
            <h3 className="text-lg font-bold text-white">本週跑步統計</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400 uppercase mb-1">週跑量</span>
                <span className="text-2xl font-bold text-white">{stats.weeklyDistance} <span className="text-sm font-normal text-gray-500">km</span></span>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400 uppercase mb-1">週次數</span>
                <span className="text-2xl font-bold text-white">{stats.weeklyRuns} <span className="text-sm font-normal text-gray-500">次</span></span>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400 uppercase mb-1">最長距離</span>
                <span className="text-2xl font-bold text-white">{stats.longestRun} <span className="text-sm font-normal text-gray-500">km</span></span>
            </div>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-400 uppercase mb-1">Zone 2 佔比</span>
                <span className="text-2xl font-bold text-green-400">{stats.zone2Percent} <span className="text-sm font-normal text-gray-500">%</span></span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Heatmap */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-bold text-white">近期肌肉訓練熱圖</h3>
             <span className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded border border-gray-700">
               來源: 您的行事曆紀錄
             </span>
          </div>
          
          <div className="flex-1 min-h-[400px] flex items-center justify-center bg-gray-900/50 rounded-lg relative">
             <BodyHeatmap data={stats.muscleFatigue} />
             
             {Object.keys(stats.muscleFatigue).length === 0 && !loading && (
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

        {/* Right Column: Training Insights */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} />
            綜合訓練建議
          </h3>
          
          <div className="space-y-4 flex-1">
            
            {/* 1. 重訓建議 (肌群平衡) */}
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <Dumbbell className="text-blue-400" size={16} />
                    <h4 className="font-bold text-white text-sm">重訓：肌群平衡</h4>
                </div>
                {Object.keys(stats.muscleFatigue).length > 0 ? (
                    <p className="text-sm text-gray-400 leading-relaxed">
                        數據顯示
                        <span className="text-green-400 font-bold mx-1">
                            {Object.entries(stats.muscleFatigue).sort((a,b) => b[1]-a[1])[0][0]} 
                        </span>
                        是您最近最強化的部位。建議這幾天可以安排拮抗肌群或核心訓練來平衡身體發展。
                    </p>
                ) : (
                    <p className="text-sm text-gray-400">開始紀錄您的第一次重訓，AI 將為您分析肌群分佈。</p>
                )}
            </div>

            {/* 2. 跑步建議 (動態化) */}
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="text-orange-400" size={16} />
                    <h4 className="font-bold text-white text-sm">跑步：進度管理</h4>
                </div>
                {parseFloat(stats.weeklyDistance) > 0 ? (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            本週跑量 <span className="text-white font-bold">{stats.weeklyDistance} km</span>。
                            為預防受傷，下週總里程建議控制在 <span className="text-orange-400 font-bold">{(parseFloat(stats.weeklyDistance) * 1.1).toFixed(1)} km</span> 以內 (10%原則)。
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded border border-gray-700/50 flex justify-between items-center">
                            <span>Zone 2 目標心率</span>
                            <span className="font-mono text-blue-300 font-bold">{z2Lower} - {z2Upper} bpm</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            本週尚未有跑步紀錄。建議安排一次輕鬆跑，將心率維持在 <span className="text-blue-400 font-bold">Zone 2</span> 以建立有氧底層。
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-800/50 p-2 rounded border border-gray-700/50 flex justify-between items-center">
                            <span>Zone 2 目標心率</span>
                            <span className="font-mono text-blue-300 font-bold">{z2Lower} - {z2Upper} bpm</span>
                        </div>
                    </div>
                )}
            </div>
            
            {/* 3. 動作分析報告 (連動部分) */}
            <div className={`p-4 rounded-lg border transition-colors ${stats.latestAnalysis ? 'bg-purple-900/20 border-purple-500/30' : 'bg-gray-900 border-gray-700'}`}>
               <h4 className="font-bold text-purple-400 mb-2 text-sm flex items-center gap-2">
                 {stats.latestAnalysis ? <Sparkles size={14}/> : <AlertCircle size={14}/>}
                 動作優化建議
               </h4>
               {stats.latestAnalysis ? (
                 <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-mono mb-1">
                        來源: {stats.latestAnalysis.title}
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-6">
                        {stats.latestAnalysis.feedback}
                    </p>
                 </div>
               ) : (
                 <p className="text-sm text-gray-400">
                    尚無動作分析紀錄。請前往「動作分析」功能上傳影片，獲取專業姿勢建議。
                 </p>
               )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}