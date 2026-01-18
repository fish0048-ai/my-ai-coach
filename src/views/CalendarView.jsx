import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart, CheckCircle2, Clock, Tag, ArrowLeft, Edit3, Copy, Move, AlignLeft, BarChart2, Upload, Flame, RefreshCw, FileCode, AlertTriangle, Download, ShoppingBag } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import FitParser from 'fit-file-parser';
import { getHeadCoachPrompt } from '../utils/aiPrompts';
// 修正：只匯入需要的函式，移除 formatDate 等未匯出的項目
import { parseAndUploadFIT, parseAndUploadCSV } from '../utils/importHelpers';
import WorkoutForm from '../components/Calendar/WorkoutForm';

// --- 本地定義輔助函式 (避免匯入錯誤) ---

const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDates = (baseDate) => {
  const current = new Date(baseDate);
  const day = current.getDay(); 
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(current.setDate(diff));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatDate(d));
  }
  return weekDates;
};

const cleanNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/[^\d.]/g, '')) || '';
    return '';
};

// 本地定義 CSV 生成邏輯
const generateCSVData = async (uid, gears) => {
    const q = query(collection(db, 'users', uid, 'calendar'));
    const querySnapshot = await getDocs(q);
    const headers = ['活動類型', '日期', '標題', '距離', '時間', '平均心率', '平均功率', '卡路里', '總組數', '裝備', '備註'];
    const rows = [headers];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const type = data.type === 'run' ? '跑步' : '肌力訓練';
      let totalSets = 0;
      if (data.exercises && Array.isArray(data.exercises)) {
          totalSets = data.exercises.reduce((sum, ex) => sum + (parseInt(ex.sets) || 0), 0);
      }
      const gearName = gears.find(g => g.id === data.gearId)?.model || '';
      const row = [
          type, data.date || '', data.title || '', data.runDistance || '', data.runDuration || '',
          data.runHeartRate || '', data.runPower || '', data.calories || '',
          totalSets > 0 ? totalSets : '', gearName, data.notes || ''
      ];
      const escapedRow = row.map(field => {
          const str = String(field ?? '');
          if (str.includes(',') || str.includes('\n') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
          return str;
      });
      rows.push(escapedRow);
    });

    return "\uFEFF" + rows.map(r => r.join(",")).join("\n");
};

