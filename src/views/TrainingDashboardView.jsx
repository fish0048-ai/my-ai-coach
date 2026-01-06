import React, { useState, useEffect } from 'react';
import { Activity, Calendar, Trophy, Zap, Timer, Dumbbell, TrendingUp } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function TrainingDashboardView() {
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0, // minutes
    totalDistance: 0, // km
    strengthCount: 0,
    runCount: 0,
    chartData: [] // For visualization
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // 1. 計算日期區間
      const now = new Date();
      let startDate = new Date();
      
      if (period === 'week') {
        const day = now.getDay() || 7; // Get current day (0 is Sunday, make it 7 for easier calc if needed, or stick to standard)
        // Set to last Monday (or Sunday depending on preference, let's say last 7 days)
        startDate.setDate(now.getDate() - 6); 
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }
      startDate.setHours(0, 0, 0, 0);

      // 2. 從 Firebase 抓取資料
      // 注意：為了簡化索引需求，我們這裡抓取所有資料再前端過濾 (資料量不大時可行)
      // 若資料量大，建議在 Firestore 建立 date 索引並用 where('date', '>=', startDateStr)
      const q = query(collection(db, 'users', user.uid, 'calendar'));
      const querySnapshot = await getDocs(q);
      
      const rawDocs = [];
      querySnapshot.forEach((doc) => {
        rawDocs.push(doc.data());
      });

      // 3. 過濾與統計資料
      processStats(rawDocs, startDate, period);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (docs, startDate, currentPeriod) => {
    let totalWorkouts = 0;
    let totalDuration = 0;
    let totalDistance = 0;
    let strengthCount = 0;
    let runCount = 0;
    
    // 初始化圖表數據容器
    let chartData = [];
    const now = new Date();

    if (currentPeriod === 'week') {
      // 準備過去 7 天的標籤
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        chartData.push({ label: dayLabel, date: dateStr, value: 0 });
      }
    } else if (currentPeriod === 'month') {
      // 準備本月所有日期的標籤
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        chartData.push({ label: `${i}日`, date: dateStr, value: 0 });
      }
    } else if (currentPeriod === 'year') {
      // 準備 12 個月的標籤
      for (let i = 0; i < 12; i++) {
        chartData.push({ label: `${i+1}月`, monthIndex: i, value: 0 });
      }
    }

    // 遍歷資料進行累加
    docs.forEach(doc => {
      // 只統計「已完成」的項目
      if (doc.status !== 'completed') return;

      const docDate = new Date(doc.date);
      // 排除區間外的資料
      if (docDate < startDate) return;

      // 累加基礎數據
      totalWorkouts++;
      if (doc.type === 'run') {
        runCount++;
        totalDistance += parseFloat(doc.runDistance || 0);
        totalDuration += parseFloat(doc.runDuration || 0);
      } else {
        strengthCount++;
        // 重訓時間通常沒有明確紀錄，這裡假設每次重訓 45 分鐘作為估算，或不計入
        // 為了讓數據好看，我們假設一場重訓約 45-60 分鐘，或直接忽略
        // 這裡暫時忽略重訓時間，除非使用者有輸入欄位
      }

      // 填充圖表數據
      if (currentPeriod === 'year') {
        const month = docDate.getMonth();
        if (chartData[month]) chartData[month].value++;
      } else {
        // Week & Month 比對日期字串
        const target = chartData.find(d => d.date === doc.date);
        if (target) {
          // 圖表顯示「運動時數」或是「次數」? 這裡用「次數」比較直觀，或是跑步距離
          // 為了綜合顯示，我們這裡累積「活躍點數」(跑步1km=1點, 重訓1次=5點) 或是簡單的「時數」
          // 這裡示範：累積次數
          target.value++;
        }
      }
    });

    setStats({
      totalWorkouts,
      totalDuration: Math.round(totalDuration),
      totalDistance: totalDistance.toFixed(1),
      strengthCount,
      runCount,
      chartData
    });
  };

  // 簡易長條圖組件
  const BarChart = ({ data, maxVal }) => (
    <div className="flex items-end justify-between h-40 gap-2 mt-4">
      {data.map((item, idx) => {
        // 計算高度百分比 (至少給 5% 讓它顯示一點點)
        const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        
        return (
          <div key={idx} className="flex-1 flex flex-col items-center group relative">
            {/* Tooltip */}
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-700 text-white text-xs px-2 py-1 rounded pointer-events-none transition-opacity">
              {item.value} 次
            </div>
            
            <div 
              className={`w-full max-w-[20px] rounded-t-sm transition-all duration-500 ${item.value > 0 ? 'bg-blue-500 group-hover:bg-blue-400' : 'bg-gray-700/30'}`}
              style={{ height: `${Math.max(heightPct, 4)}%` }}
            ></div>
            <span className="text-[10px] text-gray-500 mt-2">{item.label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            運動儀表板
          </h1>
          <p className="text-gray-400 text-sm">追蹤您的長期訓練成效</p>
        </div>
        
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
          {['week', 'month', 'year'].map((p) => (
            <button 
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                period === p ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
              }`}
            >
              {p === 'week' ? '本週' : p === 'month' ? '本月' : '年度'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Activity} 
          label="總運動次數" 
          value={stats.totalWorkouts} 
          unit="次"
          color="bg-purple-500" 
        />
        <StatCard 
          icon={Timer} 
          label="跑步總時數" 
          value={stats.totalDuration} 
          unit="分鐘"
          color="bg-orange-500" 
        />
        <StatCard 
          icon={Trophy} 
          label="跑步總里程" 
          value={stats.totalDistance} 
          unit="km"
          color="bg-yellow-500" 
        />
        <StatCard 
          icon={Zap} 
          label="重訓次數" 
          value={stats.strengthCount} 
          unit="次"
          color="bg-blue-500" 
        />
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity size={18} className="text-blue-400" />
              運動頻率趨勢 ({period === 'week' ? '過去7天' : period === 'month' ? '本月' : '今年'})
            </h3>
          </div>
          
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-500">
               載入中...
            </div>
          ) : (
            <BarChart 
              data={stats.chartData} 
              maxVal={Math.max(...stats.chartData.map(d => d.value), 3)} // 動態計算最大值，最小設為3以免圖表太平
            />
          )}
        </div>

        {/* Right: Insights / Goals */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="font-bold text-white mb-4">訓練分佈</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">重量訓練</span>
                  <span className="text-white font-bold">
                    {stats.totalWorkouts > 0 ? Math.round((stats.strengthCount / stats.totalWorkouts) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500" 
                    style={{ width: `${stats.totalWorkouts > 0 ? (stats.strengthCount / stats.totalWorkouts) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">有氧跑步</span>
                  <span className="text-white font-bold">
                    {stats.totalWorkouts > 0 ? Math.round((stats.runCount / stats.totalWorkouts) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-500" 
                    style={{ width: `${stats.totalWorkouts > 0 ? (stats.runCount / stats.totalWorkouts) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-500/30 p-5">
            <h3 className="text-white font-bold mb-2 text-sm">AI 分析摘要</h3>
            <p className="text-gray-300 text-xs leading-relaxed">
              {stats.totalWorkouts === 0 ? (
                "目前還沒有足夠的數據。開始紀錄您的第一次訓練，讓我為您提供分析！"
              ) : (
                `本${period === 'week' ? '週' : period === 'month' ? '月' : '年度'}您已經完成了 ${stats.totalWorkouts} 次訓練！` +
                (stats.runCount > stats.strengthCount 
                  ? " 看起來您最近專注於有氧耐力訓練，別忘了適度搭配重訓來維持肌肉量喔。" 
                  : " 您的肌力訓練頻率很棒，若能增加一些低強度的有氧恢復，對心肺功能會更有幫助。")
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 數據卡片組件
const StatCard = ({ icon: Icon, label, value, unit, color }) => (
  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-start justify-between">
    <div>
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      <h3 className="text-xl md:text-2xl font-bold text-white">
        {value} <span className="text-xs font-normal text-gray-500">{unit}</span>
      </h3>
    </div>
    <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
      <Icon className={color.replace('bg-', 'text-')} size={18} />
    </div>
  </div>
);