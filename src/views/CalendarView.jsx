import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart, CheckCircle2, Clock, Tag, ArrowLeft, Edit3, Copy, Move, AlignLeft, BarChart2, Upload, Flame, RefreshCw, FileCode, AlertTriangle, Download, ShoppingBag } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import FitParser from 'fit-file-parser';
// 引入新的 Prompt 產生器
import { getHeadCoachPrompt } from '../utils/aiPrompts';

const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const [monthlyMileage, setMonthlyMileage] = useState(0); // 新增：本月跑量統計

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

          // 計算本月跑量 (供總教練參考)
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

  // --- AI 總教練生成邏輯 (Head Coach Logic) ---
  const handleHeadCoachGenerate = async () => {
    const user = auth.currentUser;
    if (!user) return alert("請先登入");
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("請先設定 API Key");

    setIsGenerating(true);
    try {
        // 1. 準備資料：讀取個人檔案
        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        const userProfile = profileSnap.exists() ? profileSnap.data() : { goal: '健康' };

        // 2. 準備資料：讀取近期訓練紀錄 (Context)
        const recentLogs = await getAIContext(); // 這是 contextManager 整理好的摘要

        // 3. 準備資料：本月跑量
        const monthlyStats = { currentDist: monthlyMileage };

        // 4. 取得總教練 Prompt
        const targetDateStr = formatDate(selectedDate);
        const prompt = getHeadCoachPrompt(userProfile, recentLogs, targetDateStr, monthlyStats);
        
        // 5. 呼叫 AI
        const response = await runGemini(prompt, apiKey);
        
        // 6. 解析回傳的 JSON
        const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const plan = JSON.parse(cleanJson);

        // 7. 填入表單
        setEditForm(prev => ({
            ...prev,
            type: plan.type === 'run' ? 'run' : 'strength',
            title: plan.title,
            notes: `[總教練建議]\n${plan.advice}\n\n${prev.notes}`, // 將 AI 建議寫入備註
            // 如果是重訓
            exercises: plan.exercises || [],
            // 如果是跑步
            runDistance: plan.runDistance || '',
            runDuration: plan.runDuration || '',
            runPace: plan.runPace || '',
        }));

        // 自動切換 Tab 顯示對應欄位
        // (此處 UI 已綁定 editForm.type，會自動切換)

    } catch (error) {
        console.error(error);
        alert("總教練思考中斷，請重試 (可能是 JSON 格式錯誤)");
    } finally {
        setIsGenerating(false);
    }
  };

  // ...(其餘函式保持不變: handleSync, handleImportClick, handleCSVUpload, handleFitUpload, Drag&Drop, Save, Edit, Delete)...
  const handleSync = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
        await updateAIContext();
        await fetchMonthWorkouts();
        alert("同步完成！");
    } catch (error) {
        console.error("Sync failed:", error);
    } finally {
        setLoading(false);
    }
  };
  const handleImportClick = () => csvInputRef.current?.click();
  const handleCSVUpload = async (e) => { /* ...existing code... */ };
  const handleFitUpload = (file) => { /* ...existing code... */ };
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.fit')) { await handleFitUpload(file); }
    else if (fileName.endsWith('.csv')) { await handleCSVUpload(file); }
    else { alert("僅支援 .fit 或 .csv 檔案"); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleDragStart = (e, workout) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/json', JSON.stringify(workout));
    setDraggedWorkout(workout);
  };
  const handleDragOver = (e, dateStr) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? 'copy' : 'move';
    if (dragOverDate !== dateStr) setDragOverDate(dateStr);
  };
  const handleDrop = async (e, targetDateStr) => {
      e.preventDefault();
      setDragOverDate(null);
      const user = auth.currentUser;
      if (!user || !draggedWorkout) return;
      const isCopy = e.ctrlKey || e.metaKey; 
      const sourceDateStr = draggedWorkout.date;
      if (sourceDateStr === targetDateStr && !isCopy) return;
      try {
        setLoading(true);
        const targetDate = new Date(targetDateStr);
        const today = new Date();
        const isFuture = targetDate > today;
        const newData = {
          ...draggedWorkout,
          date: targetDateStr,
          status: isFuture ? 'planned' : (draggedWorkout.status === 'planned' ? 'completed' : draggedWorkout.status), 
          updatedAt: new Date().toISOString()
        };
        const { id, ...dataToSave } = newData;
        if (isCopy) {
          await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
        } else {
          const docRef = doc(db, 'users', user.uid, 'calendar', draggedWorkout.id);
          await updateDoc(docRef, { 
              date: targetDateStr,
              status: dataToSave.status,
              updatedAt: new Date().toISOString()
          });
        }
        updateAIContext();
        await fetchMonthWorkouts(); 
      } catch (error) {
        console.error("Drop error:", error);
      } finally {
        setLoading(false);
        setDraggedWorkout(null);
      }
  };
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setModalView('list');
    setIsModalOpen(true);
  };
  const handleAddNew = () => {
    const dateStr = formatDate(selectedDate);
    const todayStr = formatDate(new Date());
    const isFuture = dateStr > todayStr;
    setEditForm({
      status: isFuture ? 'planned' : 'completed',
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
    setCurrentDocId(null); 
    setModalView('form');
  };
  const handleEdit = (workout) => {
    setEditForm({
      status: workout.status || 'completed',
      type: workout.type || 'strength',
      title: workout.title || '',
      exercises: workout.exercises || [],
      runDistance: workout.runDistance || '',
      runDuration: workout.runDuration || '',
      runPace: workout.runPace || '',
      runPower: workout.runPower || '',
      runHeartRate: workout.runHeartRate || '',
      runRPE: workout.runRPE || '',
      notes: workout.notes || '',
      calories: workout.calories || '',
      gearId: workout.gearId || ''
    });
    setCurrentDocId(workout.id); 
    setModalView('form');
  };
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const isStrengthEmpty = editForm.type === 'strength' && editForm.exercises.length === 0 && !editForm.title;
    const isRunEmpty = editForm.type === 'run' && !editForm.runDistance && !editForm.title;
    if (isStrengthEmpty || isRunEmpty) {
      alert("請輸入標題或內容");
      return;
    }
    const dateStr = formatDate(selectedDate);
    const dataToSave = {
      ...editForm,
      date: dateStr, 
      updatedAt: new Date().toISOString()
    };
    try {
      if (currentDocId) {
        await setDoc(doc(db, 'users', user.uid, 'calendar', currentDocId), dataToSave);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
      }
      updateAIContext();
      await fetchMonthWorkouts();
      setModalView('list');
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("儲存失敗");
    }
  };
  const handleDelete = async () => {
    if (!currentDocId) return;
    const user = auth.currentUser;
    if (!user) return;
    if(!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'calendar', currentDocId));
      updateAIContext();
      await fetchMonthWorkouts();
      setModalView('list');
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };
  const handleExerciseNameChange = (idx, value) => {
    const newEx = [...editForm.exercises];
    newEx[idx].name = value;
    const detectedMuscle = detectMuscleGroup(value);
    if (detectedMuscle) {
        newEx[idx].targetMuscle = detectedMuscle;
    }
    setEditForm({...editForm, exercises: newEx});
  };
  const markAsDone = () => {
    setEditForm(prev => ({ ...prev, status: 'completed' }));
  };
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .fit" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-blue-500" />
          運動行事曆
        </h1>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={handleSync} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors border border-blue-500 disabled:opacity-50">
            {loading ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16} />}
            <span className="hidden md:inline">同步</span>
          </button>
          <button onClick={handleImportClick} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600" title="匯入 Garmin/運動APP CSV 或 FIT">
            <Upload size={16} /> <span className="hidden md:inline">匯入檔案</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600" title="下載雲端資料備份 (CSV)">
            <Download size={16} /> <span className="hidden md:inline">下載備份</span>
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
            if (isDragOver) {
                bgClass = 'bg-blue-900/40 border-blue-400 border-dashed scale-105 shadow-xl'; 
            } else if (isSelected) {
                bgClass = 'bg-blue-900/20 border-blue-500';
                textClass = 'text-blue-400';
            }
            return (
              <div 
                key={idx}
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={() => {}}
                onDrop={(e) => handleDrop(e, dateStr)}
                onClick={() => handleDateClick(cellDate)}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square overflow-hidden ${bgClass} ${isToday ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
              >
                <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                  {dayWorkouts.map((workout, wIdx) => {
                    const isRun = workout.type === 'run';
                    const isPlanned = workout.status === 'planned';
                    let summaryText = workout.title || '訓練';
                    if (isRun) {
                    } else {
                        if (workout.calories) summaryText += ` (${workout.calories}cal)`;
                        else if (Array.isArray(workout.exercises) && workout.exercises.length > 0) {
                             const firstEx = workout.exercises[0];
                             if (firstEx.name && firstEx.name.includes('匯入')) {
                                 summaryText += ` (${firstEx.sets}組)`;
                             } else {
                                 summaryText += ` (${workout.exercises.length}項目)`;
                             }
                        }
                    }
                    return (
                        <div 
                            key={workout.id || wIdx}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, workout)}
                            className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                                isPlanned ? 'border border-blue-500/50 text-blue-300 border-dashed' :
                                isRun ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                            }`}
                            title={summaryText}
                        >
                            {isPlanned && <Clock size={8} />}
                            {summaryText}
                        </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">
                    {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
                  </h2>
                  {modalView === 'list' && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">當日清單</span>}
                  {modalView === 'form' && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">{currentDocId ? '編輯' : '新增'}</span>}
                </div>
                <p className="text-gray-400 text-sm">
                  {modalView === 'list' ? '查看當日的運動行程' : '詳細記錄您的運動數據'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
                {modalView === 'list' && (
                    <div className="space-y-4">
                        {(!workouts[formatDate(selectedDate)] || workouts[formatDate(selectedDate)].length === 0) ? (
                            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                                <Dumbbell className="mx-auto mb-2 opacity-20" size={48} />
                                <p>當日尚無紀錄</p>
                                <p className="text-xs">點擊下方按鈕新增第一筆運動</p>
                            </div>
                        ) : (
                            workouts[formatDate(selectedDate)].map((workout) => {
                                const usedGear = gears.find(g => g.id === workout.gearId);
                                return (
                                <div key={workout.id} onClick={() => handleEdit(workout)} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-4 rounded-xl cursor-pointer transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${workout.type === 'run' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {workout.type === 'run' ? <Activity size={24}/> : <Dumbbell size={24}/>}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                {workout.title || (workout.type === 'run' ? '跑步訓練' : '重量訓練')}
                                                {workout.status === 'planned' && <span className="text-[10px] border border-blue-500 text-blue-400 px-1 rounded flex items-center gap-1"><Clock size={10}/> 計畫中</span>}
                                            </h3>
                                            <p className="text-gray-400 text-xs mt-1">
                                                {workout.type === 'run' 
                                                    ? `${workout.runDistance || 0} km • ${workout.runDuration || 0} min` 
                                                    : workout.notes 
                                                        ? (() => { const match = workout.notes.match(/總組數\s*(\d+)/); return match ? `${match[1]} 組 • ${workout.runDuration || 0} min` : `${workout.exercises?.length || 0} 個動作`; })()
                                                        : `${workout.exercises?.length || 0} 個動作`}
                                            </p>
                                            {usedGear && <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-300"><ShoppingBag size={10} /> {usedGear.brand} {usedGear.model}</div>}
                                        </div>
                                    </div>
                                    <div className="text-gray-500 group-hover:text-white"><Edit3 size={18} /></div>
                                </div>
                            )})
                        )}
                        <button onClick={handleAddNew} className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 font-bold"><Plus size={20} /> 新增運動</button>
                    </div>
                )}
                
                {modalView === 'form' && (
                    <div className="space-y-6">
                        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 mb-4">
                            <button onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'strength' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Dumbbell size={16} /> 重量訓練</button>
                            <button onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'run' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Activity size={16} /> 跑步有氧</button>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">標題 / 備註</label>
                            <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder={editForm.type === 'run' ? "例如：晨跑 5K" : "例如：腿部轟炸日"} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 outline-none" />
                        </div>
                        {editForm.type === 'strength' ? (
                            <>
                            {/* AI 總教練按鈕 */}
                            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 rounded-xl border border-purple-500/30">
                                <label className="text-xs text-purple-300 uppercase font-semibold mb-2 block flex items-center gap-1"><Sparkles size={12} /> AI 總教練排程</label>
                                <div className="flex gap-2">
                                  <button onClick={handleHeadCoachGenerate} disabled={isGenerating} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                    {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    為今日安排最佳重訓
                                  </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><label className="text-xs text-gray-500 uppercase font-semibold">動作清單</label><button onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', targetMuscle: '' }] }))} className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"><Plus size={12} /> 新增動作</button></div>
                                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 uppercase"><div className="col-span-1 text-center">#</div><div className="col-span-4">動作名稱</div><div className="col-span-2 text-center">組數</div><div className="col-span-2 text-center">次數</div><div className="col-span-2 text-center">重量 (kg)</div><div className="col-span-1"></div></div>
                                {editForm.exercises.map((ex, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800 p-2 rounded-lg border border-gray-700 group">
                                    <div className="col-span-1 w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-gray-400 font-mono text-xs mx-auto">{idx + 1}</div>
                                    <div className="col-span-4 relative"><input placeholder="動作名稱 (例: 臥推)" value={ex.name} onChange={e => handleExerciseNameChange(idx, e.target.value)} className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600" />{ex.targetMuscle && <span className="absolute -bottom-3 left-0 text-[10px] text-green-400 bg-green-900/30 px-1 rounded flex items-center gap-0.5"><Tag size={8} /> {ex.targetMuscle}</span>}</div>
                                    <div className="col-span-2"><input placeholder="3" value={ex.sets} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].sets = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                                    <div className="col-span-2"><input placeholder="10" value={ex.reps} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].reps = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                                    <div className="col-span-2"><input placeholder="kg" value={ex.weight} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].weight = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                                    <div className="col-span-1 text-center"><button onClick={() => { const newEx = editForm.exercises.filter((_, i) => i !== idx); setEditForm({...editForm, exercises: newEx}); }} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700"><Trash2 size={16} /></button></div>
                                </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-2 gap-4">
                                <h4 className="col-span-2 text-xs text-gray-500 uppercase font-semibold mb-1">訓練數據總覽 (選填)</h4>
                                <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Timer size={12} /> 總時間 (分)</label><input type="number" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="例如: 60" /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Flame size={12} /> 卡路里 (kcal)</label><input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="例如: 300" /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Heart size={12} /> 平均心率 (bpm)</label><input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="例如: 130" /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><BarChart2 size={12} /> RPE (1-10)</label><input type="number" min="1" max="10" value={editForm.runRPE} onChange={e => setEditForm({...editForm, runRPE: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="例如: 8" /></div>
                                <div className="col-span-2 space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><AlignLeft size={12} /> 備註</label><textarea rows="2" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" placeholder="訓練心得..." /></div>
                            </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {/* AI 總教練按鈕 (跑步) */}
                                <div className="col-span-2 bg-gradient-to-r from-orange-900/30 to-red-900/30 p-4 rounded-xl border border-orange-500/30 mb-4">
                                    <label className="text-xs text-orange-300 uppercase font-semibold mb-2 block flex items-center gap-1"><Sparkles size={12} /> AI 總教練排程</label>
                                    <button onClick={handleHeadCoachGenerate} disabled={isGenerating} className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        為今日安排最佳跑步課表
                                    </button>
                                </div>

                                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">距離 (km)</label><input type="number" step="0.01" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} placeholder="0.00" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">時間 (分鐘)</label><input type="number" step="1" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} placeholder="0" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" /></div>
                                <div className="col-span-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between"><div><div className="text-xs text-gray-500 uppercase">平均配速 (自動計算)</div><div className="text-xl font-bold text-orange-400 font-mono">{editForm.runPace || '--\'--" /km'}</div></div><Timer className="text-orange-500 opacity-20" size={32} /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">平均功率 (W)</label><input type="number" value={editForm.runPower} onChange={e => setEditForm({...editForm, runPower: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono" /></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">平均心率 (bpm)</label><input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono" /></div>
                                <div className="col-span-2 space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><ShoppingBag size={12} /> 選擇裝備 (跑鞋)</label><select value={editForm.gearId} onChange={e => setEditForm({...editForm, gearId: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none appearance-none"><option value="">-- 未指定 --</option>{gears.filter(g => g.status === 'active' || g.id === editForm.gearId).map(g => (<option key={g.id} value={g.id}>{g.brand} {g.model}</option>))}</select></div>
                                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><BarChart2 size={12} /> 自覺強度 (RPE 1-10)</label><input type="number" min="1" max="10" value={editForm.runRPE} onChange={e => setEditForm({...editForm, runRPE: e.target.value})} placeholder="例如: 7" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono" /></div>
                                <div className="col-span-2 space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><AlignLeft size={12} /> 訓練備註</label><textarea rows="3" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="今天感覺如何？天氣、路線..." className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none resize-none" /></div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-between items-center">
                {modalView === 'list' ? (
                    <div className="w-full flex justify-end"><button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors">關閉</button></div>
                ) : (
                    <>
                        <div className="flex gap-3">
                            <button onClick={() => setModalView('list')} className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2"><ArrowLeft size={18} /> 返回清單</button>
                            {currentDocId && (<button onClick={handleDelete} className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2"><Trash2 size={18} /> 刪除</button>)}
                        </div>
                        <div className="flex gap-3 items-center">
                            {editForm.status === 'planned' && (<button onClick={markAsDone} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors animate-pulse-slow"><CheckCircle2 size={18} /> 完成此訓練</button>)}
                            <button onClick={handleSave} className={`px-6 py-2 text-white rounded-lg font-bold transition-colors flex items-center gap-2 ${editForm.status === 'planned' ? 'bg-blue-600 hover:bg-blue-700' : editForm.type === 'run' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}><Save size={18} /> {editForm.status === 'planned' ? '儲存計畫' : '儲存紀錄'}</button>
                        </div>
                    </>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}