// --- 組件主體 ---
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
    status: 'completed', type: 'strength', title: '', exercises: [], 
    runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: '' 
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyMileage, setMonthlyMileage] = useState(0); 

  useEffect(() => {
    const fetchGears = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const q = query(collection(db, 'users', user.uid, 'gears'));
            const snapshot = await getDocs(q);
            setGears(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error(error); }
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

  useEffect(() => { fetchMonthWorkouts(); }, [currentDate]);

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
        if (data.date) {
          if (!groupedWorkouts[data.date]) groupedWorkouts[data.date] = [];
          groupedWorkouts[data.date].push({ id: doc.id, ...data });
          if (data.type === 'run' && data.status === 'completed' && data.date.startsWith(currentMonthStr)) {
              totalDist += parseFloat(data.runDistance || 0);
          }
        }
      });
      setWorkouts(groupedWorkouts);
      setMonthlyMileage(totalDist);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleStatusToggle = async (e, workout) => {
      e.stopPropagation();
      const user = auth.currentUser;
      if (!user) return;
      const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
      try {
          await updateDoc(doc(db, 'users', user.uid, 'calendar', workout.id), {
              status: newStatus,
              updatedAt: new Date().toISOString()
          });
          await fetchMonthWorkouts();
          await updateAIContext();
      } catch (err) { console.error(err); }
  };

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
        prompt += "\n\nIMPORTANT: Output ONLY raw JSON.";
        const response = await runGemini(prompt, apiKey);
        
        let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = cleanJson.indexOf('{');
        const endIndex = cleanJson.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1) cleanJson = cleanJson.substring(startIndex, endIndex + 1);
        
        const plan = JSON.parse(cleanJson);
        const cleanVal = (val) => (typeof val === 'number' ? val : parseFloat(val?.replace(/[^\d.]/g, '')) || '');

        setEditForm(prev => ({
            ...prev,
            status: 'planned',
            type: plan.type === 'run' ? 'run' : 'strength',
            title: plan.title,
            notes: `[總教練建議]\n${plan.advice}\n\n${prev.notes || ''}`,
            exercises: plan.exercises || [],
            runDistance: cleanVal(plan.runDistance),
            runDuration: cleanVal(plan.runDuration),
            runPace: plan.runPace || '',
            runHeartRate: plan.runHeartRate || '', 
        }));
        alert("總教練已生成課表！");
    } catch (error) {
        console.error("AI Gen Error:", error);
        alert("總教練思考中斷，請重試");
    } finally { setIsGenerating(false); }
  };

  const handleSync = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try { await updateAIContext(); await fetchMonthWorkouts(); alert("同步完成！"); } catch (error) { console.error("Sync failed:", error); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
        const csvContent = await generateCSVData(user.uid, gears);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const today = formatDate(new Date());
        link.setAttribute("download", `training_backup_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) { alert("匯出失敗"); } finally { setLoading(false); }
  };

  const handleImportClick = () => csvInputRef.current?.click();
  const handleCSVUpload = async (e) => { 
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      try {
          const result = await parseAndUploadCSV(file);
          if (result.success) {
               await fetchMonthWorkouts();
               alert(result.message);
          } else {
               alert(result.message || "匯入失敗");
          }
      } catch (err) { console.error(err); alert("匯入發生錯誤"); } finally { setLoading(false); if (csvInputRef.current) csvInputRef.current.value = ''; }
  };
  const handleFileUpload = async (e) => { 
      const file = e.target.files?.[0];
      if (!file) return;
      const fileName = file.name.toLowerCase();
      setLoading(true);
      try {
          const fileName = file.name.toLowerCase();
          let result;
          if (fileName.endsWith('.fit')) result = await parseAndUploadFIT(file);
          else if (fileName.endsWith('.csv')) result = await parseAndUploadCSV(file);
          else { alert("僅支援 .fit 或 .csv 檔案"); setLoading(false); return; }
          
          if (result.success) {
            await fetchMonthWorkouts();
            alert(result.message);
          }
      } catch (err) { alert(err); } finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };
  
  const handleDragStart = (e, workout) => { e.dataTransfer.setData('application/json', JSON.stringify(workout)); setDraggedWorkout(workout); };
  const handleDragOver = (e, dateStr) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
  const handleDrop = async (e, targetDateStr) => {
      e.preventDefault(); setDragOverDate(null);
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
          ...draggedWorkout, date: targetDateStr,
          status: isFuture ? 'planned' : (draggedWorkout.status === 'planned' ? 'completed' : draggedWorkout.status), 
          updatedAt: new Date().toISOString()
        };
        const { id, ...dataToSave } = newData;
        if (isCopy) await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
        else await updateDoc(doc(db, 'users', user.uid, 'calendar', draggedWorkout.id), { date: targetDateStr, status: dataToSave.status, updatedAt: new Date().toISOString() });
        updateAIContext(); await fetchMonthWorkouts(); 
      } catch (error) {} finally { setLoading(false); setDraggedWorkout(null); }
  };
  const handleDateClick = (date) => { setSelectedDate(date); setModalView('list'); setIsModalOpen(true); };
  const handleAddNew = () => {
    const dateStr = formatDate(selectedDate);
    const todayStr = formatDate(new Date());
    const isFuture = dateStr > todayStr;
    setEditForm({
      status: isFuture ? 'planned' : 'completed', type: 'strength', title: '', exercises: [], 
      runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: ''
    });
    setCurrentDocId(null); setModalView('form');
  };
  const handleEdit = (workout) => {
    setEditForm({
      status: workout.status || 'completed', type: workout.type || 'strength', title: workout.title || '',
      exercises: workout.exercises || [], runDistance: workout.runDistance || '', runDuration: workout.runDuration || '',
      runPace: workout.runPace || '', runPower: workout.runPower || '', runHeartRate: workout.runHeartRate || '',
      runRPE: workout.runRPE || '', notes: workout.notes || '', calories: workout.calories || '', gearId: workout.gearId || ''
    });
    setCurrentDocId(workout.id); setModalView('form');
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
    const dataToSave = { ...editForm, date: dateStr, updatedAt: new Date().toISOString() };
    try {
      if (currentDocId) await setDoc(doc(db, 'users', user.uid, 'calendar', currentDocId), dataToSave);
      else await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
      updateAIContext(); await fetchMonthWorkouts(); setModalView('list');
    } catch (error) { alert("儲存失敗"); }
  };
  const handleDelete = async () => {
    if (!currentDocId) return;
    if(!window.confirm("確定刪除？")) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'calendar', currentDocId));
      updateAIContext(); await fetchMonthWorkouts(); setModalView('list');
    } catch (error) { alert("刪除失敗"); }
  };
  const handleExerciseNameChange = (idx, value) => {
    const newEx = [...editForm.exercises];
    newEx[idx].name = value;
    const detectedMuscle = detectMuscleGroup(value);
    if (detectedMuscle) newEx[idx].targetMuscle = detectedMuscle;
    setEditForm({...editForm, exercises: newEx});
  };
  const markAsDone = () => setEditForm(prev => ({ ...prev, status: 'completed' }));
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = []; for (let i = 0; i < firstDayOfMonth; i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

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
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={handleSync} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors border border-blue-500 disabled:opacity-50">
            {loading ? <Loader size={16} className="animate-spin"/> : <RefreshCw size={16} />}
            <span className="hidden md:inline">同步</span>
          </button>
          <button onClick={handleImportClick} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600" title="匯入 Garmin/運動APP CSV 或 FIT">
            <Upload size={16} /> <span className="hidden md:inline">匯入檔案</span>
          </button>
          <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600" title="下載雲端資料備份 (CSV)">
            <Download size={16} /> <span className="hidden md:inline">備份</span>
          </button>
          <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-700 rounded-md text-white"><ChevronLeft size={20}/></button>
            <span className="text-sm md:text-base font-mono text-white min-w-[100px] text-center">{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</span>
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
            
            // 修正：明確定義變數 (預設灰色)
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
                onDragOver={(e) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); }}
                onDrop={(e) => handleDrop(e, dateStr)}
                onClick={() => handleDateClick(cellDate)}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square overflow-hidden ${bgClass} ${isToday ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
              >
                <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                  {dayWorkouts.map((workout, wIdx) => {
                    const isRun = workout.type === 'run';
                    // const isPlanned = workout.status === 'planned'; // Remove unused
                    return (
                        <div 
                            key={workout.id || wIdx}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, workout)}
                            className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                                workout.status === 'planned' ? 'border border-blue-500/50 text-blue-300 border-dashed' :
                                isRun ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                            }`}
                            title={workout.title}
                        >
                            {workout.status === 'planned' && <Clock size={8} />}
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
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    {modalView === 'list' && (
                        <div className="space-y-4">
                            {(!workouts[formatDate(selectedDate)] || workouts[formatDate(selectedDate)].length === 0) ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                                    <p>當日尚無紀錄</p>
                                </div>
                            ) : (
                                workouts[formatDate(selectedDate)].map((workout) => {
                                    const usedGear = gears.find(g => g.id === workout.gearId);
                                    return (
                                    <div key={workout.id} onClick={() => { setCurrentDocId(workout.id); setEditForm(workout); setModalView('form'); }} className="bg-gray-800 p-4 rounded-xl border border-gray-700 cursor-pointer flex justify-between items-center group hover:border-blue-500 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${workout.type === 'run' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {workout.type === 'run' ? <Activity size={24}/> : <Dumbbell size={24}/>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{workout.title}</h3>
                                                <p className="text-xs text-gray-400">{workout.type === 'run' ? `${workout.runDistance}km` : `${workout.exercises?.length}動作`}</p>
                                                {usedGear && <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-300"><ShoppingBag size={10} /> {usedGear.brand} {usedGear.model}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Edit3 size={18} className="text-gray-600 group-hover:text-white" />
                                            <button 
                                                onClick={(e) => handleStatusToggle(e, workout)}
                                                className={`p-2 rounded-full transition-colors ${workout.status === 'completed' ? 'text-green-500 bg-green-900/20' : 'text-gray-600 hover:text-gray-400'}`}
                                            >
                                                <CheckCircle2 size={24} fill={workout.status === 'completed' ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>
                                    </div>
                                    )
                                })
                            )}
                            <button onClick={() => { setCurrentDocId(null); setModalView('form'); }} className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:text-white"><Plus /> 新增運動</button>
                        </div>
                    )}

                    {modalView === 'form' && (
                        <WorkoutForm 
                            editForm={editForm} 
                            setEditForm={setEditForm} 
                            gears={gears} 
                            handleHeadCoachGenerate={handleHeadCoachGenerate} 
                            isGenerating={isGenerating} 
                            handleExerciseNameChange={(idx, val) => {
                                const newEx = [...editForm.exercises];
                                newEx[idx].name = val;
                                const detectedMuscle = detectMuscleGroup(val);
                                if (detectedMuscle) newEx[idx].targetMuscle = detectedMuscle;
                                setEditForm({...editForm, exercises: newEx});
                            }}
                        />
                    )}
                </div>

                <div className="p-6 border-t border-gray-800 flex justify-between">
                     {modalView === 'form' && (
                         <>
                            {currentDocId && (
                                <button onClick={handleDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2">
                                    <Trash2 size={18} /> 刪除
                                </button>
                            )}
                            <div className="flex gap-3 ml-auto">
                                <button onClick={() => setModalView('list')} className="text-gray-400 hover:text-white px-4">取消</button>
                                <button onClick={async () => {
                                    const dataToSave = { ...editForm, date: formatDate(selectedDate), updatedAt: new Date().toISOString() };
                                    if (currentDocId) await setDoc(doc(db, 'users', auth.currentUser.uid, 'calendar', currentDocId), dataToSave);
                                    else await addDoc(collection(db, 'users', auth.currentUser.uid, 'calendar'), dataToSave);
                                    updateAIContext();
                                    await fetchMonthWorkouts();
                                    setModalView('list');
                                }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors">儲存</button>
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