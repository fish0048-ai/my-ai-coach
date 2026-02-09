import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Plus, Trash2, Calendar, TrendingUp, TrendingDown, Activity, ChevronDown, Upload, FileText, Download, Dumbbell, Zap, Heart, Timer, Scale, Gauge, BarChart3, Layers, Eye, EyeOff, Target } from 'lucide-react';
import { subscribeBodyLogsStream, addBodyLog, removeBodyLog } from '../api/body';
import { useWorkoutStore } from '../store/workoutStore';
import { parsePaceToDecimal, calculateVolume } from '../utils/workoutCalculations';
import { processTrendData } from '../utils/trendCalculations';
import { handleError } from '../services/core/errorService';
import { analyzeTrainingCycle, getPhaseName, getPhaseColor } from '../utils/cycleAnalysis';

// --- 進階圖表組件 ---
const AdvancedChart = ({ data, color, unit, label, showTrend }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-72 flex flex-col items-center justify-center text-gray-700 border-2 border-dashed border-game-outline/50 rounded-game bg-surface-800/40">
        <Activity size={48} className="mb-4 text-gray-600" aria-hidden />
        <p className="font-medium">資料不足，無法繪製趨勢 (至少需兩筆)</p>
      </div>
    );
  }

  const values = data.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || (minVal === 0 ? 1 : minVal * 0.1); 
  const yMin = Math.max(0, Math.floor(minVal - padding));
  const yMax = Math.ceil(maxVal + padding);

  const width = 800;
  const height = 350;
  const paddingX = 40;
  const paddingY = 40;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const getX = (index) => paddingX + (index / (data.length - 1)) * chartW;
  const getY = (val) => height - paddingY - ((val - yMin) / (yMax - yMin || 1)) * chartH;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const trendPoints = data.map((d, i) => `${getX(i)},${getY(d.trend)}`).join(' ');
  const areaPoints = `${getX(0)},${height-paddingY} ${points} ${getX(data.length-1)},${height-paddingY}`;

  return (
    <div className="w-full overflow-x-auto rounded-game border-2 border-game-outline/50 bg-surface-800 shadow-card">
      <div className="min-w-[600px] relative p-4">
        <div className="flex justify-between items-center mb-4 px-4">
            <h4 className="text-gray-300 text-sm font-bold flex items-center gap-2">
                <Activity size={16} style={{color}}/> {label} ({unit})
            </h4>
            <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1 text-gray-400">
                    <span className="w-3 h-1 rounded-full" style={{backgroundColor: color}}></span> 實際資料
                </span>
                {showTrend && (
                    <span className="flex items-center gap-1 text-gray-400">
                        <span className="w-3 h-1 rounded-full bg-gray-400 border border-gray-500 border-dashed"></span> 趨勢線 (平均)
                    </span>
                )}
            </div>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = (height - paddingY) - (chartH * ratio);
            const val = yMin + (ratio * (yMax - yMin));
            return (
              <g key={ratio}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#374151" strokeDasharray="4" />
                <text x={paddingX - 10} y={y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">{val.toFixed(1)}</text>
              </g>
            );
          })}

          <polygon points={areaPoints} fill="url(#chartGradient)" />

          {showTrend && (
              <polyline fill="none" stroke="#9CA3AF" strokeWidth="2" strokeDasharray="5,5" points={trendPoints} strokeLinecap="round" className="opacity-70" />
          )}

          <polyline fill="none" stroke={color} strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />

          {data.map((d, i) => (
            <g key={i} className="group">
              <circle cx={getX(i)} cy={getY(d.value)} r="4" fill="#1F2937" stroke={color} strokeWidth="2" className="cursor-pointer transition-all group-hover:r-6" />
              <foreignObject x={getX(i) - 60} y={getY(d.value) - 70} width="120" height="60" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                 <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg border border-gray-600 whitespace-nowrap text-center">
                      <div className="font-mono text-gray-400 mb-0.5">{d.date}</div>
                      <span className="font-bold text-sm" style={{color}}>{d.value.toFixed(2)} {unit}</span>
                      {showTrend && <div className="text-[10px] text-gray-500">均: {d.trend.toFixed(2)}</div>}
                    </div>
                 </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default function TrendAnalysisView() {
  const { workouts } = useWorkoutStore();
  const [bodyLogs, setBodyLogs] = useState([]);

  // 從 workoutStore（與行事曆同源）導出已完成訓練，與行事曆同步；舊資料無 status 視為 completed
  const workoutLogs = useMemo(() => {
    const list = Object.values(workouts || {}).flat();
    return list
      .filter((w) => (w.status || 'completed') === 'completed')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [workouts]);

  const [category, setCategory] = useState('body'); 
  const [metricType, setMetricType] = useState('weight'); 
  const [timeScale, setTimeScale] = useState('daily'); 
  const [showTrendLine, setShowTrendLine] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const csvInputRef = useRef(null);
  
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWeight, setInputWeight] = useState('');
  const [inputFat, setInputFat] = useState('');

  useEffect(() => {
    const unsubBody = subscribeBodyLogsStream((logs) => {
      setBodyLogs(logs);
    });
    // 訓練資料由 App 層登入後訂閱並整段登入期間保持，趨勢直接使用 workoutStore，不需在此 init

    return () => {
      if (unsubBody) unsubBody();
    };
  }, []);

  const rawData = useMemo(() => {
      if (category === 'body') return bodyLogs;
      if (category === 'run') {
          return workoutLogs.filter(l => l.type === 'run').map(l => ({
              ...l,
              pace: parsePaceToDecimal(l.runPace),
              distance: parseFloat(l.runDistance),
              heartRate: parseFloat(l.runHeartRate)
          }));
      }
      if (category === 'strength') {
          return workoutLogs.filter(l => l.type === 'strength').map(l => ({
              ...l,
              sets: l.exercises?.reduce((acc, ex) => acc + (parseInt(ex.sets)||0), 0),
              volume: calculateVolume(l.exercises)
          }));
      }
      return [];
  }, [category, bodyLogs, workoutLogs]);

  const chartData = useMemo(() => {
      return processTrendData(rawData, metricType, timeScale);
  }, [rawData, metricType, timeScale]);

  // 訓練周期分析（workoutLogs 已為已完成訓練，與行事曆同源）
  const cycleAnalysis = useMemo(() => {
    if (bodyLogs.length === 0 && workoutLogs.length === 0) return null;
    const result = analyzeTrainingCycle({ 
      bodyLogs, 
      workouts: workoutLogs,
      weeks: 12 
    });
    return result;
  }, [bodyLogs, workoutLogs]);

  // 修正：將變數名稱統一為 stats，解決 ReferenceError
  const stats = useMemo(() => {
      if (chartData.length < 2) return null;
      const current = chartData[chartData.length - 1];
      const prev = chartData[chartData.length - 2];
      const diff = current.value - prev.value;
      const percent = prev.value !== 0 ? (diff / prev.value) * 100 : 0;
      
      const best = Math.max(...chartData.map(d => d.value));
      const worst = Math.min(...chartData.map(d => d.value));

      return {
          current: current.value,
          diff: diff.toFixed(1),
          percent: percent.toFixed(1),
          // 判斷進步：若是體重/體脂/配速，越低越好；其餘越高越好
          isImprove: metricType.includes('pace') || metricType.includes('weight') || metricType.includes('fat') ? diff < 0 : diff > 0, 
          best: best.toFixed(2),
          worst: worst.toFixed(2),
          count: chartData.length
      };
  }, [chartData, metricType]);

  const configs = {
      body: {
          weight: { label: '體重', unit: 'kg', color: '#60A5FA' },
          bodyFat: { label: '體脂率', unit: '%', color: '#34D399' }
      },
      run: {
          distance: { label: '距離', unit: 'km', color: '#F97316' },
          pace: { label: '配速', unit: 'min/km', color: '#8B5CF6' },
          heartRate: { label: '心率', unit: 'bpm', color: '#EF4444' }
      },
      strength: {
          sets: { label: '總組數', unit: 'sets', color: '#3B82F6' },
          volume: { label: '訓練容量', unit: 'kg', color: '#EC4899' }
      }
  };

  const activeConfig = configs[category][metricType] || configs.body.weight;

  const handleCategoryChange = (cat) => {
      setCategory(cat);
      setMetricType(Object.keys(configs[cat])[0]);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    const w = parseFloat(inputWeight) || 0;
    const f = parseFloat(inputFat) || 0;
    try {
      await addBodyLog(inputDate, w, f);
      setInputWeight('');
      setInputFat('');
      setShowAddForm(false);
      // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
    } catch (e) {
      handleError(e, { context: 'TrendAnalysisView', operation: 'handleAddLog' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('刪除?')) return;
    try {
      await removeBodyLog(id);
    } catch (e) {
      console.error('刪除失敗:', e);
    }
  };

  const handleExport = async () => {
    try {
      const head = ['日期', '數值'];
      const rows = [head];
      chartData.forEach(d => rows.push([d.date, d.value]));
      const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trend_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      handleError(e, { context: 'TrendAnalysisView', operation: 'handleExport' });
    }
  };
  const handleCSVUpload = async (e) => { 
    handleError("目前僅支援匯入體重資料，請至行事曆匯入運動資料", { context: 'TrendAnalysisView', operation: 'handleCSVUpload' }); 
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn p-4 md:p-0">
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      <div className="card-base flex flex-col xl:flex-row justify-between items-center gap-4 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="text-game-coin" aria-hidden /> 資料中心
            </h2>
            <div className="toggle-group flex p-1">
                <button type="button" onClick={() => handleCategoryChange('body')} aria-pressed={category==='body'} className={`px-4 py-1.5 rounded-game text-sm font-bold transition-all ${category==='body'?'bg-game-grass text-game-outline':'text-gray-700 hover:text-gray-900'}`}>身體</button>
                <button type="button" onClick={() => handleCategoryChange('run')} aria-pressed={category==='run'} className={`px-4 py-1.5 rounded-game text-sm font-bold transition-all ${category==='run'?'bg-game-coin text-game-outline':'text-gray-700 hover:text-gray-900'}`}>跑步</button>
                <button type="button" onClick={() => handleCategoryChange('strength')} aria-pressed={category==='strength'} className={`px-4 py-1.5 rounded-game text-sm font-bold transition-all ${category==='strength'?'bg-game-grass text-game-outline':'text-gray-700 hover:text-gray-900'}`}>重訓</button>
            </div>
        </div>
        <div className="flex gap-2">
            {category === 'body' && <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="btn-primary flex items-center gap-2 px-3 py-1.5 text-sm"><Plus size={16} aria-hidden /> 紀錄</button>}
            <button type="button" onClick={handleExport} className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"><Download size={16} aria-hidden /> 匯出</button>
        </div>
      </div>

      {showAddForm && category === 'body' && (
        <form onSubmit={handleAddLog} className="card-base p-6 space-y-4 animate-slideUp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="date" required value={inputDate} onChange={(e) => setInputDate(e.target.value)} className="input-base w-full"/>
            <input type="number" step="0.1" placeholder="體重 (kg)" required value={inputWeight} onChange={(e) => setInputWeight(e.target.value)} className="input-base w-full"/>
            <input type="number" step="0.1" placeholder="體脂 (%)" value={inputFat} onChange={(e) => setInputFat(e.target.value)} className="input-base w-full"/>
          </div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary px-4 py-2">取消</button><button type="submit" className="btn-primary px-6 py-2 font-bold">儲存</button></div>
        </form>
      )}

      {/* 訓練周期分析卡片 */}
      {cycleAnalysis && (
        <div className={`card-base rounded-game p-6 border-[3px] bg-[#fafaf8] ${getPhaseColor(cycleAnalysis.currentPhase)}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="text-game-coin" size={24} aria-hidden />
              <div>
                <h3 className="text-xl font-bold text-gray-900">訓練周期分析</h3>
                <p className="text-sm text-gray-700 font-medium mt-1">基於最近 12 週的訓練資料</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-game border-[3px] border-game-outline font-medium ${getPhaseColor(cycleAnalysis.currentPhase)}`}>
              <span className="text-sm font-bold text-gray-900">{getPhaseName(cycleAnalysis.currentPhase)}</span>
            </div>
          </div>
          
          <p className="text-gray-700 mb-4 font-medium">{cycleAnalysis.recommendation.message}</p>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-800 uppercase font-bold">建議行動</p>
            <ul className="space-y-2">
              {cycleAnalysis.recommendation.actions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                  <span className="text-game-coin mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t-2 border-game-outline/50 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-2 rounded-game border-2 border-game-outline/50 bg-white/60">
              <p className="text-gray-700 font-medium mb-1">訓練頻率</p>
              <p className="text-gray-900 font-bold">{cycleAnalysis.trend?.frequency?.perWeek?.toFixed(1) || '0.0'} 次/週</p>
            </div>
            <div className="p-2 rounded-game border-2 border-game-outline/50 bg-white/60">
              <p className="text-gray-700 font-medium mb-1">體重趨勢</p>
              <p className="text-gray-900 font-bold capitalize">{cycleAnalysis.trend?.weight?.direction === 'increasing' ? '↑ 上升' : cycleAnalysis.trend?.weight?.direction === 'decreasing' ? '↓ 下降' : '→ 穩定'}</p>
            </div>
            <div className="p-2 rounded-game border-2 border-game-outline/50 bg-white/60">
              <p className="text-gray-700 font-medium mb-1">體脂趨勢</p>
              <p className="text-gray-900 font-bold capitalize">{cycleAnalysis.trend?.bodyFat?.direction === 'increasing' ? '↑ 上升' : cycleAnalysis.trend?.bodyFat?.direction === 'decreasing' ? '↓ 下降' : '→ 穩定'}</p>
            </div>
            <div className="p-2 rounded-game border-2 border-game-outline/50 bg-white/60">
              <p className="text-gray-700 font-medium mb-1">訓練強度</p>
              <p className="text-gray-900 font-bold">{cycleAnalysis.trend?.intensity?.avgIntensity === 'high' ? '高' : cycleAnalysis.trend?.intensity?.avgIntensity === 'moderate' ? '中' : '低'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
           <div className="card-base p-2 flex flex-col gap-1">
              {Object.entries(configs[category]).map(([key, conf]) => (
                  <button key={key} type="button" onClick={() => setMetricType(key)} className={`w-full text-left px-4 py-3 rounded-game text-sm font-bold transition-all flex justify-between items-center border-[3px] min-h-[44px] ${metricType === key ? 'bg-game-grass/20 text-game-grass border-game-outline' : 'text-gray-700 hover:bg-game-grass/10 border-game-outline/60'}`}>
                    <span>{conf.label}</span>
                    <span className="text-xs font-medium text-gray-600 bg-game-outline/10 px-2 py-0.5 rounded-game border border-game-outline/50">{conf.unit}</span>
                  </button>
              ))}
           </div>

           <div className="card-base p-4 space-y-3">
               <h4 className="text-xs text-gray-800 uppercase font-bold flex items-center gap-1"><Layers size={12} aria-hidden /> 檢視設定</h4>
               <div className="toggle-group flex p-1">
                   <button type="button" onClick={() => setTimeScale('daily')} aria-pressed={timeScale==='daily'} className={`flex-1 py-1 text-xs rounded-game transition-colors min-h-[44px] ${timeScale==='daily'?'bg-game-grass text-game-outline':'text-gray-700 hover:text-gray-900'}`}>日檢視</button>
                   <button type="button" onClick={() => setTimeScale('weekly')} aria-pressed={timeScale==='weekly'} className={`flex-1 py-1 text-xs rounded-game transition-colors min-h-[44px] ${timeScale==='weekly'?'bg-game-grass text-game-outline':'text-gray-700 hover:text-gray-900'}`}>週彙整</button>
               </div>
               <button type="button" onClick={() => setShowTrendLine(!showTrendLine)} className={`w-full py-1.5 text-xs rounded-game border-[3px] transition-colors flex items-center justify-center gap-2 min-h-[44px] font-medium ${showTrendLine ? 'border-game-coin text-game-coin bg-game-coin/10' : 'border-game-outline text-gray-700'}`}>
                   {showTrendLine ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />} 顯示平均趨勢線
               </button>
           </div>

           {stats && (
             <div className="card-base p-5">
                <p className="text-gray-700 text-xs font-medium mb-1">近期變化 ({timeScale === 'daily' ? '較上筆' : '較上週'})</p>
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">{Number(stats.current).toFixed(2)}</span>
                    <span className="text-sm text-gray-700 font-medium mb-1">{activeConfig.unit}</span>
                </div>
                <div className={`flex items-center text-sm font-bold ${stats.isImprove ? 'text-game-grass' : 'text-game-coin'}`}>
                    {stats.diff > 0 ? <TrendingUp size={16} className="mr-1" aria-hidden /> : <TrendingDown size={16} className="mr-1" aria-hidden />}
                    {Math.abs(stats.diff)} ({Math.abs(stats.percent)}%)
                </div>
                <div className="mt-4 pt-4 border-t-2 border-game-outline/50 flex justify-between text-xs font-medium text-gray-700">
                    <div>最高: <span className="text-gray-900 font-bold">{stats.best}</span></div>
                    <div>最低: <span className="text-gray-900 font-bold">{stats.worst}</span></div>
                </div>
             </div>
           )}
        </div>

        <div className="lg:col-span-3">
           <AdvancedChart 
              data={chartData} 
              color={activeConfig.color}
              unit={activeConfig.unit}
              label={`${activeConfig.label} (${timeScale === 'weekly' ? '週總量/均值' : '每日'})`}
              showTrend={showTrendLine}
           />
        </div>
      </div>

      <div className="card-base rounded-game overflow-hidden">
        <div className="p-4 border-b-2 border-game-outline bg-game-grass/15 font-bold text-gray-900 flex items-center gap-2">
           <Activity size={18} className="text-game-grass" aria-hidden /> 詳細紀錄 ({category === 'body' ? '身體數據' : '運動紀錄'})
        </div>
        <div className="max-h-64 overflow-y-auto bg-[#fafaf8]">
           {category === 'body' ? (
             <table className="w-full text-left text-sm">
                <thead className="bg-game-outline/10 text-xs uppercase font-bold text-gray-800 sticky top-0 border-b-2 border-game-outline/50">
                   <tr><th className="px-6 py-3">日期</th><th className="px-6 py-3">體重</th><th className="px-6 py-3">體脂率</th><th className="px-6 py-3 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-game-outline/30">
                   {bodyLogs.slice().reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-game-grass/10 transition-colors">
                         <td className="px-6 py-3 font-mono font-medium text-gray-900">{log.date}</td>
                         <td className="px-6 py-3 text-game-grass font-bold">{log.weight} kg</td>
                         <td className="px-6 py-3 text-game-coin font-bold">{log.bodyFat || '-'} %</td>
                         <td className="px-6 py-3 text-right"><button type="button" onClick={() => handleDelete(log.id)} className="text-gray-700 hover:text-game-heart p-1 min-h-[44px] font-medium" aria-label="刪除"><Trash2 size={16} aria-hidden /></button></td>
                      </tr>
                   ))}
                </tbody>
             </table>
           ) : (
             <table className="w-full text-left text-sm">
                <thead className="bg-game-outline/10 text-xs uppercase font-bold text-gray-800 sticky top-0 border-b-2 border-game-outline/50">
                   <tr><th className="px-6 py-3">日期</th><th className="px-6 py-3">項目</th><th className="px-6 py-3">關鍵數據</th><th className="px-6 py-3">狀態</th></tr>
                </thead>
                <tbody className="divide-y divide-game-outline/30">
                   {workoutLogs.filter(l => (category === 'run' ? l.type === 'run' : l.type === 'strength')).slice().reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-game-grass/10 transition-colors">
                         <td className="px-6 py-3 font-mono font-medium text-gray-900">{log.date}</td>
                         <td className="px-6 py-3 font-bold text-gray-900">{log.title}</td>
                         <td className="px-6 py-3 text-gray-700 font-medium">
                             {log.type === 'run' 
                                ? `${log.runDistance}km @ ${log.runPace}` 
                                : `${log.exercises?.length || 0} 動作, ${calculateVolume(log.exercises)}kg Vol`}
                         </td>
                         <td className="px-6 py-3"><span className="text-xs bg-game-grass/20 text-game-grass px-2 py-0.5 rounded-game border-2 border-game-outline/50 font-medium">完成</span></td>
                      </tr>
                   ))}
                </tbody>
             </table>
           )}
        </div>
      </div>
    </div>
  );
}