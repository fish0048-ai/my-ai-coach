import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import { Activity, Flame, Trophy, Timer, Dumbbell, Sparkles, AlertCircle } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

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
    latestAnalysis: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkoutStats();
  }, [userData]);

  const fetchWorkoutStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(collection(db, 'users', user.uid, 'calendar'));
      const querySnapshot = await getDocs(q);

      let totalSets = 0;
      let muscleScore = {}; 
      let totalWorkouts = 0;
      let totalRunDist = 0;
      
      // 用來收集所有分析報告以進行排序
      let analysisReports = [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const todayStr = thirtyDaysAgo.toISOString().split('T')[0];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.status === 'completed' && data.date >= todayStr) {
          // 排除純分析紀錄，只計算實體訓練次數
          if (data.type !== 'analysis') {
             totalWorkouts++;
          }
          
          if (data.exercises) {
            data.exercises.forEach(ex => {
              // 1. 統計肌肉熱力圖 (排除純分析)
              if (ex.targetMuscle && ex.sets) {
                const sets = parseInt(ex.sets) || 1;
                muscleScore[ex.targetMuscle] = (muscleScore[ex.targetMuscle] || 0) + sets;
                totalSets += sets;
              }
              // 2. 收集動作分析報告 (加入日期以便排序)
              if (ex.type === 'analysis' && ex.feedback) {
                analysisReports.push({
                    ...ex,
                    date: data.date, // 使用文件日期作為排序依據
                    createdAt: ex.createdAt || data.date // 若有精確時間則優先使用
                });
              }
            });
          }

          if (data.type === 'run' && data.runDistance) {
            totalRunDist += parseFloat(data.runDistance);
          }
        }
      });

      // 找出最新的分析報告 (根據 createdAt 或 date 排序)
      const latestAnalysisFeedback = analysisReports.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0] || null;

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
        latestAnalysis: latestAnalysisFeedback
      });

    } catch (error) {
      console.error("Error calculating dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            歡迎回來，{userData?.name || '健身夥伴'}
          </h1>
          <p className="text-gray-400">這是您過去 30 天的訓練概況</p>
        </div>
      </div>

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
          value={userData?.goal || '未設定'} 
          color="bg-yellow-500" 
        />
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
            {/* 1. 訓練量分析 */}
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
            
            {/* 2. 動作分析報告 (連動部分 - 加入防呆渲染) */}
            <div className={`p-4 rounded-lg border transition-colors ${stats.latestAnalysis ? 'bg-purple-900/20 border-purple-500/30' : 'bg-gray-900 border-gray-700'}`}>
               <h4 className="font-bold text-purple-400 mb-2 text-sm flex items-center gap-2">
                 {stats.latestAnalysis ? <BrainCircuit size={14}/> : <AlertCircle size={14}/>}
                 動作優化建議
               </h4>
               {stats.latestAnalysis ? (
                 <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-mono mb-1">
                        來源: {String(stats.latestAnalysis.title || 'AI 分析報告')}
                    </p>
                    <p className="text-sm text-gray-300 leading-relaxed line-clamp-6">
                        {/* 強制轉為字串顯示，防止物件導致崩潰 */}
                        {typeof stats.latestAnalysis.feedback === 'string' 
                            ? stats.latestAnalysis.feedback 
                            : JSON.stringify(stats.latestAnalysis.feedback)}
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