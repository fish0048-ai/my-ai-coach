import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import WeatherWidget from '../components/WeatherWidget.jsx'; 
// 新增 CalendarClock, CheckCircle2, Circle
import { Activity, Flame, Trophy, Timer, Dumbbell, Sparkles, AlertCircle, BarChart2, TrendingUp, Calendar, BookOpen, Heart, CalendarClock, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { listTodayWorkouts, listCalendarWorkoutsByDateRange } from '../services/calendarService';
import { calculateMuscleFatigue } from '../utils/statsCalculations';
import StatCard from '../components/Dashboard/StatCard';
import PRTracker from '../components/Dashboard/PRTracker';
import AchievementPanel from '../components/Dashboard/AchievementPanel';
import { useUserStore } from '../store/userStore';
import { useViewStore } from '../store/viewStore';

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
  const [todayWorkouts, setTodayWorkouts] = useState([]); // 新增：今日課表狀態
  const [loading, setLoading] = useState(false);

  // 計算 Zone 2 範圍
  const age = parseInt(userData?.age) || 30;
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const z2Lower = Math.round(maxHR * 0.6);
  const z2Upper = Math.round(maxHR * 0.7);

  useEffect(() => {
    fetchWorkoutStats();
    fetchTodaySchedule(); // 新增：讀取今日課表
  }, [userData]);

  // 新增：讀取今日課表邏輯
  const fetchTodaySchedule = async () => {
      try {
          const todays = await listTodayWorkouts();
          setTodayWorkouts(todays);
      } catch (e) {
          console.error("Fetch today schedule failed:", e);
      }
  };

  const fetchWorkoutStats = async () => {
    setLoading(true);
    try {
      // 1. 計算日期範圍 (過去 30 天)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

      // 2. 使用 service 獲取資料
      const workouts = await listCalendarWorkoutsByDateRange(startDateStr);

      let totalSets = 0;
      let muscleScore = {}; 
      let totalWorkouts = 0;
      let totalRunDist = 0;
      let analysisReports = [];

      let weeklyDistance = 0;
      let weeklyRuns = 0;
      let longestRun = 0;
      let zone2Minutes = 0;
      let totalRunMinutes = 0;

      // 計算本週起始日
      const now = new Date();
      const day = now.getDay() || 7; 
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - day + 1);
      weekStart.setHours(0,0,0,0);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const zone2LowerLimit = maxHR * 0.6;
      const zone2UpperLimit = maxHR * 0.7;

      workouts.forEach((workout) => {
        const data = workout;
        if (!data) return;

        // 統計邏輯只看已完成
        if (data.status === 'completed') {
          if (data.type !== 'analysis') {
             totalWorkouts++;
          }
          
          if (Array.isArray(data.exercises)) {
            data.exercises.forEach(ex => {
              if (!ex) return;
              if (ex.targetMuscle && ex.sets) {
                const sets = parseInt(ex.sets) || 1;
                muscleScore[ex.targetMuscle] = (muscleScore[ex.targetMuscle] || 0) + sets;
                totalSets += sets;
              }
              if (data.type === 'analysis') { // 注意：analysis 可能是 data.type
                analysisReports.push({
                    title: data.title,
                    feedback: data.feedback,
                    createdAt: data.createdAt || data.date 
                });
              }
            });
          }
          // 修正：analysis 也可能直接是 type
          if (data.type === 'analysis') {
             analysisReports.push({
                title: data.title,
                feedback: data.feedback,
                createdAt: data.createdAt || data.date 
            });
          }

          if (data.type === 'run' && data.runDistance) {
            const dist = parseFloat(data.runDistance) || 0;
            const duration = parseFloat(data.runDuration) || 0;
            const hr = parseFloat(data.runHeartRate) || 0;

            totalRunDist += dist;

            if (data.date >= weekStartStr) {
                weeklyDistance += dist;
                weeklyRuns++;
                if (dist > longestRun) longestRun = dist;
                
                totalRunMinutes += duration;
                if (hr >= zone2LowerLimit && hr <= zone2UpperLimit) {
                    zone2Minutes += duration;
                }
            }
          }
        }
      });

      const rawLatestAnalysis = analysisReports.sort((a, b) => 
        safeTimestamp(b.createdAt) - safeTimestamp(a.createdAt)
      )[0] || null;

      const safeLatestAnalysis = rawLatestAnalysis ? {
          title: String(rawLatestAnalysis.title || 'AI 分析報告'),
          feedback: typeof rawLatestAnalysis.feedback === 'object' 
              ? JSON.stringify(rawLatestAnalysis.feedback) 
              : String(rawLatestAnalysis.feedback || '無詳細建議')
      } : null;

      const normalizedFatigue = calculateMuscleFatigue(muscleScore);

      setStats({
        totalWorkouts: totalWorkouts,
        caloriesBurned: Math.round(totalWorkouts * 250), 
        totalHours: Math.round(totalWorkouts * 0.8 * 10) / 10, 
        completedGoals: userData?.completedGoals || 0,
        muscleFatigue: normalizedFatigue,
        latestAnalysis: safeLatestAnalysis,
        weeklyDistance: weeklyDistance.toFixed(1),
        weeklyRuns: weeklyRuns,
        longestRun: longestRun.toFixed(1),
        zone2Percent: totalRunMinutes > 0 ? Math.round((zone2Minutes / totalRunMinutes) * 100) : 0
      });

    } catch (error) {
      console.error("Error calculating dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 頂部歡迎區 */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              歡迎回來，{userData?.name || '健身夥伴'}
            </h1>
            <p className="text-gray-400">今天是 {new Date().toLocaleDateString('zh-TW', {month:'long', day:'numeric', weekday:'long'})}</p>
          </div>
        </div>

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
             <BodyHeatmap 
                data={stats.muscleFatigue} 
                frontImage="/muscle_front.png" 
                backImage="/muscle_back.png"
             />
             
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