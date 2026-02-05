/**
 * 行事曆邏輯 Hook
 * 集中管理 CalendarView 的狀態與處理函式
 */
import { useState, useEffect, useMemo } from 'react';
import { getCurrentUser } from '../services/authService';
import { getApiKey } from '../services/config/apiKeyService';
import {
  updateCalendarWorkout,
  setCalendarWorkout,
  createCalendarWorkout,
  deleteCalendarWorkout,
  generateCalendarCSVData,
} from '../services/calendarService';
import { handleError } from '../services/core/errorService';
import { detectMuscleGroup } from '../utils/exerciseDB';
import { updateAIContext } from '../utils/contextManager';
import { addKnowledgeRecord } from '../services/ai/knowledgeBaseService';
import { generateDailyWorkout, generateWeeklyWorkout } from '../services/ai/workoutGenerator';
import { parseAndUploadFIT, parseAndUploadCSV } from '../services/importService';
import { formatDate, getWeekDates } from '../utils/date';
import { checkAndUnlockAchievements } from '../services/achievementService';
import { awardForWorkout } from '../services/game/gameProfileService';
import { getEmptyEditForm, workoutToEditForm } from '../components/Calendar/CalendarDayModal';
import { useWorkoutStore } from '../store/workoutStore';
import { useGears } from '../hooks/useGears';

const INIT_EDIT_FORM = {
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
  gearId: '',
  runType: '',
  runIntervalSets: '',
  runIntervalRest: '',
  runIntervalPace: '',
  runIntervalDuration: '',
  runIntervalPower: '',
};

