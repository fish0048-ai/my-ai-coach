import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Calendar as CalendarIcon, Dumbbell, Activity, CheckCircle2, Clock, Copy, Move, CalendarDays, ShoppingBag } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getApiKey } from '../services/config/apiKeyService';
import { listGears, updateCalendarWorkout, setCalendarWorkout, createCalendarWorkout, deleteCalendarWorkout, getUserProfile, generateCalendarCSVData } from '../services/calendarService';
import { handleError } from '../services/errorService';
import { detectMuscleGroup } from '../utils/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import { addKnowledgeRecord } from '../services/ai/knowledgeBaseService';
import { generateDailyWorkout, generateWeeklyWorkout } from '../services/ai/workoutGenerator';
import { parseAndUploadFIT, parseAndUploadCSV } from '../services/importService';
import { formatDate, getWeekDates } from '../utils/date';
import { cleanNumber } from '../utils/number';
import { checkAndUnlockAchievements } from '../services/achievementService';
import WeeklyModal from '../components/Calendar/WeeklyModal';
import WorkoutCard from '../components/Calendar/WorkoutCard';
import ImportSection from '../components/Calendar/ImportSection';
import CalendarDayModal, { getEmptyEditForm, workoutToEditForm } from '../components/Calendar/CalendarDayModal';
import { useViewStore } from '../store/viewStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useGears } from '../hooks/useGears';


