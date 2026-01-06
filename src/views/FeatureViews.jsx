import React, { useState, useEffect, useRef } from 'react';

// 為了簡化，這裡重複定義 Icon，實務上應從 components 引入
const Icon = ({ name, className }) => <span className={`icon-${name} ${className}`}></span>;

// --- Calendar View (With Muscle Icons) ---
export const CalendarView = ({ user, db, methods, logs }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form States
    const [logType, setLogType] = useState('general'); 
    const [runData, setRunData] = useState({ time: '', distance: '', pace: '', power: '' }); 
    const [weightData, setWeightData] = useState({ part: '胸部', action: '', sets: '', weight: '', reps: '' }); 
    const [editingText, setEditingText] = useState("");
    const [weightExercises, setWeightExercises] = useState([]);
    const quickTags = ['休息日', '瑜珈', '核心', '伸展'];

    // Auto-detect muscle group
    const detectMuscleGroup = (name) => {
        if (!name) return '其他';
        const n = name.toLowerCase();
        if (n.match(/臥推|飛鳥|伏地挺身|胸|push up|bench press|chest|夾胸/)) return '胸部';
        if (n.match(/划船|拉背|引體向上|硬舉|背|row|pull up|deadlift|back|pull-down|pulldown/)) return '背部';
        if (n.match(/深蹲|腿推|分腿蹲|弓箭步|腿|squat|leg|lunge|calf|提踵/)) return '腿部';
        if (n.match(/推舉|平舉|面拉|肩|shoulder|press|deltoid/)) return '肩膀';
        if (n.match(/二頭|三頭|彎舉|臂|arm|curl|tricep|bicep|dip/)) return '手臂';
        if (n.match(/卷腹|棒式|核心|腹|plank|crunch|core|abs|sit up/)) return '核心';
        return '其他';
    };

    const addTag = (tag) => {
        setEditingText(prev => {
            if (!prev) return `[${tag}] `;
            return prev.endsWith(' ') || prev.endsWith('\n') ? prev + `[${tag}] ` : prev + `\n[${tag}] `;
        });
    };

    const handleRunBlur = (field) => {
        let { distance, time, pace, power } = runData;
        let d = parseFloat(distance);
        let t = parseFloat(time);
        let p = 0;
        if (pace && pace.includes(':')) {
            const [min, sec] = pace.split(':').map(Number);
            p = min + (sec / 60);
        } else {
            p = parseFloat(pace);
        }
        if (field === 'distance' || field === 'time') {
            if (d > 0 && t > 0) {
                const paceMin = Math.floor(t / d);
                const paceSec = Math.round(((t / d) - paceMin) * 60);
                pace = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
            } else if (d > 0 && p > 0 && !t) {
                t = d * p;
                time = t.toFixed(1);
            }
        } else if (field === 'pace') {
            if (d > 0 && p > 0) {
                t = d * p;
                time = t.toFixed(1);
            } else if (t > 0 && p > 0 && !d) {
                d = t / p;
                distance = d.toFixed(2);
            }
        }
        setRunData({ distance, time, pace, power });
    };

    const handleActionChange = (e) => {
        const action = e.target.value;
        const part = detectMuscleGroup(action);
        setWeightData({ ...weightData, action, part });
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const handleDateClick = (d) => { 
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), d); 
        setSelectedDate(dateStr); 
        setLogType('general');
        setRunData({ time: '', distance: '', pace: '', power: '' }); 
        setWeightData({ part: '胸部', action: '', sets: '', weight: '', reps: '' });
        setWeightExercises([]);
        setEditingText("");
        const log = logs[dateStr];
        if (log) {
            setEditingText(log.content || "");
            if (log.type === 'run') {
                setLogType('run');
                setRunData(log.data || { time: '', distance: '', pace: '', power: '' });
            } else if (log.type === 'weight') {
                setLogType('weight');
                if (Array.isArray(log.data)) {
                    setWeightExercises(log.data);
                } else if (log.data) {
                    setWeightExercises([log.data]);
                }
            } else {
                setLogType('general');
            }
        }
    };

    const handleAddWeightExercise = () => {
        if (!weightData.action) return;
        const newExercise = { ...weightData };
        if (newExercise.weight && newExercise.sets && newExercise.reps) {
            newExercise.volume = parseFloat(newExercise.weight) * parseFloat(newExercise.sets) * parseFloat(newExercise.reps);
        }
        setWeightExercises([...weightExercises, newExercise]);
        setWeightData({ ...weightData, action: '', sets: '', weight: '', reps: '' }); 
    };

    const handleRemoveWeightExercise = (index) => {
        const newList = [...weightExercises];
        newList.splice(index, 1);
        setWeightExercises(newList);
    };
    
    const saveLog = async () => { 
        if (!user || !db || !selectedDate) return;
        setIsLoading(true);
        try {
            let finalContent = editingText;
            let dataToSave = { 
                type: logType,
                updatedAt: new Date()
            };
            if (logType === 'general') {
                if (!editingText.trim()) {
                    await methods.deleteDoc(methods.doc(db, "users", user.uid, "logs", selectedDate));
                    setSelectedDate(null);
                    setIsLoading(false);
                    return;
                }
                dataToSave.content = editingText;
            } else if (logType === 'run') {
                dataToSave.data = runData;
                const parts = [];
                if (runData.distance) parts.push(`${runData.distance}km`);
                if (runData.time) parts.push(`${runData.time}min`);
                if (runData.pace) parts.push(`${runData.pace}/km`);
                dataToSave.content = parts.join(' | ') || '跑步訓練';
            } else if (logType === 'weight') {
                let currentExercises = [...weightExercises];
                if (weightData.action) {
                    const ex = {...weightData};
                    if (ex.weight && ex.sets && ex.reps) {
                        ex.volume = parseFloat(ex.weight) * parseFloat(ex.sets) * parseFloat(ex.reps);
                    }
                    currentExercises.push(ex);
                }
                if (currentExercises.length === 0) {
                     await methods.deleteDoc(methods.doc(db, "users", user.uid, "logs", selectedDate));
                     setSelectedDate(null);
                     setIsLoading(false);
                     return;
                }
                dataToSave.data = currentExercises;
                const summary = currentExercises.map(ex => `${ex.action}`).join(', ');
                dataToSave.content = `[重訓] ${summary}`;
            }
            await methods.setDoc(methods.doc(db, "users", user.uid, "logs", selectedDate), dataToSave, { merge: true });
            setSelectedDate(null); 
        } catch (e) {
            console.error("Save failed:", e);
            alert("儲存失敗，請檢查網路連線");
        } finally {
            setIsLoading(false);
        }
    };

    // Render logic same as before but simplified for this file block
    // ... (Calendar grid rendering code)
    const renderCalendarGrid = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="p-2"></div>);
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
            const logData = logs[dateStr];
            const hasLog = !!logData;
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
            days.push(
                <div key={day} onClick={() => handleDateClick(day)} className={`grid grid-rows-[auto_1fr] min-h-[80px] md:min-h-[100px] border border-white/5 rounded-xl p-2 relative cursor-pointer hover:bg-white/5 group transition-all ${isToday ? 'bg-white/5 ring-1 ring-emerald-500/50' : 'bg-[#0a0a0a]'}`}>
                    <span className={`text-sm font-bold ${isToday ? 'text-emerald-500' : 'text-slate-500 group-hover:text-slate-300'}`}>{day}</span>
                    {hasLog && (
                        <div className="mt-1 overflow-hidden flex flex-col gap-1">
                            {logData.type === 'run' ? (
                                <div className="bg-sky-500/20 text-sky-300 px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 truncate">🏃 {logData.content}</div>
                            ) : logData.type === 'weight' ? (
                                <div className="bg-orange-500/20 text-orange-300 px-1.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 truncate">🏋️ {logData.content.replace('[重訓] ', '')}</div>
                            ) : (
                                <div className="bg-slate-700/50 text-slate-300 px-1.5 py-1 rounded text-[10px] truncate border-l-2 border-slate-500">{logData.content}</div>
                            )}
                        </div>
                    )}
                    {!hasLog && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 text-lg">+</div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8 bg-[#111] p-4 rounded-2xl border border-white/5 shadow-lg"><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">&lt;</button><h2 className="text-xl font-bold text-white tracking-widest uppercase flex items-center gap-2">📅 {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</h2><button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">&gt;</button></div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center bg-[#111] p-3 rounded-xl border border-white/5">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-xs text-slate-500 font-bold">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1 md:gap-2">{renderCalendarGrid()}</div>
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-[2rem] p-6 shadow-2xl scale-in-95 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2 text-white font-bold"><span className='text-emerald-500'>{selectedDate}</span> 訓練紀錄</div><button onClick={() => setSelectedDate(null)} className="text-slate-500 hover:text-white">✕</button></div>
                        <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/5">
                            <button onClick={() => setLogType('general')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${logType === 'general' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>💾 一般</button>
                            <button onClick={() => setLogType('run')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${logType === 'run' ? 'bg-sky-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>🏃 跑步</button>
                            <button onClick={() => setLogType('weight')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${logType === 'weight' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>🏋️ 重訓</button>
                        </div>
                        <div className="mb-6 space-y-4">
                            {logType === 'general' && (<><div className="flex flex-wrap gap-2 mb-2">{quickTags.map(tag => <button key={tag} onClick={() => addTag(tag)} className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-white/5 rounded-lg text-xs font-medium transition-all">+ {tag}</button>)}</div><textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} placeholder="輸入訓練筆記..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500 min-h-[120px] resize-none" autoFocus /></>)}
                            
                            {logType === 'run' && (<div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">總距離 (km)</label><input type="number" value={runData.distance} onChange={(e) => setRunData({...runData, distance: e.target.value})} onBlur={() => handleRunBlur('distance')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="5" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">總時間 (分鐘)</label><input type="number" value={runData.time} onChange={(e) => setRunData({...runData, time: e.target.value})} onBlur={() => handleRunBlur('time')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="30" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均配速 (分:秒/km)</label><input type="text" value={runData.pace} onChange={(e) => setRunData({...runData, pace: e.target.value})} onBlur={() => handleRunBlur('pace')} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="5:30" /></div>
                                    <div><label className="text-xs text-sky-400 font-bold block mb-1">平均功率 (W)</label><input type="number" value={runData.power} onChange={(e) => setRunData({...runData, power: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-sky-500" placeholder="200" /></div>
                                </div>
                            </div>)}
                            
                            {logType === 'weight' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2 mb-2">
                                        <div className="flex-[2]"><label className="text-xs text-orange-400 font-bold block mb-1">動作名稱</label><input type="text" value={weightData.action} onChange={handleActionChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500" placeholder="例如：深蹲" /></div>
                                        <div className="flex-1"><label className="text-xs text-orange-400 font-bold block mb-1">部位</label><select value={weightData.part} onChange={(e) => setWeightData({...weightData, part: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500"><option>胸部</option><option>背部</option><option>腿部</option><option>肩膀</option><option>手臂</option><option>核心</option><option>其他</option></select></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1"><label className="text-xs text-orange-400 font-bold block mb-1">重量(kg)</label><input type="number" value={weightData.weight} onChange={(e) => setWeightData({...weightData, weight: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="100" /></div>
                                        <div className="flex-1"><label className="text-xs text-orange-400 font-bold block mb-1">組數</label><input type="number" value={weightData.sets} onChange={(e) => setWeightData({...weightData, sets: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="5" /></div>
                                        <div className="flex-1"><label className="text-xs text-orange-400 font-bold block mb-1">次數(Reps)</label><input type="number" value={weightData.reps} onChange={(e) => setWeightData({...weightData, reps: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-orange-500 text-center" placeholder="10" /></div>
                                        <div className="flex items-end"><button onClick={handleAddWeightExercise} className="bg-orange-500 hover:bg-orange-400 text-black p-3 rounded-xl shadow-lg active:scale-95 transition-all">＋</button></div>
                                    </div>
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                                        {weightExercises.map((ex, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2"><span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 bg-slate-400/20 text-slate-300`}>{ex.part}</span><span className="text-sm font-bold text-white">{ex.action}</span></div>
                                                    <span className="text-xs text-slate-400 mt-1 pl-1"><span className="text-orange-400 font-bold">{ex.weight}kg</span> x {ex.sets}組 x {ex.reps}下 {ex.volume ? <span className="text-slate-500 ml-1"> (總量: {ex.volume}kg)</span> : ''}</span>
                                                </div>
                                                <button onClick={() => handleRemoveWeightExercise(i)} className="text-slate-500 hover:text-red-400 p-2">🗑️</button>
                                            </div>
                                        ))}
                                        {weightExercises.length === 0 && <div className="text-center text-slate-600 text-xs py-2">尚未加入動作</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3"><button onClick={() => setSelectedDate(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">取消</button><button onClick={saveLog} disabled={isLoading} className={`flex-1 text-white py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${logType === 'run' ? 'bg-sky-600 hover:bg-sky-500' : logType === 'weight' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{isLoading ? "..." : "確認儲存"}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Generator, Analysis, Tools Views (Simplified for brevity, use previous full versions) ---
export const GeneratorView = ({ apiKey, requireKey, userProfile, db, user, methods, userLogs }) => <div className="p-8 text-center text-slate-500">請使用完整版程式碼以檢視此功能</div>;
export const AnalysisView = () => <div className="p-8 text-center text-slate-500">請使用完整版程式碼以檢視此功能</div>;
export const ToolsView = () => <div className="p-8 text-center text-slate-500">請使用完整版程式碼以檢視此功能</div>;