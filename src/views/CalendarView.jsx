import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart, CheckCircle2, Clock, Tag, ArrowLeft, Edit3, Copy, Move, MoreHorizontal } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';

// 日期格式化 (YYYY-MM-DD)
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // workouts: key 為日期字串 (YYYY-MM-DD), value 為該日期的運動陣列
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Modal 狀態控制
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState('list'); // 'list' | 'form'
  const [currentDocId, setCurrentDocId] = useState(null); 

  // Drag & Drop 狀態
  const [draggedWorkout, setDraggedWorkout] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);

  // 編輯表單狀態
  const [editForm, setEditForm] = useState({
    status: 'completed',
    type: 'strength',
    title: '',
    exercises: [], 
    runDistance: '',   
    runDuration: '',   
    runPace: '',       
    runPower: '',      
    runHeartRate: ''   
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 自動計算跑步配速
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

  // 切換月份時重新抓取資料
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
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateKey = data.date;
        if (dateKey) {
          if (!groupedWorkouts[dateKey]) {
            groupedWorkouts[dateKey] = [];
          }
          groupedWorkouts[dateKey].push({ id: doc.id, ...data });
        }
      });
      setWorkouts(groupedWorkouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Drag and Drop Logic ---

  const handleDragStart = (e, workout) => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/json', JSON.stringify(workout));
    setDraggedWorkout(workout);
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault(); // 必須阻止默認行為才能允許 Drop
    // 根據是否按住 Ctrl/Meta 鍵來決定顯示複製還是移動圖示
    e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? 'copy' : 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e) => {
    // 簡單處理：如果離開的目標是當前的 dragOverDate，則清除
    // 實務上需要判斷是否真的離開了格子，這裡簡化處理
    // setDragOverDate(null); 
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    const user = auth.currentUser;
    if (!user || !draggedWorkout) return;

    const isCopy = e.ctrlKey || e.metaKey; // 按住 Ctrl 為複製
    const sourceDateStr = draggedWorkout.date;

    // 如果目標日期跟來源日期一樣，且不是複製，就不做任何事
    if (sourceDateStr === targetDateStr && !isCopy) return;

    try {
      setLoading(true);
      
      const targetDate = new Date(targetDateStr);
      const today = new Date();
      const isFuture = targetDate > today;
      
      // 準備新資料
      const newData = {
        ...draggedWorkout,
        date: targetDateStr,
        // 如果移動到未來，自動設為 planned；移動到過去或今天，保持原樣或設為 completed (視需求)
        status: isFuture ? 'planned' : (draggedWorkout.status === 'planned' ? 'completed' : draggedWorkout.status), 
        updatedAt: new Date().toISOString()
      };
      // 移除 id 以便寫入 (id 是 doc key)
      const { id, ...dataToSave } = newData;

      if (isCopy) {
        // 複製模式：新增一筆文件
        await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
      } else {
        // 移動模式：更新原文件日期
        const docRef = doc(db, 'users', user.uid, 'calendar', draggedWorkout.id);
        await updateDoc(docRef, { 
            date: targetDateStr,
            status: dataToSave.status,
            updatedAt: new Date().toISOString()
        });
      }

      await fetchMonthWorkouts(); // 重新整理畫面
    } catch (error) {
      console.error("Drop error:", error);
      alert("操作失敗，請稍後再試");
    } finally {
      setLoading(false);
      setDraggedWorkout(null);
    }
  };

  // --- End Drag and Drop ---

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
      runHeartRate: ''
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
      runHeartRate: workout.runHeartRate || ''
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

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      alert("請先在右下角 AI 教練視窗設定 API Key");
      return;
    }

    setIsGenerating(true);
    try {
      // 優化 Prompt：更精簡的指令
      const prompt = `
        任務：健身課表生成
        目標：${aiPrompt}
        
        回傳 JSON 陣列 (無 Markdown):
        [{"name": "動作", "sets": "4", "reps": "8-12", "weight": "適重"}]
        僅列出 3-5 個關鍵動作。
      `;
      const response = await runGemini(prompt, apiKey);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedExercises = JSON.parse(cleanJson);
      
      if (Array.isArray(generatedExercises)) {
        const taggedExercises = generatedExercises.map(ex => ({
            ...ex,
            targetMuscle: detectMuscleGroup(ex.name)
        }));

        setEditForm(prev => ({
          ...prev,
          type: 'strength',
          title: prev.title || aiPrompt + " 訓練",
          exercises: [...prev.exercises, ...taggedExercises]
        }));
        setAiPrompt('');
      }
    } catch (error) {
      console.error(error);
      alert("AI 生成失敗");
    } finally {
      setIsGenerating(false);
    }
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
      {/* 頂部導覽列 */}
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-blue-500" />
          運動行事曆
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700 rounded-full text-white"><ChevronLeft /></button>
          <span className="text-xl font-mono text-white min-w-[140px] text-center">
            {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700 rounded-full text-white"><ChevronRight /></button>
        </div>
      </div>

      <div className="bg-gray-800/50 p-2 rounded-lg text-xs text-gray-400 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1"><Move size={12}/> 拖曳可移動日期</span>
        <span className="flex items-center gap-1"><Copy size={12}/> 按住 Ctrl 拖曳可複製</span>
      </div>

      {/* 日曆網格 */}
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

            // 樣式判斷
            let bgClass = 'bg-gray-900 border-gray-700';
            let textClass = 'text-gray-300';
            
            if (isDragOver) {
                bgClass = 'bg-blue-900/40 border-blue-400 border-dashed scale-105 shadow-xl'; // 拖曳經過時的高亮
            } else if (isSelected) {
                bgClass = 'bg-blue-900/20 border-blue-500';
                textClass = 'text-blue-400';
            }

            return (
              <div 
                key={idx}
                // 1. 允許作為放置目標
                onDragOver={(e) => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                
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
                            // 2. 設定可拖曳來源
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, workout)}
                            
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

      {/* 共用 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
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

            {/* Modal Content */}
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
                            workouts[formatDate(selectedDate)].map((workout) => (
                                <div 
                                    key={workout.id} 
                                    onClick={() => handleEdit(workout)}
                                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-4 rounded-xl cursor-pointer transition-colors flex items-center justify-between group"
                                >
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
                                                    : `${workout.exercises?.length || 0} 個動作`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-gray-500 group-hover:text-white">
                                        <Edit3 size={18} />
                                    </div>
                                </div>
                            ))
                        )}
                        
                        <button 
                            onClick={handleAddNew}
                            className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all flex items-center justify-center gap-2 font-bold"
                        >
                            <Plus size={20} /> 新增運動
                        </button>
                    </div>
                )}

                {modalView === 'form' && (
                    <div className="space-y-6">
                        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 mb-4">
                            <button
                            onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))}
                            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                editForm.type === 'strength' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                            }`}
                            >
                            <Dumbbell size={16} /> 重量訓練
                            </button>
                            <button
                            onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))}
                            className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                                editForm.type === 'run' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'
                            }`}
                            >
                            <Activity size={16} /> 跑步有氧
                            </button>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">標題 / 備註</label>
                            <input 
                            type="text" 
                            value={editForm.title}
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                            placeholder={editForm.type === 'run' ? "例如：晨跑 5K" : "例如：腿部轟炸日"}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 outline-none"
                            />
                        </div>

                        {editForm.type === 'strength' ? (
                            <>
                            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 rounded-xl border border-purple-500/30">
                                <label className="text-xs text-purple-300 uppercase font-semibold mb-2 block flex items-center gap-1">
                                <Sparkles size={12} /> AI 智慧排程
                                </label>
                                <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    placeholder="輸入部位 (例如: 胸肌)"
                                    className="flex-1 bg-gray-900 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 outline-none"
                                    onKeyPress={e => e.key === 'Enter' && handleAIGenerate()}
                                />
                                <button 
                                    onClick={handleAIGenerate}
                                    disabled={isGenerating}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    生成
                                </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                <label className="text-xs text-gray-500 uppercase font-semibold">動作清單</label>
                                <button 
                                    onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', targetMuscle: '' }] }))}
                                    className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                >
                                    <Plus size={12} /> 新增動作
                                </button>
                                </div>
                                
                                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 uppercase">
                                    <div className="col-span-1 text-center">#</div>
                                    <div className="col-span-4">動作名稱</div>
                                    <div className="col-span-2 text-center">組數</div>
                                    <div className="col-span-2 text-center">次數</div>
                                    <div className="col-span-2 text-center">重量 (kg)</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {editForm.exercises.map((ex, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800 p-2 rounded-lg border border-gray-700 group">
                                    <div className="col-span-1 w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-gray-400 font-mono text-xs mx-auto">
                                    {idx + 1}
                                    </div>
                                    <div className="col-span-4 relative">
                                        <input 
                                            placeholder="動作名稱 (例: 臥推)"
                                            value={ex.name}
                                            onChange={e => handleExerciseNameChange(idx, e.target.value)}
                                            className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
                                        />
                                        {ex.targetMuscle && (
                                            <span className="absolute -bottom-3 left-0 text-[10px] text-green-400 bg-green-900/30 px-1 rounded flex items-center gap-0.5">
                                                <Tag size={8} /> {ex.targetMuscle}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            placeholder="3"
                                            value={ex.sets}
                                            onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].sets = e.target.value; setEditForm({...editForm, exercises: newEx}); }}
                                            className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            placeholder="10"
                                            value={ex.reps}
                                            onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].reps = e.target.value; setEditForm({...editForm, exercises: newEx}); }}
                                            className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input 
                                            placeholder="kg"
                                            value={ex.weight}
                                            onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].weight = e.target.value; setEditForm({...editForm, exercises: newEx}); }}
                                            className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
                                        />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button 
                                            onClick={() => { const newEx = editForm.exercises.filter((_, i) => i !== idx); setEditForm({...editForm, exercises: newEx}); }}
                                            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                ))}
                            </div>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase font-semibold">距離 (km)</label>
                                <input type="number" step="0.01" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} placeholder="0.00" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase font-semibold">時間 (分鐘)</label>
                                <input type="number" step="1" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} placeholder="0" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" />
                            </div>
                            <div className="col-span-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                                <div>
                                <div className="text-xs text-gray-500 uppercase">平均配速 (自動計算)</div>
                                <div className="text-xl font-bold text-orange-400 font-mono">{editForm.runPace || '--\'--" /km'}</div>
                                </div>
                                <Timer className="text-orange-500 opacity-20" size={32} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase font-semibold">平均功率 (W)</label>
                                <input type="number" value={editForm.runPower} onChange={e => setEditForm({...editForm, runPower: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 uppercase font-semibold">平均心率 (bpm)</label>
                                <input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono" />
                            </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 flex justify-between items-center">
                {modalView === 'list' ? (
                    <div className="w-full flex justify-end">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors">
                            關閉
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setModalView('list')} 
                                className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2"
                            >
                                <ArrowLeft size={18} /> 返回清單
                            </button>
                            {currentDocId && (
                                <button onClick={handleDelete} className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2">
                                    <Trash2 size={18} /> 刪除
                                </button>
                            )}
                        </div>
                        
                        <div className="flex gap-3 items-center">
                            {editForm.status === 'planned' && (
                            <button 
                                onClick={markAsDone}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors animate-pulse-slow"
                            >
                                <CheckCircle2 size={18} /> 完成此訓練
                            </button>
                            )}

                            <button 
                            onClick={handleSave}
                            className={`px-6 py-2 text-white rounded-lg font-bold transition-colors flex items-center gap-2 ${
                                editForm.status === 'planned' ? 'bg-blue-600 hover:bg-blue-700' : 
                                editForm.type === 'run' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                            }`}
                            >
                            <Save size={18} /> 
                            {editForm.status === 'planned' ? '儲存計畫' : '儲存紀錄'}
                            </button>
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