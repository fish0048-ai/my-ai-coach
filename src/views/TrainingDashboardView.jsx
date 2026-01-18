import React, { useState, useEffect } from 'react';
import { Activity, Calendar, Trophy, Zap, Timer, Dumbbell, TrendingUp } from 'lucide-react';
import { listCalendarWorkouts } from '../services/calendarService';

// 輔助函式：取得本地 YYYY-MM-DD 字串
const getLocalDateStr = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TrainingDashboardView() {
  const [period, setPeriod] = useState('week'); // 'week' | 'month' | 'year'
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0,
    totalDistance: 0,
    strengthCount: 0,
    runCount: 0,
    chartData: [] 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 從 Service 抓取所有資料
      const workouts = await listCalendarWorkouts();
      const rawDocs = workouts.map(w => ({ ...w, id: undefined })); // 移除 id 以保持相容性

      // 2. 處理統計 (交由前端運算)
      processStats(rawDocs, period);
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processStats = (docs, currentPeriod) => {
    let totalWorkouts = 0;
    let totalDuration = 0;
    let totalDistance = 0;
    let strengthCount = 0;
    let runCount = 0;
    
    // 初始化圖表數據容器
    let chartData = [];
    const now = new Date();
    const todayStr = getLocalDateStr(now);

    // --- 準備圖表 X 軸 ---
    if (currentPeriod === 'week') {
      // 過去 7 天 (包含今天)
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = getLocalDateStr(d);
        const dayLabel = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
        // 標記是否為今天
        const label = dateStr === todayStr ? '今天' : dayLabel;
        chartData.push({ label, date: dateStr, value: 0 });
      }
    } else if (currentPeriod === 'month') {
      // 本月所有日期
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        chartData.push({ label: `${i}`, date: dateStr, value: 0 });
      }
    } else if (currentPeriod === 'year') {
      // 今年 12 個月
      for (let i = 0; i < 12; i++) {
        chartData.push({ label: `${i+1}月`, monthIndex: i, value: 0 });
      }
    }

    // --- 遍歷資料進行統計 ---
    docs.forEach(doc => {
      // 1. 資料相容性處理：如果沒有 status 欄位，預設視為 'completed' (舊資料)
      const status = doc.status || 'completed';
      
      // 2. 過濾條件：只計算已完成，且排除純分析紀錄 (type: 'analysis')
      if (status !== 'completed' || doc.type === 'analysis') return;

      const docDateStr = doc.date; // 假設格式為 YYYY-MM-DD
      if (!docDateStr) return;

      // 判斷這筆資料是否在我們需要的圖表區間內
      let matchIndex = -1;

      if (currentPeriod === 'year') {
        const docDate = new Date(docDateStr);
        if (docDate.getFullYear() === now.getFullYear()) {
          matchIndex = docDate.getMonth();
        }
      } else {
        // Week & Month 直接比對字串，解決時區問題
        matchIndex = chartData.findIndex(d => d.date === docDateStr);
      }

      // 如果這筆資料在區間內，進行累加
      if (matchIndex !== -1) {
        chartData[matchIndex].value += 1; // 累積次數

        // 累積總體數據
        totalWorkouts++;
        if (doc.type === 'run') {
          runCount++;
          totalDistance += parseFloat(doc.runDistance || 0);
          totalDuration += parseFloat(doc.runDuration || 0);
        } else {
          strengthCount++;
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
    <div className="flex items-end justify-between h-40 gap-1 mt-4">
      {data.map((item, idx) => {
        const heightPct = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        const isToday = item.date === getLocalDateStr(new Date());
        
        return (
          <div key={idx} className="flex-1 flex flex-col items-center group relative min-w-[20px]">
            {/* 數值標籤 (Hover 顯示，如果是今天且有值則常駐) */}
            <div className={`absolute -top-8 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none transition-opacity z-10 ${item.value > 0 ? 'group-hover:opacity-100 opacity-0' : 'opacity-0'}`}>
              {item.value}
            </div>
            
            {/* 長條本體 */}
            <div className="w-full h-full flex items-end justify-center">
                <div 
                className={`w-[80%] rounded-t-sm transition-all duration-500 relative ${
                    item.value > 0 
                        ? (isToday ? 'bg-blue-400' : 'bg-blue-600 group-hover:bg-blue-500') 
                        : 'bg-gray-700/20'
                }`}
                style={{ height: `${item.value > 0 ? Math.max(heightPct, 5) : 5}%` }}
                >
                </div>
            </div>

            {/* X軸標籤 */}
            <span className={`text-[10px] mt-2 ${isToday ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                {item.label}
            </span>
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
              {p === 'week' ? '過去7天' : p === 'month' ? '本月' : '今年'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Activity} 
          label="區間運動次數" 
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
              運動頻率趨勢
            </h3>
          </div>
          
          {loading ? (
            <div className="h-40 flex items-center justify-center text-gray-500">
               <span className="animate-pulse">載入數據中...</span>
            </div>
          ) : (
            <BarChart 
              data={stats.chartData} 
              maxVal={Math.max(...stats.chartData.map(d => d.value), 3)} 
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
                "目前區間內還沒有數據。快去行事曆新增您的訓練紀錄吧！"
              ) : (
                `在選定的期間內，您共完成了 ${stats.totalWorkouts} 次訓練。` +
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