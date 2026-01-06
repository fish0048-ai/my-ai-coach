import React, { useState, useMemo } from 'react';
import BodyHeatmap from '../components/BodyHeatmap';

// 簡單的圖示輔助元件 (為了保持獨立性，這裡再次定義簡單版本)
const Icon = ({ name, className }) => {
    // 實際專案中建議從 App.jsx 或共用元件引入
    return <span className={`iconfont icon-${name} ${className}`}></span>;
};

const DashboardView = ({ userLogs, userProfile }) => {
    // 1. 狀態管理：時間範圍
    const [statsRange, setStatsRange] = useState('week'); // 'week', 'month', 'year'
    const [dateOffset, setDateOffset] = useState(0);

    const handleRangeChange = (type) => {
        setStatsRange(type);
        setDateOffset(0);
    };
    const handlePrev = () => setDateOffset(prev => prev - 1);
    const handleNext = () => setDateOffset(prev => prev + 1);

    // 2. 計算日期範圍與標籤
    const { startDate, endDate, dateLabel } = useMemo(() => {
        const now = new Date();
        let start, end, label;

        if (statsRange === 'week') {
            const currentDay = now.getDay();
            const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diff + (dateOffset * 7));
            monday.setHours(0,0,0,0);
            start = new Date(monday);
            end = new Date(monday);
            end.setDate(end.getDate() + 7);
            const endDisp = new Date(end);
            endDisp.setDate(endDisp.getDate() - 1);
            label = `${start.getMonth()+1}/${start.getDate()} - ${endDisp.getMonth()+1}/${endDisp.getDate()}`;
        } else if (statsRange === 'month') {
            start = new Date(now.getFullYear(), now.getMonth() + dateOffset, 1);
            end = new Date(now.getFullYear(), now.getMonth() + dateOffset + 1, 1);
            label = `${start.getFullYear()}年 ${start.getMonth()+1}月`;
        } else {
            start = new Date(now.getFullYear() + dateOffset, 0, 1);
            end = new Date(now.getFullYear() + dateOffset + 1, 0, 1);
            label = `${start.getFullYear()}年`;
        }
        return { startDate, endDate, dateLabel: label };
    }, [statsRange, dateOffset]);

    // 3. 統計數據計算
    const sortedDates = Object.keys(userLogs).sort();
    let periodCount = 0;
    let periodRunDistance = 0;
    const runTrend = [];
    const muscleVolumes = {}; // 用於熱力圖

    sortedDates.forEach(dateStr => {
        const log = userLogs[dateStr];
        const logDate = new Date(dateStr);
        
        if (logDate >= startDate && logDate < endDate) {
            periodCount++;
            
            if (log.type === 'run' && log.data?.distance) {
                const dist = parseFloat(log.data.distance);
                if (!isNaN(dist)) {
                    periodRunDistance += dist;
                    runTrend.push(dist);
                }
            } else if (log.type === 'weight' && log.data && Array.isArray(log.data)) {
                log.data.forEach(ex => {
                    const vol = (parseFloat(ex.weight) || 0) * (parseFloat(ex.sets) || 0) * (parseFloat(ex.reps) || 0);
                    if (vol > 0 && ex.part) {
                        muscleVolumes[ex.part] = (muscleVolumes[ex.part] || 0) + vol;
                    }
                });
            }
        }
    });

    const bmiValue = userProfile?.height && userProfile?.weight 
        ? (userProfile.weight / Math.pow(userProfile.height/100, 2)).toFixed(1) 
        : '--';

    // 4. 繪製跑步圖表
    const renderRunChart = () => {
        if (runTrend.length < 2) return <div className="text-slate-500 text-xs text-center py-8">累積更多跑步紀錄以顯示圖表</div>;
        const maxVal = Math.max(...runTrend);
        const points = runTrend.map((val, idx) => {
            const x = (idx / (runTrend.length - 1)) * 100;
            const y = 100 - (val / maxVal) * 100;
            return `${x},${y}`;
        }).join(' ');

        return (
            <div className="relative h-24 w-full mt-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                    </defs>
                    <polyline fill="none" stroke="url(#lineGradient)" strokeWidth="3" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg" />
                </svg>
            </div>
        );
    };

    return (
        <div className="pb-24 max-w-lg mx-auto animate-in fade-in duration-500">
            {/* Range Selector */}
            <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl mb-4">
                {['week', 'month', 'year'].map(r => (
                    <button key={r} onClick={() => handleRangeChange(r)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${statsRange === r ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                        {r === 'week' ? '週' : r === 'month' ? '月' : '年'}
                    </button>
                ))}
            </div>

            {/* Date Navigator */}
            <div className="flex items-center justify-between mb-6 bg-black/40 rounded-xl p-3 border border-white/5">
                <button onClick={handlePrev} className="px-3 py-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white font-bold">&lt;</button>
                <span className="text-sm font-bold text-white tracking-wider">{dateLabel}</span>
                <button onClick={handleNext} className="px-3 py-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white font-bold">&gt;</button>
            </div>

            {/* Muscle Heatmap */}
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-0"></div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <h3 className="text-emerald-400 font-bold flex items-center gap-2">💪 肌群訓練熱力圖</h3>
                    <span className="text-[10px] text-slate-500 bg-black/40 px-2 py-1 rounded-full border border-white/5">訓練量 (Volume) 分布</span>
                </div>
                <BodyHeatmap muscleVolumes={muscleVolumes} />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="text-emerald-400 mb-2 font-bold text-xs uppercase tracking-wider flex items-center gap-1">🔥 期間訓練</div>
                    <div className="text-3xl font-black text-white">{periodCount} <span className="text-sm font-normal text-slate-500">次</span></div>
                </div>
                <div className="bg-[#111] border border-white/10 rounded-2xl p-4 shadow-xl">
                    <div className="text-orange-400 mb-2 font-bold text-xs uppercase tracking-wider flex items-center gap-1">⚖️ BMI 指數</div>
                    <div className="text-3xl font-black text-white">{bmiValue}</div>
                </div>
            </div>

            {/* Run Chart */}
            <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl mb-6">
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold">🏃 跑步里程</div>
                    <span className="text-2xl font-black text-white">{periodRunDistance.toFixed(1)} <span className="text-sm text-slate-500">km</span></span>
                 </div>
                 {renderRunChart()}
            </div>

             {/* History List */}
             <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                <div className="text-slate-400 font-bold mb-4 text-xs uppercase tracking-wider">歷史活動紀錄 ({dateLabel})</div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedDates.slice().reverse().map(date => {
                         const log = userLogs[date];
                         const logDate = new Date(date);
                         if (logDate < startDate || logDate >= endDate) return null;
                         return (
                            <div key={date} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${log.type==='run'?'bg-sky-400':log.type==='weight'?'bg-orange-400':'bg-emerald-400'}`}></div>
                                    <span className="text-slate-200 font-bold text-xs">{date}</span>
                                </div>
                                <span className="text-slate-400 text-xs truncate max-w-[180px] group-hover:text-white transition-colors">{log.content}</span>
                            </div>
                         );
                    })}
                    {periodCount === 0 && <div className="text-center text-slate-600 text-xs py-4">此期間尚無紀錄</div>}
                </div>
             </div>
        </div>
    );
};

export default DashboardView;