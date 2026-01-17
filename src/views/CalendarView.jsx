import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart, CheckCircle2, Clock, Tag, ArrowLeft, Edit3, Copy, Move, AlignLeft, BarChart2, Upload, Flame, RefreshCw, FileCode, AlertTriangle, Download, ShoppingBag, CalendarDays } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import FitParser from 'fit-file-parser';
import { getHeadCoachPrompt, getWeeklySchedulerPrompt } from '../utils/aiPrompts';

const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 取得本週所有日期 (週一至週日)
const getWeekDates = (baseDate) => {
  const current = new Date(baseDate);
  const day = current.getDay(); // 0=Sun, 1=Mon
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(current.setDate(diff));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatDate(d));
  }
  return weekDates;
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState({});
  const [gears, setGears] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('list'); 
  const [currentDocId, setCurrentDocId] = useState(null); 
  
  // 週排程相關狀態
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyPrefs, setWeeklyPrefs] = useState({}); // { '2023-10-23': 'strength', ... }

  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    status: 'completed',
    type: 'strength',
    title: '',
    exercises: [], 
    runDistance: '',   
    runDuration: '',   
    runPace: '',       
    runPower: '',      
    runHeartRate: '',
    runRPE: '',       
    notes: '',
    calories: '',
    gearId: '' 
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyMileage, setMonthlyMileage] = useState(0); 

  useEffect(() => {
    const fetchGears = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const q = query(collection(db, 'users', user.uid, 'gears'));
            const snapshot = await getDocs(q);
            const gearList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGears(gearList);
        } catch (error) {
            console.error("Error fetching gears:", error);
        }
    };
    fetchGears();
  }, []);

  useEffect(() => {
    if (editForm.type === 'run' && editForm.runDistance && editForm.runDuration) {
      const dist = parseFloat(editForm.runDistance);
      const time = parseFloat(editForm.runDuration);
      if (dist > 0 && time > 0) {
        const paceDecimal = time / dist;
        const paceMin = Math.floor(paceDecimal);
        const paceSec = Math.round((paceDecimal - paceMin) * 60);
        setEditForm(prev => ({ ...prev, runPace: `${paceMin}'${String(paceSec).padStart(2, '0')}" /km` }));
      }
    }
  }, [editForm.runDistance, editForm.runDuration, editForm.type]);

  useEffect(() => {
    fetchMonthWorkouts();
  }, [currentDate]);

  const fetchMonthWorkouts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'calendar')); 
      const querySnapshot = await getDocs(q);
      
      const groupedWorkouts = {};
      let totalDist = 0;
      const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateKey = data.date;
        if (dateKey) {
          if (!groupedWorkouts[dateKey]) {
            groupedWorkouts[dateKey] = [];
          }
          groupedWorkouts[dateKey].push({ id: doc.id, ...data });

          if (data.type === 'run' && data.status === 'completed' && dateKey.startsWith(currentMonthStr)) {
              totalDist += parseFloat(data.runDistance || 0);
          }
        }
      });
      setWorkouts(groupedWorkouts);
      setMonthlyMileage(totalDist);

    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- AI 總教練生成邏輯 (單日) ---
  const handleHeadCoachGenerate = async () => {
    const user = auth.currentUser;
    if (!user) return alert("請先登入");
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("請先設定 API Key");

    setIsGenerating(true);
    try {
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        const userProfile = profileSnap.exists() ? profileSnap.data() : { goal: '健康' };
        const recentLogs = await getAIContext();
        const monthlyStats = { currentDist: monthlyMileage };
        const targetDateStr = formatDate(selectedDate);
        
        let prompt = getHeadCoachPrompt(userProfile, recentLogs, targetDateStr, monthlyStats);
        prompt += "\n\nIMPORTANT: Output ONLY raw JSON. Do not use Markdown code blocks.";

        const response = await runGemini(prompt, apiKey);
        
        let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = cleanJson.indexOf('{');
        const endIndex = cleanJson.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) {
            cleanJson = cleanJson.substring(startIndex, endIndex + 1);
        }
        
        const plan = JSON.parse(cleanJson);
        const cleanNumber = (val) => {
             if (typeof val === 'number') return val;
             if (typeof val === 'string') return parseFloat(val.replace(/[^\d.]/g, '')) || '';
             return '';
        };

        setEditForm(prev => ({
            ...prev,
            status: 'planned',
            type: plan.type === 'run' ? 'run' : 'strength',
            title: plan.title,
            notes: `[總教練建議]\n${plan.advice}\n\n${prev.notes || ''}`,
            exercises: plan.exercises || [],
            runDistance: cleanNumber(plan.runDistance),
            runDuration: cleanNumber(plan.runDuration),
            runPace: plan.runPace || '',
            runHeartRate: plan.runHeartRate || '', 
        }));
        
        alert("總教練已生成課表！");

    } catch (error) {
        console.error("AI Gen Error:", error);
        alert(`總教練思考中斷: ${error.message}`);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- AI 週排程邏輯 (Batch Generation) ---
  const handleWeeklyGenerate = async () => {
    const user = auth.currentUser;
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!user || !apiKey) return alert("請先登入並設定 API Key");

    setLoading(true);
    try {
        const weekDates = getWeekDates(currentDate);
        const planningDates = [];
        
        // 篩選出需要規劃的日期 (排除已完成)
        weekDates.forEach(date => {
            const dayWorkouts = workouts[date] || [];
            const hasCompleted = dayWorkouts.some(w => w.status === 'completed');
            const pref = weeklyPrefs[date];
            
            // 如果這天還沒完成，且使用者沒有設為 '休息'，則加入規劃
            if (!hasCompleted && pref !== 'rest') {
                planningDates.push(date);
            }
        });

        if (planningDates.length === 0) {
            alert("本週所有日期皆已完成或設定為休息，無需規劃。");
            setLoading(false);
            return;
        }

        // 準備 AI 資料
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        const userProfile = profileSnap.exists() ? profileSnap.data() : { goal: '健康' };
        const recentLogs = await getAIContext();
        const monthlyStats = { currentDist: monthlyMileage };

        // 呼叫 Prompt
        let prompt = getWeeklySchedulerPrompt(userProfile, recentLogs, planningDates, weeklyPrefs, monthlyStats);
        prompt += "\n\nIMPORTANT: Output ONLY raw JSON Array. No Markdown.";

        const response = await runGemini(prompt, apiKey);
        
        let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = cleanJson.indexOf('[');
        const endIndex = cleanJson.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1) {
            cleanJson = cleanJson.substring(startIndex, endIndex + 1);
        }

        const plans = JSON.parse(cleanJson);

        // 批次寫入 Firestore
        const batchPromises = plans.map(async (plan) => {
            if (plan.type === 'rest') return; // 休息日不寫入
            
            const dataToSave = {
                date: plan.date,
                status: 'planned',
                type: plan.type === 'run' ? 'run' : 'strength',
                title: plan.title || 'AI 訓練計畫',
                notes: `[總教練週計畫]\n${plan.advice || ''}`,
                exercises: plan.exercises || [],
                runDistance: plan.runDistance || '',
                runDuration: plan.runDuration || '',
                runPace: plan.runPace || '',
                runHeartRate: plan.runHeartRate || '',
                updatedAt: new Date().toISOString()
            };
            
            // 新增文件
            await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
        });

        await Promise.all(batchPromises);
        
        await fetchMonthWorkouts();
        setShowWeeklyModal(false);
        alert(`成功生成 ${plans.length} 筆訓練計畫！`);

    } catch (error) {
        console.error("Weekly Gen Error:", error);
        alert(`生成失敗: ${error.message}\n請確認選擇是否正確。`);
    } finally {
        setLoading(false);
    }
  };

  const openWeeklyModal = () => {
      const weekDates = getWeekDates(currentDate);
      const initialPrefs = {};
      weekDates.forEach(date => {
          initialPrefs[date] = 'auto'; // 預設自動
      });
      setWeeklyPrefs(initialPrefs);
      setShowWeeklyModal(true);
  };

  // ... (保留原有的 Sync, Export, Import, DragDrop 邏輯) ...
  const handleSync = async () => { /*...*/ await updateAIContext(); await fetchMonthWorkouts(); alert("同步完成！"); };
  const handleExport = async () => { /*...Original Export Logic...*/ };
  const handleImportClick = () => csvInputRef.current?.click();
  const handleCSVUpload = async (e) => { /*...Original CSV Logic...*/ };
  const handleFileUpload = async (e) => { /*...Original File Upload Logic...*/ };
  const handleFitUpload = (file) => { /*...Original FIT Logic...*/ };
  const handleDragStart = (e, workout) => { /*...*/ };
  const handleDragOver = (e, dateStr) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
  const handleDrop = async (e, targetDateStr) => { /*...Original Drop Logic...*/ };
  const handleDateClick = (date) => { setSelectedDate(date); setModalView('list'); setIsModalOpen(true); };
  const handleAddNew = () => { /*...*/ setEditForm({ ...editForm, status: 'planned' }); setCurrentDocId(null); setModalView('form'); };
  const handleEdit = (workout) => { /*...*/ setCurrentDocId(workout.id); setModalView('form'); };
  const handleDelete = async () => { /*...*/ };
  const handleSave = async () => { /*...*/ };
  const markAsDone = () => { setEditForm(prev => ({ ...prev, status: 'completed' })); };
  const handleExerciseNameChange = (idx, value) => { /*...*/ };

  // 日曆邏輯
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  // 取得本週日期供 Modal 顯示
  const weekDateList = getWeekDates(currentDate);

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .fit" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-500" />
            運動行事曆
            </h1>
            {/* 新增：週排程按鈕 */}
            <button 
                onClick={openWeeklyModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/30 transition-all"
            >
                <CalendarDays size={18} /> 本週總教練排程
            </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={handleSync} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors border border-blue-500">
            {loading ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16} />}
            <span className="hidden md:inline">同步</span>
          </button>
          <button onClick={handleImportClick} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600">
            <Upload size={16} /> <span className="hidden md:inline">匯入</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600">
            <Download size={16} /> <span className="hidden md:inline">備份</span>
          </button>
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-700 rounded-md text-white"><ChevronLeft size={20}/></button>
            <span className="text-sm md:text-base font-mono text-white min-w-[100px] text-center">
                {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
            </span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-700 rounded-md text-white"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 p-2 rounded-lg text-xs text-gray-400 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1"><Move size={12}/> 拖曳可移動日期</span>
        <span className="flex items-center gap-1"><Copy size={12}/> 按住 Ctrl 拖曳可複製</span>
      </div>

      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-y-auto">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 auto-rows-fr">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="bg-transparent aspect-square"></div>;
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = formatDate(cellDate);
            const dayWorkouts = workouts[dateStr] || []; 
            const isSelected = formatDate(selectedDate) === dateStr;
            const isToday = formatDate(new Date()) === dateStr;
            const isDragOver = dragOverDate === dateStr;
            let bgClass = 'bg-gray-900 border-gray-700';
            let textClass = 'text-gray-300';
            if (isDragOver) bgClass = 'bg-blue-900/40 border-blue-400 border-dashed scale-105 shadow-xl'; 
            else if (isSelected) { bgClass = 'bg-blue-900/20 border-blue-500'; textClass = 'text-blue-400'; }
            
            return (
              <div 
                key={idx}
                onDragOver={(e) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); }}
                onDrop={(e) => { /* Drop Logic reused */ }}
                onClick={() => handleDateClick(cellDate)}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square overflow-hidden ${bgClass} ${isToday ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
              >
                <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                  {dayWorkouts.map((workout, wIdx) => {
                    const isRun = workout.type === 'run';
                    const isPlanned = workout.status === 'planned';
                    return (
                        <div 
                            key={workout.id || wIdx}
                            draggable={true}
                            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'copyMove'; e.dataTransfer.setData('application/json', JSON.stringify(workout)); setDraggedWorkout(workout); }}
                            className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                                isPlanned ? 'border border-blue-500/50 text-blue-300 border-dashed' :
                                isRun ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                            }`}
                            title={workout.title}
                        >
                            {isPlanned && <Clock size={8} />}
                            {workout.title || (isRun ? '跑步' : '訓練')}
                        </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 週排程 Modal */}
      {showWeeklyModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <CalendarDays className="text-purple-500" /> 本週總教練排程
                    </h3>
                    <button onClick={() => setShowWeeklyModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                
                <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-500/30 mb-6 text-sm text-purple-200">
                    <p>請設定本週剩餘日期的訓練重點，AI 將根據您的月跑量目標 (80km) 與恢復狀態自動填入課表。</p>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto mb-6">
                    {weekDateList.map(date => {
                        const dayWorkouts = workouts[date] || [];
                        const hasCompleted = dayWorkouts.some(w => w.status === 'completed');
                        const dayName = new Date(date).toLocaleDateString('zh-TW', { weekday: 'long' });
                        
                        return (
                            <div key={date} className={`flex items-center justify-between p-3 rounded-lg border ${hasCompleted ? 'bg-gray-800 border-gray-700 opacity-60' : 'bg-gray-800 border-gray-600'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-400 font-mono w-24">{date}</span>
                                    <span className="text-white font-bold">{dayName}</span>
                                    {hasCompleted && <span className="text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded">已完成</span>}
                                </div>
                                
                                {!hasCompleted ? (
                                    <select 
                                        value={weeklyPrefs[date] || 'auto'}
                                        onChange={(e) => setWeeklyPrefs({...weeklyPrefs, [date]: e.target.value})}
                                        className="bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 outline-none focus:border-purple-500"
                                    >
                                        <option value="auto">🤖 AI 決定</option>
                                        <option value="rest">😴 休息日</option>
                                        <option value="strength">🏋️ 重訓日</option>
                                        <option value="run_lsd">🐢 長距離跑 (LSD)</option>
                                        <option value="run_interval">🐇 間歇跑</option>
                                        <option value="run_easy">👟 輕鬆跑</option>
                                        <option value="run_mp">🔥 馬拉松配速</option>
                                    </select>
                                ) : (
                                    <span className="text-xs text-gray-500 italic">無需排程</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                <button 
                    onClick={handleWeeklyGenerate} 
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader className="animate-spin" /> : <Sparkles />}
                    生成本週課表
                </button>
            </div>
        </div>
      )}

      {/* 原有的編輯 Modal (保留不變，省略內容以節省空間，請保持原樣) */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             {/* ...Modal Content (Reuse existing code)... */}
             <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">
                            {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
                        </h2>
                        {modalView === 'list' && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">當日清單</span>}
                        {modalView === 'form' && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">{currentDocId ? '編輯' : '新增'}</span>}
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {/* List View */}
                    {modalView === 'list' && (
                        <div className="space-y-4">
                            {(!workouts[formatDate(selectedDate)] || workouts[formatDate(selectedDate)].length === 0) ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                                    <p>當日尚無紀錄</p>
                                </div>
                            ) : (
                                workouts[formatDate(selectedDate)].map((workout) => (
                                    <div key={workout.id} onClick={() => { setCurrentDocId(workout.id); setEditForm(workout); setModalView('form'); }} className="bg-gray-800 p-4 rounded-xl border border-gray-700 cursor-pointer">
                                        <h3 className="text-white font-bold">{workout.title}</h3>
                                        <p className="text-xs text-gray-400">{workout.type === 'run' ? `${workout.runDistance}km` : `${workout.exercises?.length}動作`}</p>
                                    </div>
                                ))
                            )}
                            <button onClick={() => { setCurrentDocId(null); setModalView('form'); }} className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:text-white"><Plus /> 新增運動</button>
                        </div>
                    )}

                    {/* Form View (簡化示意，請保留原完整表單) */}
                    {modalView === 'form' && (
                        <div className="space-y-6">
                            {/* ...表單內容... */}
                            <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 mb-4">
                                <button onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))} className={`flex-1 py-2 rounded-md text-sm font-bold ${editForm.type === 'strength' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>重訓</button>
                                <button onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))} className={`flex-1 py-2 rounded-md text-sm font-bold ${editForm.type === 'run' ? 'bg-orange-600 text-white' : 'text-gray-400'}`}>跑步</button>
                            </div>
                            <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3" placeholder="標題" />
                            
                            {editForm.type === 'strength' && (
                                <div className="space-y-3">
                                    <div className="bg-purple-900/30 p-4 rounded-xl border border-purple-500/30">
                                        <button onClick={handleHeadCoachGenerate} disabled={isGenerating} className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex justify-center gap-2">
                                            {isGenerating ? <Loader className="animate-spin"/> : <Sparkles/>} AI 單日排程
                                        </button>
                                    </div>
                                    {/* 動作清單 UI... */}
                                </div>
                            )}

                            {editForm.type === 'run' && (
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="col-span-2 bg-purple-900/30 p-4 rounded-xl border border-purple-500/30">
                                        <button onClick={handleHeadCoachGenerate} disabled={isGenerating} className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex justify-center gap-2">
                                            {isGenerating ? <Loader className="animate-spin"/> : <Sparkles/>} AI 單日排程
                                        </button>
                                    </div>
                                    <input type="number" placeholder="距離" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2" />
                                    <input type="number" placeholder="時間" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} className="bg-gray-800 text-white border border-gray-700 rounded px-3 py-2" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 flex justify-between">
                     {modalView === 'form' && (
                         <>
                            <button onClick={() => setModalView('list')} className="text-gray-400">返回</button>
                            <button onClick={async () => {
                                // Save Logic
                                const dataToSave = { ...editForm, date: formatDate(selectedDate), updatedAt: new Date().toISOString() };
                                if (currentDocId) await setDoc(doc(db, 'users', auth.currentUser.uid, 'calendar', currentDocId), dataToSave);
                                else await addDoc(collection(db, 'users', auth.currentUser.uid, 'calendar'), dataToSave);
                                await fetchMonthWorkouts();
                                setModalView('list');
                            }} className="bg-blue-600 text-white px-6 py-2 rounded-lg">儲存</button>
                         </>
                     )}
                </div>
             </div>
          </div>
      )}
    </div>
  );
}