// --- 組件主體 ---
export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('list'); 
  const [currentDocId, setCurrentDocId] = useState(null); 
  
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyPrefs, setWeeklyPrefs] = useState({});

  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  const [editForm, setEditForm] = useState({
    status: 'completed', type: 'strength', title: '', exercises: [], 
    runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: '',
    runType: '', runIntervalSets: '', runIntervalRest: '', runIntervalPace: '', runIntervalDuration: '', runIntervalPower: '' // 間歇跑相關欄位
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [fileLoading, setFileLoading] = useState(false); // 檔案操作的 loading 狀態
  const [isSyncing, setIsSyncing] = useState(false); // 同步操作的 loading 狀態
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  // 使用響應式 Hooks
  const { workouts, loading, initializeWorkouts } = useWorkoutStore();
  const { gears } = useGears();

  // 計算本月跑量
  const monthlyMileage = useMemo(() => {
    const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}`;
    let totalDist = 0;
    Object.values(workouts).flat().forEach((data) => {
      if (data.type === 'run' && data.status === 'completed' && data.date?.startsWith(currentMonthStr)) {
        totalDist += parseFloat(data.runDistance || 0);
      }
    });
    return totalDist;
  }, [workouts, currentDate]);

  // 訓練資料由 App 層登入後訂閱並整段登入期間保持，此處不再 mount 時 init / unmount 時 unsub，以確保歷史與新資料持續同步

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

  const handleStatusToggle = async (e, workout) => {
      e.stopPropagation();
      const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
      try {
          // 先更新本地狀態（優化 UI 響應）
          useWorkoutStore.getState().updateWorkout(workout.id, {
              status: newStatus,
              updatedAt: new Date().toISOString()
          });
          
          await updateCalendarWorkout(workout.id, {
              status: newStatus,
              updatedAt: new Date().toISOString()
          });
          await updateAIContext();
          // 如果標記為完成，檢查成就（非阻塞）
          if (newStatus === 'completed') {
            checkAndUnlockAchievements().catch(err => {
              console.error('檢查成就失敗:', err);
            });
          }
      } catch (err) { 
        console.error(err);
        // 如果更新失敗，重新載入資料
        initializeWorkouts();
      }
  };

  const handleHeadCoachGenerate = async (preferredRunType = null) => {
    const user = getCurrentUser();
    if (!user) {
      handleError('請先登入', { context: 'CalendarView', operation: 'handleHeadCoachGenerate' });
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      handleError('請先設定 API Key (可至 3D 城市 -> AI 教練中心 -> 設定室 設定)', { 
        context: 'CalendarView', 
        operation: 'handleHeadCoachGenerate' 
      });
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

    const apiKey = getApiKey();
    if (!apiKey) {
      handleError('請先設定 API Key (可至 3D 城市 -> AI 教練中心 -> 設定室 設定)', { 
        context: 'CalendarView', 
        operation: 'handleWeeklyGenerate' 
      });
      return;
    }
    
    setFileLoading(true);
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
      // 資料會透過訂閱自動更新，不需要手動 fetch
      setShowWeeklyModal(false);
    } catch (error) {
      // 錯誤已在 workoutGenerator 中處理
    } finally {
      setFileLoading(false);
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
    if (!user) {
      handleError('請先登入', { context: 'CalendarView', operation: 'handleSync' });
      return;
    }
    setIsSyncing(true);
    try { 
      await updateAIContext(); 
      // 資料會透過訂閱自動更新，不需要手動 fetch
      // 可選：顯示成功訊息
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleSync' }); 
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async () => {
    const user = getCurrentUser();
    if (!user) return;
    setFileLoading(true);
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
        URL.revokeObjectURL(url);
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleExport' }); 
    } finally { 
      setFileLoading(false); 
    }
  };

  const handleFileUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const fileName = file.name.toLowerCase();
      setFileLoading(true);
      try {
          let result;
          if (fileName.endsWith('.fit')) result = await parseAndUploadFIT(file);
          else if (fileName.endsWith('.csv')) result = await parseAndUploadCSV(file);
          else {
            handleError("僅支援 .fit 或 .csv 檔案", { context: 'CalendarView', operation: 'handleFileUpload' });
            setFileLoading(false);
            return;
          }
          
          if (result.success) {
            // 資料會透過訂閱自動更新，不需要手動 fetch
            // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
          }
      } catch (err) {
        handleError(err, { context: 'CalendarView', operation: 'handleFileUpload' });
      } finally {
        setFileLoading(false);
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
        const targetDate = new Date(targetDateStr);
        const today = new Date();
        const isFuture = targetDate > today;
        const newData = {
          ...draggedWorkout, date: targetDateStr,
          status: isFuture ? 'planned' : (draggedWorkout.status === 'planned' ? 'completed' : draggedWorkout.status), 
          updatedAt: new Date().toISOString()
        };
        const { id, ...dataToSave } = newData;
        if (isCopy) {
          await createCalendarWorkout(dataToSave);
          // 新增後會透過訂閱自動更新
        } else {
          // 先更新本地狀態（優化 UI 響應）
          useWorkoutStore.getState().updateWorkout(draggedWorkout.id, { 
            date: targetDateStr, 
            status: dataToSave.status, 
            updatedAt: new Date().toISOString() 
          });
          await updateCalendarWorkout(draggedWorkout.id, { date: targetDateStr, status: dataToSave.status, updatedAt: new Date().toISOString() });
        }
        updateAIContext(); 
      } catch (error) {
        console.error('拖曳操作失敗:', error);
      } finally { 
        setDraggedWorkout(null); 
      }
  };
  const handleDateClick = (date) => { setSelectedDate(date); setModalView('list'); setIsModalOpen(true); };
  const handleAddNew = () => {
    setEditForm(getEmptyEditForm(formatDate(selectedDate), formatDate(new Date())));
    setCurrentDocId(null);
    setModalView('form');
  };
  const handleEdit = (workout) => {
    setEditForm(workoutToEditForm(workout));
    setCurrentDocId(workout.id);
    setModalView('form');
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
      if (currentDocId) {
        // 先更新本地狀態（優化 UI 響應）
        useWorkoutStore.getState().updateWorkout(currentDocId, dataToSave);
        await setCalendarWorkout(currentDocId, dataToSave);
      } else {
        await createCalendarWorkout(dataToSave);
        // 新增後會透過訂閱自動更新
      }
      updateAIContext(); 
      setModalView('list');

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
      // 先更新本地狀態（優化 UI 響應）
      useWorkoutStore.getState().removeWorkout(currentDocId);
      await deleteCalendarWorkout(currentDocId);
      updateAIContext(); 
      setModalView('list');
    } catch (error) { 
      handleError(error, { context: 'CalendarView', operation: 'handleDelete' });
      // 如果刪除失敗，重新載入資料
      initializeWorkouts();
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
          <ImportSection
            onSync={handleSync}
            onExport={handleExport}
            onFileUpload={handleFileUpload}
            isSyncing={isSyncing}
            fileLoading={fileLoading}
          />
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
        loading={fileLoading}
      />

      {isModalOpen && (
        <CalendarDayModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          selectedDate={selectedDate}
          workouts={workouts}
          gears={gears}
          modalView={modalView}
          setModalView={setModalView}
          currentDocId={currentDocId}
          setCurrentDocId={setCurrentDocId}
          editForm={editForm}
          setEditForm={setEditForm}
          onStatusToggle={handleStatusToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onSave={handleSave}
          handleHeadCoachGenerate={handleHeadCoachGenerate}
          handleExerciseNameChange={(idx, val) => {
            const newEx = [...editForm.exercises];
            newEx[idx].name = val;
            const detectedMuscle = detectMuscleGroup(val);
            if (detectedMuscle) newEx[idx].targetMuscle = detectedMuscle;
            setEditForm({ ...editForm, exercises: newEx });
          }}
          isGenerating={isGenerating}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}