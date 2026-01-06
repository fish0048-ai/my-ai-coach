import React, { useEffect, useState } from 'react';
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import { Activity, Flame, Trophy, Timer, Dumbbell } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
    muscleFatigue: {} // 重要：這裡存放計算後的熱力圖數據
  });
  const [loading, setLoading] = useState(true);

  // 當使用者登入時，抓取近期訓練資料計算熱力圖
  useEffect(() => {
    fetchWorkoutStats();
  }, [userData]);

  const fetchWorkoutStats = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 設定搜尋範圍：過去 30 天的訓練 (讓熱力圖反映近期狀態)
      // 注意：如果要精準查詢日期，建議在 Firestore 存 timestamp 並使用 where 查詢
      // 這裡為了簡化，我們先抓取所有 calendar 資料，再於前端過濾 (資料量大時需優化)
      const q = query(collection(db, 'users', user.uid, 'calendar'));
      const querySnapshot = await getDocs(q);

      let totalSets = 0;
      let muscleScore = {}; // 用來累積部位訓練量
      let totalWorkouts = 0;
      let totalRunDist = 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const todayStr = thirtyDaysAgo.toISOString().split('T')[0];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // 只統計「已完成」且「近期」的紀錄
        if (data.status === 'completed' && data.date >= todayStr) {
          totalWorkouts++;
          
          // 統計重訓肌群
          if (data.type === 'strength' && data.exercises) {
            data.exercises.forEach(ex => {
              if (ex.targetMuscle) {
                // 每個 Set 算 1 分，累積訓練量
                const sets = parseInt(ex.sets) || 1;
                muscleScore[ex.targetMuscle] = (muscleScore[ex.targetMuscle] || 0) + sets;
                totalSets += sets;
              }
            });
          }

          // 統計跑步距離 (這裡僅示範)
          if (data.type === 'run' && data.runDistance) {
            totalRunDist += parseFloat(data.runDistance);
          }
        }
      });

      // 將累積的組數轉換為 BodyHeatmap 的 0-10 分數
      // 假設 30 天內，某部位累積 20 組以上顯示紅色(10分)，10組黃色(5分)
      const normalizedFatigue = {};
      Object.keys(muscleScore).forEach(muscle => {
        const score = muscleScore[muscle];
        // 簡單的線性映射：超過 20 組就滿分
        let heat = Math.min(Math.round((score / 20) * 10), 10);
        // 至少顯示 1 分 (如果練過)
        if (score > 0 && heat === 0) heat = 1;
        normalizedFatigue[muscle] = heat;
      });

      setStats({
        totalWorkouts: totalWorkouts,
        caloriesBurned: Math.round(totalWorkouts * 250), // 估算值
        totalHours: Math.round(totalWorkouts * 0.8 * 10) / 10, // 估算值
        completedGoals: userData?.completedGoals || 0,
        muscleFatigue: normalizedFatigue
      });

    } catch (error) {
      console.error("Error calculating dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            歡迎回來，{userData?.name || '健身夥伴'}
          </h1>
          <p className="text-gray-400">這是您過去 30 天的訓練概況</p>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Main Content Grid */}
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
             {/* 傳入我們計算好的數據 */}
             <BodyHeatmap data={stats.muscleFatigue} />
             
             {/* 如果完全沒有數據的提示 */}
             {Object.keys(stats.muscleFatigue).length === 0 && !loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                    <div className="text-center">
                        <Dumbbell className="mx-auto text-gray-500 mb-2" size={32} />
                        <p className="text-gray-300 font-bold">尚無訓練數據</p>
                        <p className="text-gray-500 text-sm">快去行事曆新增一筆重訓紀錄吧！</p>
                    </div>
                </div>
             )}
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">訓練建議</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
              <h4 className="font-bold text-white mb-2 text-sm">肌群平衡分析</h4>
              {Object.keys(stats.muscleFatigue).length > 0 ? (
                <p className="text-sm text-gray-400 leading-relaxed">
                   根據熱圖顯示，您的
                   <span className="text-green-400 font-bold mx-1">
                     {Object.entries(stats.muscleFatigue).sort((a,b) => b[1]-a[1])[0][0]} 
                   </span>
                   訓練頻率較高。建議下週可以多安排一些拮抗肌群的訓練，或是增加有氧運動來平衡。
                </p>
              ) : (
                <p className="text-sm text-gray-400">累積更多數據後，AI 將為您提供專屬分析。</p>
              )}
            </div>
            
            <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
               <h4 className="font-bold text-blue-400 mb-1 text-sm">每週目標</h4>
               <p className="text-sm text-gray-300">本週已完成 {stats.totalWorkouts} 次訓練，距離目標還差 2 次！加油！</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}