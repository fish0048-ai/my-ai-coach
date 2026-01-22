import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, CheckCircle2, Clock, ArrowLeft, Edit3, Copy, Move, Upload, RefreshCw, Download, CalendarDays, ShoppingBag, Timer, Flame, Heart, BarChart2, AlignLeft, Tag } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getApiKey } from '../services/apiKeyService';
import { listGears, listCalendarWorkouts, updateCalendarWorkout, setCalendarWorkout, createCalendarWorkout, deleteCalendarWorkout, getUserProfile, generateCalendarCSVData } from '../services/calendarService';
import { handleError } from '../services/errorService';
import { detectMuscleGroup } from '../utils/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import { addKnowledgeRecord } from '../services/ai/knowledgeBaseService';
import FitParser from 'fit-file-parser';
// 確保這裡正確匯入兩個函式
import { generateDailyWorkout, generateWeeklyWorkout } from '../services/ai/workoutGenerator';
import { parseAndUploadFIT, parseAndUploadCSV } from '../utils/importHelpers';
import { formatDate, getWeekDates } from '../utils/date';
import { cleanNumber } from '../utils/number';
import { checkAndUnlockAchievements } from '../services/achievementService';
import WorkoutForm from '../components/Calendar/WorkoutForm';
import WeeklyModal from '../components/Calendar/WeeklyModal';
import { useViewStore } from '../store/viewStore';


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
  
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyPrefs, setWeeklyPrefs] = useState({});

  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const fileInputRef = useRef(null);
  const csvInputRef = useRef(null);

  const [editForm, setEditForm] = useState({
    status: 'completed', type: 'strength', title: '', exercises: [], 
    runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: '',
    runType: '', runIntervalSets: '', runIntervalRest: '', runIntervalPace: '', runIntervalDuration: '' // 間歇跑相關欄位
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [monthlyMileage, setMonthlyMileage] = useState(0); 
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  useEffect(() => {
    const fetchGears = async () => {
        try {
            const gearList = await listGears();
            setGears(gearList);
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
    setLoading(true);
    try {
      const allWorkouts = await listCalendarWorkouts();
      const groupedWorkouts = {};
      let totalDist = 0;
      const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
      allWorkouts.forEach((data) => {
        if (data.date) {
          if (!groupedWorkouts[data.date]) groupedWorkouts[data.date] = [];
          groupedWorkouts[data.date].push({ ...data });
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
      const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
      try {
          await updateCalendarWorkout(workout.id, {
              status: newStatus,
              updatedAt: new Date().toISOString()
          });
          await fetchMonthWorkouts();
          await updateAIContext();
          // 如果標記為完成，檢查成就（非阻塞）
          if (newStatus === 'completed') {
            checkAndUnlockAchievements().catch(err => {
              console.error('檢查成就失敗:', err);
            });
          }
      } catch (err) { console.error(err); }
  };

  const handleHeadCoachGenerate = async (preferredRunType = null) => {
    const user = getCurrentUser();
    if (!user) {
      handleError('請先登入', { context: 'CalendarView', operation: 'handleHeadCoachGenerate' });
      return;
    }
    
    setIsGenerating(true);
    try {
      const plan = await generateDailyWorkout({
        selectedDate,
        monthlyMileage,
        preferredRunType // 傳遞用戶選擇的跑步類型
      });

      setEditForm(prev => ({
        ...prev,
        ...plan,
        notes: plan.notes ? `${plan.notes}\n\n${prev.notes || ''}` : prev.notes
      }));
    } catch (error) {
      // 錯誤已在 workoutGenerator 中處理
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWeeklyGenerate = async () => {
    const user = getCurrentUser();
    if (!user) {
      handleError('請先登入', { context: 'CalendarView', operation: 'handleWeeklyGenerate' });
      return;
    }
    
    setLoading(true);
    try {
      const plans = await generateWeeklyWorkout({
        currentDate,
        weeklyPrefs,
        monthlyMileage
      });

      const batchPromises = plans.map(async (plan) => {
        await createCalendarWorkout(plan);
      });

      await Promise.all(batchPromises);
      await fetchMonthWorkouts();
      setShowWeeklyModal(false);
    } catch (error) {
      // 錯誤已在 workoutGenerator 中處理
    } finally {
      setLoading(false);
    }
  };

  const toggleWeeklyPref = (date, type) => {
    setWeeklyPrefs(prev => {
        const current = prev[date] || [];
        if (type === 'rest') return { ...prev, [date]: ['rest'] };
        let newTypes = current.filter(t => t !== 'rest' && t !== 'auto');
        if (newTypes.includes(type)) newTypes = newTypes.filter(t => t !== type);
        else newTypes.push(type);
        if (newTypes.length === 0) newTypes = ['auto'];
        return { ...prev, [date]: newTypes };
    });
  };

  const openWeeklyModal = () => {
      const weekDates = getWeekDates(currentDate);
      const initialPrefs = {};
      weekDates.forEach(date => initialPrefs[date] = ['auto']);
      setWeeklyPrefs(initialPrefs);
      setShowWeeklyModal(true);
  };

  const handleSync = async () => {
    const user = getCurrentUser();
    if (!user) return;
    setLoading(true);
    try { 
      await updateAIContext(); 
      await fetchMonthWorkouts(); 
      // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleSync' }); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleExport = async () => {
    const user = getCurrentUser();
    if (!user) return;
    setLoading(true);
    try {
        const csvContent = await generateCalendarCSVData(gears);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const today = formatDate(new Date());
        link.setAttribute("download", `training_backup_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleExport' }); 
    } finally { 
      setLoading(false); 
    }
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
               // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
          } else {
               handleError(result.message || "匯入失敗", { context: 'CalendarView', operation: 'handleCSVUpload' });
          }
      } catch (err) { 
        handleError(err, { context: 'CalendarView', operation: 'handleCSVUpload' }); 
      } finally { 
        setLoading(false); 
        if (csvInputRef.current) csvInputRef.current.value = ''; 
      }
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
          else { 
            handleError("僅支援 .fit 或 .csv 檔案", { context: 'CalendarView', operation: 'handleFileUpload' }); 
            setLoading(false); 
            return; 
          }
          
          if (result.success) {
            await fetchMonthWorkouts();
            // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
          }
      } catch (err) { 
        handleError(err, { context: 'CalendarView', operation: 'handleFileUpload' }); 
      } finally { 
        setLoading(false); 
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
  };
  
  const handleDragStart = (e, workout) => { e.dataTransfer.setData('application/json', JSON.stringify(workout)); setDraggedWorkout(workout); };
  const handleDragOver = (e, dateStr) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); };
  const handleDrop = async (e, targetDateStr) => {
      e.preventDefault(); setDragOverDate(null);
      const user = getCurrentUser();
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
        if (isCopy) await createCalendarWorkout(dataToSave);
        else await updateCalendarWorkout(draggedWorkout.id, { date: targetDateStr, status: dataToSave.status, updatedAt: new Date().toISOString() });
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
      runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: '',
      runType: '', runIntervalSets: '', runIntervalRest: '', runIntervalPace: '', runIntervalDuration: '' // 間歇跑相關欄位
    });
    setCurrentDocId(null); setModalView('form');
  };
  const handleEdit = (workout) => {
    setEditForm({
      status: workout.status || 'completed', type: workout.type || 'strength', title: workout.title || '',
      exercises: workout.exercises || [], runDistance: workout.runDistance || '', runDuration: workout.runDuration || '',
      runPace: workout.runPace || '', runPower: workout.runPower || '', runHeartRate: workout.runHeartRate || '',
      runRPE: workout.runRPE || '', notes: workout.notes || '', calories: workout.calories || '', gearId: workout.gearId || '',
      runType: workout.runType || '', runIntervalSets: workout.runIntervalSets || '', runIntervalRest: workout.runIntervalRest || '', runIntervalPace: workout.runIntervalPace || '' // 間歇跑相關欄位
    });
    setCurrentDocId(workout.id); setModalView('form');
  };
  const handleSave = async () => {
    const user = getCurrentUser();
    if (!user) return;
    const isStrengthEmpty = editForm.type === 'strength' && editForm.exercises.length === 0 && !editForm.title;
    const isRunEmpty = editForm.type === 'run' && !editForm.runDistance && !editForm.title;
    if (isStrengthEmpty || isRunEmpty) {
      handleError("請輸入標題或內容", { context: 'CalendarView', operation: 'handleSave' });
      return;
    }
    const dateStr = formatDate(selectedDate);
    const dataToSave = { ...editForm, date: dateStr, updatedAt: new Date().toISOString() };
    try {
      if (currentDocId) await setCalendarWorkout(currentDocId, dataToSave);
      else await createCalendarWorkout(dataToSave);
      updateAIContext(); await fetchMonthWorkouts(); setModalView('list');

      // 若為已完成訓練且有備註，將關鍵資訊寫入個人知識庫（供 RAG 使用）
      if (dataToSave.status === 'completed' && dataToSave.notes) {
        const baseMetadata = {
          date: dateStr,
          source: 'calendar',
          calendarType: dataToSave.type || 'strength',
          calendarId: currentDocId || null,
        };

        // 粗略偵測是否為傷痛相關描述
        const injuryKeywords = ['痛', '膝', '腳踝', '肩', '腰', '拉傷', '痠痛', '不舒服'];
        const isInjury = injuryKeywords.some((k) => String(dataToSave.notes).includes(k));

        const type = isInjury ? 'injury' : 'note';
        const typeLabel = isInjury ? '傷痛紀錄' : '訓練日記';

        const text =
          `[${dateStr}] ${dataToSave.title || '訓練'}\n` +
          `類型：${dataToSave.type === 'run' ? '跑步' : '力量/其他'}\n` +
          `${dataToSave.notes}`;

        addKnowledgeRecord({
          type,
          text,
          metadata: {
            ...baseMetadata,
            typeLabel,
          },
        }).catch((err) => {
          console.warn('寫入知識庫失敗（不影響行事曆）：', err);
        });
      }
      // 如果狀態為完成，檢查成就（非阻塞）
      if (dataToSave.status === 'completed') {
        checkAndUnlockAchievements().catch(err => {
          console.error('檢查成就失敗:', err);
        });
      }
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleSave' }); 
    }
  };
  const handleDelete = async () => {
    if (!currentDocId) return;
    if(!window.confirm("確定刪除？")) return;
    try {
      await deleteCalendarWorkout(currentDocId);
      updateAIContext(); await fetchMonthWorkouts(); setModalView('list');
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleDelete' }); 
    }
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
  const weekDateList = getWeekDates(currentDate);

  // 選項定義
  const PREF_OPTIONS = [
    { key: 'strength', label: '🏋️ 重訓', color: 'bg-blue-600' },
    { key: 'run_lsd', label: '🐢 LSD', color: 'bg-orange-600' },
    { key: 'run_interval', label: '🐇 間歇', color: 'bg-red-600' },
    { key: 'run_easy', label: '👟 輕鬆', color: 'bg-green-600' },
    { key: 'run_mp', label: '🔥 MP', color: 'bg-yellow-600' },
    { key: 'rest', label: '😴 休息', color: 'bg-gray-600' }
  ];

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .fit" className="hidden" />
      <input type="file" ref={csvInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface-800 p-4 rounded-xl border border-gray-800 gap-3 shadow-lg shadow-black/40">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-500" />
            運動行事曆
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { 
                const initialPrefs = {}; 
                weekDateList.forEach(d => initialPrefs[d] = ['auto']); 
                setWeeklyPrefs(initialPrefs); 
                setShowWeeklyModal(true); 
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/30 transition-all"
            >
              <CalendarDays size={18} /> 本週總教練排程
            </button>
            <button
              onClick={() => setCurrentView('training-plan')}
              className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-800/80 text-white rounded-lg text-sm font-bold border border-gray-800 transition-all"
            >
              <Sparkles size={16} /> 訓練計劃推薦
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4 md:justify-end">
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
          <div className="flex items-center gap-2 bg-surface-900 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-700 rounded-md text-white"><ChevronLeft size={20}/></button>
            <span className="text-sm md:text-base font-mono text-white min-w-[100px] text-center">{currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-700 rounded-md text-white"><ChevronRight size={20}/></button>
          </div>
        </div>
      </div>

      <div className="bg-surface-800/50 p-2 rounded-lg text-xs text-gray-400 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1"><Move size={12}/> 拖曳可移動日期</span>
        <span className="flex items-center gap-1"><Copy size={12}/> 按住 Ctrl 拖曳可複製</span>
      </div>

      <div className="flex-1 bg-surface-800 rounded-xl border border-gray-800 p-4 overflow-y-auto shadow-lg shadow-black/40">
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
            let bgClass = 'bg-surface-900 border-gray-800';
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
                            title={
                                workout.title + 
                                (isRun && workout.runType === 'Interval' && workout.runIntervalSets 
                                    ? ` | ${workout.runIntervalSets}組${workout.runIntervalPace ? ` (${workout.runIntervalPace})` : ''}${workout.runIntervalDuration ? ` × ${workout.runIntervalDuration}秒` : ''}${workout.runIntervalRest ? ` / 休息${workout.runIntervalRest}秒` : ''}` 
                                    : '')
                            }
                        >
                            {workout.status === 'planned' && <Clock size={8} />}
                            {workout.title || (isRun ? '跑步' : '訓練')}
                            {isRun && workout.runType === 'Interval' && workout.runIntervalSets && (
                                <span className="text-[9px] opacity-75">({workout.runIntervalSets}組)</span>
                            )}
                        </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ... (Modals remain the same) ... */}
      <WeeklyModal
        isOpen={showWeeklyModal}
        currentDate={currentDate}
        workouts={workouts}
        weeklyPrefs={weeklyPrefs}
        toggleWeeklyPref={toggleWeeklyPref}
        onClose={() => setShowWeeklyModal(false)}
        onGenerate={handleWeeklyGenerate}
        loading={loading}
      />

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-surface-900 w-full max-w-4xl rounded-2xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-white">
                            {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
                        </h2>
                        {modalView === 'list' && <span className="text-xs text-gray-500 bg-surface-800 px-2 py-1 rounded">當日清單</span>}
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
                                    <div key={workout.id} onClick={() => { setCurrentDocId(workout.id); setEditForm(workout); setModalView('form'); }} className="bg-surface-800 p-4 rounded-xl border border-gray-800 cursor-pointer flex justify-between items-center group hover:border-primary-500 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${workout.type === 'run' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {workout.type === 'run' ? <Activity size={24}/> : <Dumbbell size={24}/>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{workout.title}</h3>
                                                <p className="text-xs text-gray-400">
                                                    {workout.type === 'run' 
                                                        ? `${workout.runDistance}km${
                                                            workout.runType === 'Interval' && workout.runIntervalSets 
                                                                ? ` | ${workout.runIntervalSets}組${workout.runIntervalPace ? ` (${workout.runIntervalPace})` : ''}${workout.runIntervalDuration ? ` × ${workout.runIntervalDuration}秒` : ''}${workout.runIntervalRest ? ` / 休息${workout.runIntervalRest}秒` : ''}` 
                                                                : ''
                                                          }`
                                                        : `${workout.exercises?.length}動作`
                                                    }
                                                </p>
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
                                    const user = getCurrentUser();
                                    if (!user) return;
                                    const dataToSave = { ...editForm, date: formatDate(selectedDate), updatedAt: new Date().toISOString() };
                                    if (currentDocId) await setCalendarWorkout(currentDocId, dataToSave);
                                    else await createCalendarWorkout(dataToSave);
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