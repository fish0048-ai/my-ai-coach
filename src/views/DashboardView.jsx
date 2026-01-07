import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import WeatherWidget from '../components/WeatherWidget.jsx'; 
// 新增 BookOpen, TrendingUp 圖示
import { Activity, Flame, Trophy, Timer, Dumbbell, Sparkles, AlertCircle, BarChart2, TrendingUp, Calendar, BookOpen, Heart } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center space-x-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
      <Icon className={color.replace('bg-', 'text-')} size={24} />
    </div>
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);

export default function DashboardView({ userData }) {
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

  // 計算 Zone 2 範圍 (用於建議卡片)
  const age = parseInt(userData?.age) || 30;
  // 優先使用手動輸入的最大心率，否則用公式估算
  const maxHR = parseInt(userData?.maxHeartRate) || (220 - age);
  const z2Lower = Math.round(maxHR * 0.6);
  const z2Upper = Math.round(maxHR * 0.7);

  useEffect(() => {
    fetchWorkoutStats();
  }, [userData]);

  const fetchWorkoutStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'calendar'));
      const querySnapshot = await getDocs(q);

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

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const todayStr = thirtyDaysAgo.toISOString().split('T')[0];

      const now = new Date();
      const day = now.getDay() || 7; 
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - day + 1);
      weekStart.setHours(0,0,0,0);
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // 使用計算好的區間來統計 Zone 2
      // 注意：這裡使用 fetch 當時的 maxHR，若使用者剛改完資料可能需要重整
      // 但 React 重繪會自動更新介面上的建議卡片，統計部分下次 fetch 會更新
      const zone2LowerLimit = maxHR * 0.6;
      const zone2UpperLimit = maxHR * 0.7;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data) return;

        if (data.status === 'completed' && data.date >= todayStr) {
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
              if (ex.type === 'analysis') {
                analysisReports.push({
                    title: ex.title,
                    feedback: ex.feedback,
                    createdAt: ex.createdAt || data.date 
                });
              }
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

      const normalizedFatigue = {};
      Object.keys(muscleScore).forEach(muscle => {
        const score = muscleScore[muscle];
        let heat = Math.min(Math.round((score / 20) * 10), 10);
        if (score > 0 && heat === 0) heat = 1;
        normalizedFatigue[muscle] = heat;
      });

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
      {/* 頂部歡迎區與天氣 */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              歡迎回來，{userData?.name || '健身夥伴'}
            </h1>
            <p className="text-gray-400">這是您過去 30 天的訓練概況</p>
          </div>
        </div>

        {/* 新增天氣小工具 */}
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

      {/* 第二層：跑步週統計 */}
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
                        <p className="text-gray-300 font-bold">尚無訓練數據</p>
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
            
            {/* 1. 跑步訓練守則 (新增區塊) */}
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="text-blue-400" size={16} />
                    <h4 className="text-sm font-bold text-gray-200">跑步訓練基本守則</h4>
                </div>
                
                <div className="space-y-3">
                    <div className="bg-gray-800/50 p-2 rounded border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="text-green-400" size={14} />
                            <span className="text-xs font-bold text-gray-300">週跑量增幅</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed">
                            建議每週總里程增加控制在 <span className="text-green-400 font-bold">5%~10%</span> 以內，預防受傷。
                        </p>
                    </div>

                    <div className="bg-gray-800/50 p-2 rounded border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-1">
                            <Heart className="text-blue-400" size={14} />
                            <span className="text-xs font-bold text-gray-300">Zone 2 有氧區間</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-relaxed mb-1">
                            基礎有氧耐力區間 (目標心率):
                        </p>
                        <span className="text-sm font-mono text-blue-300 font-bold block text-center bg-gray-900 rounded py-1 border border-gray-700">
                            {z2Lower} - {z2Upper} <span className="text-[10px] font-normal text-gray-500">bpm</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. 訓練量分析 */}
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <h4 className="font-bold text-white mb-2 text-sm">肌群平衡</h4>
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
            
            {/* 3. 動作分析報告 */}
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