export default function useCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('list');
  const [currentDocId, setCurrentDocId] = useState(null);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyPrefs, setWeeklyPrefs] = useState({});
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [editForm, setEditForm] = useState(INIT_EDIT_FORM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { workouts, initializeWorkouts } = useWorkoutStore();
  const { gears } = useGears();

  const monthlyMileage = useMemo(() => {
    const m = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    return Object.values(workouts)
      .flat()
      .reduce(
        (sum, d) =>
          d.type === 'run' && d.status === 'completed' && d.date?.startsWith(m)
            ? sum + parseFloat(d.runDistance || 0)
            : sum,
        0
      );
  }, [workouts, currentDate]);

  useEffect(() => {
    if (editForm.type === 'run' && editForm.runDistance && editForm.runDuration) {
      const dist = parseFloat(editForm.runDistance);
      const time = parseFloat(editForm.runDuration);
      if (dist > 0 && time > 0) {
        const paceDecimal = time / dist;
        const paceMin = Math.floor(paceDecimal);
        const paceSec = Math.round((paceDecimal - paceMin) * 60);
        setEditForm((prev) => ({ ...prev, runPace: `${paceMin}'${String(paceSec).padStart(2, '0')}" /km` }));
      }
    }
  }, [editForm.runDistance, editForm.runDuration, editForm.type]);

  const handleStatusToggle = async (e, workout) => {
    e.stopPropagation();
    const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
    try {
      useWorkoutStore.getState().updateWorkout(workout.id, { status: newStatus, updatedAt: new Date().toISOString() });
      await updateCalendarWorkout(workout.id, { status: newStatus, updatedAt: new Date().toISOString() });
      await updateAIContext();
      if (newStatus === 'completed') {
        const user = getCurrentUser();
        if (user) awardForWorkout(user.uid, { ...workout, status: 'completed' }).catch(() => {});
        checkAndUnlockAchievements().catch((err) => console.error('檢查成就失敗:', err));
      }
    } catch (err) {
      console.error(err);
      initializeWorkouts();
    }
  };

  const requireUser = (op) => {
    if (!getCurrentUser()) {
      handleError('請先登入', { context: 'CalendarView', operation: op });
      return false;
    }
    return true;
  };

  const requireApiKey = (op) => {
    if (!getApiKey()) {
      handleError('請先設定 API Key (可至 3D 城市 -> AI 教練中心 -> 設定室 設定)', { context: 'CalendarView', operation: op });
      return false;
    }
    return true;
  };

  const handleHeadCoachGenerate = async (preferredRunType = null) => {
    if (!requireUser('handleHeadCoachGenerate') || !requireApiKey('handleHeadCoachGenerate')) return;
    setIsGenerating(true);
    try {
      const plan = await generateDailyWorkout({ selectedDate, monthlyMileage, preferredRunType });
      setEditForm((prev) => ({ ...prev, ...plan, notes: plan.notes ? `${plan.notes}\n\n${prev.notes || ''}` : prev.notes }));
    } catch (_) {
      /* 錯誤已在 workoutGenerator 中處理 */
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWeeklyGenerate = async () => {
    if (!requireUser('handleWeeklyGenerate') || !requireApiKey('handleWeeklyGenerate')) return;
    setFileLoading(true);
    try {
      const plans = await generateWeeklyWorkout({ currentDate, weeklyPrefs, monthlyMileage });
      await Promise.all(plans.map((plan) => createCalendarWorkout(plan)));
      setShowWeeklyModal(false);
    } catch (_) {
      /* 錯誤已在 workoutGenerator 中處理 */
    } finally {
      setFileLoading(false);
    }
  };

  const toggleWeeklyPref = (date, type) => {
    setWeeklyPrefs((prev) => {
      const current = prev[date] || [];
      if (type === 'rest') return { ...prev, [date]: ['rest'] };
      let newTypes = current.filter((t) => t !== 'rest' && t !== 'auto');
      if (newTypes.includes(type)) newTypes = newTypes.filter((t) => t !== type);
      else newTypes.push(type);
      if (newTypes.length === 0) newTypes = ['auto'];
      return { ...prev, [date]: newTypes };
    });
  };

  const openWeeklyModal = () => {
    const weekDates = getWeekDates(currentDate);
    setWeeklyPrefs(Object.fromEntries(weekDates.map((d) => [d, ['auto']])));
    setShowWeeklyModal(true);
  };

  const handleSync = async () => {
    if (!requireUser('handleSync')) return;
    setIsSyncing(true);
    try {
      await updateAIContext();
    } catch (error) {
      handleError(error, { context: 'CalendarView', operation: 'handleSync' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = async () => {
    if (!getCurrentUser()) return;
    setFileLoading(true);
    try {
      const csvContent = await generateCalendarCSVData(gears);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `training_backup_${formatDate(new Date())}.csv`;
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
      if (fileName.endsWith('.fit')) await parseAndUploadFIT(file);
      else if (fileName.endsWith('.csv')) await parseAndUploadCSV(file);
      else {
        handleError('僅支援 .fit 或 .csv 檔案', { context: 'CalendarView', operation: 'handleFileUpload' });
      }
    } catch (err) {
      handleError(err, { context: 'CalendarView', operation: 'handleFileUpload' });
    } finally {
      setFileLoading(false);
    }
  };

  const handleDragStart = (e, workout) => {
    e.dataTransfer.setData('application/json', JSON.stringify(workout));
    setDraggedWorkout(workout);
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    const user = getCurrentUser();
    if (!user || !draggedWorkout) return;
    const isCopy = e.ctrlKey || e.metaKey;
    const sourceDateStr = draggedWorkout.date;
    if (sourceDateStr === targetDateStr && !isCopy) return;
    try {
      const targetDate = new Date(targetDateStr);
      const isFuture = targetDate > new Date();
      const newData = {
        ...draggedWorkout,
        date: targetDateStr,
        status: isFuture ? 'planned' : draggedWorkout.status === 'planned' ? 'completed' : draggedWorkout.status,
        updatedAt: new Date().toISOString(),
      };
      const { id, ...dataToSave } = newData;
      if (isCopy) {
        await createCalendarWorkout(dataToSave);
      } else {
        useWorkoutStore.getState().updateWorkout(draggedWorkout.id, {
          date: targetDateStr,
          status: dataToSave.status,
          updatedAt: new Date().toISOString(),
        });
        await updateCalendarWorkout(draggedWorkout.id, {
          date: targetDateStr,
          status: dataToSave.status,
          updatedAt: new Date().toISOString(),
        });
      }
      updateAIContext();
    } catch (error) {
      console.error('拖曳操作失敗:', error);
    } finally {
      setDraggedWorkout(null);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setModalView('list');
    setIsModalOpen(true);
  };

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

  const handleExerciseNameChange = (idx, value) => {
    const newEx = [...editForm.exercises];
    newEx[idx].name = value;
    const detectedMuscle = detectMuscleGroup(value);
    if (detectedMuscle) newEx[idx].targetMuscle = detectedMuscle;
    setEditForm({ ...editForm, exercises: newEx });
  };

  const saveKnowledgeRecord = (dataToSave, dateStr) => {
    if (dataToSave.status !== 'completed' || !dataToSave.notes) return;
    const injuryKeywords = ['痛', '膝', '腳踝', '肩', '腰', '拉傷', '痠痛', '不舒服'];
    const isInjury = injuryKeywords.some((k) => String(dataToSave.notes).includes(k));
    const text =
      `[${dateStr}] ${dataToSave.title || '訓練'}\n` +
      `類型：${dataToSave.type === 'run' ? '跑步' : '力量/其他'}\n` +
      dataToSave.notes;
    addKnowledgeRecord({
      type: isInjury ? 'injury' : 'note',
      text,
      metadata: {
        date: dateStr,
        source: 'calendar',
        calendarType: dataToSave.type || 'strength',
        calendarId: currentDocId || null,
        typeLabel: isInjury ? '傷痛紀錄' : '訓練日記',
      },
    }).catch((err) => console.warn('寫入知識庫失敗（不影響行事曆）：', err));
  };

  const handleSave = async () => {
    if (!getCurrentUser()) return;
    const isStrengthEmpty = editForm.type === 'strength' && editForm.exercises.length === 0 && !editForm.title;
    const isRunEmpty = editForm.type === 'run' && !editForm.runDistance && !editForm.title;
    if (isStrengthEmpty || isRunEmpty) {
      handleError('請輸入標題或內容', { context: 'CalendarView', operation: 'handleSave' });
      return;
    }
    const dateStr = formatDate(selectedDate);
    const dataToSave = { ...editForm, date: dateStr, updatedAt: new Date().toISOString() };
    try {
      if (currentDocId) {
        useWorkoutStore.getState().updateWorkout(currentDocId, dataToSave);
        await setCalendarWorkout(currentDocId, dataToSave);
      } else {
        await createCalendarWorkout(dataToSave);
      }
      updateAIContext();
      setModalView('list');
      saveKnowledgeRecord(dataToSave, dateStr);
      if (dataToSave.status === 'completed') checkAndUnlockAchievements().catch((err) => console.error('檢查成就失敗:', err));
    } catch (error) {
      handleError(error, { context: 'CalendarView', operation: 'handleSave' });
    }
  };

  const handleDelete = async () => {
    if (!currentDocId || !window.confirm('確定刪除？')) return;
    try {
      useWorkoutStore.getState().removeWorkout(currentDocId);
      await deleteCalendarWorkout(currentDocId);
      updateAIContext();
      setModalView('list');
    } catch (error) {
      handleError(error, { context: 'CalendarView', operation: 'handleDelete' });
      initializeWorkouts();
    }
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = [...Array(firstDayOfMonth).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  const weekDateList = getWeekDates(currentDate);

  return {
    state: {
      currentDate,
      selectedDate,
      isModalOpen,
      modalView,
      currentDocId,
      showWeeklyModal,
      weeklyPrefs,
      draggedWorkout,
      dragOverDate,
      editForm,
      isGenerating,
      fileLoading,
      isSyncing,
      workouts,
      gears,
    },
    setters: {
      setEditForm,
      setModalView,
      setCurrentDocId,
      setModalOpen: setIsModalOpen,
      setShowWeeklyModal,
      setDragOverDate,
    },
    handlers: {
      handleStatusToggle,
      handleHeadCoachGenerate,
      handleWeeklyGenerate,
      toggleWeeklyPref,
      openWeeklyModal,
      handleSync,
      handleExport,
      handleFileUpload,
      handleDragStart,
      handleDrop,
      handleDateClick,
      handleAddNew,
      handleEdit,
      handleSave,
      handleDelete,
      handleExerciseNameChange,
    },
    computed: { days, changeMonth, weekDateList },
  };
}
