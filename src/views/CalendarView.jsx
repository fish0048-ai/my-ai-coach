import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart, CheckCircle2, Clock, Tag } from 'lucide-react';
import { doc, setDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB'; // 引入自動標籤工具

// 修正日期格式化
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState({});
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 編輯表單狀態
  const [editForm, setEditForm] = useState({
    status: 'completed',
    type: 'strength',
    title: '',
    // 重訓資料結構更新：包含 targetMuscle 與 weight
    exercises: [], // [{ name, sets, reps, weight, targetMuscle }]
    runDistance: '',   
    runDuration: '',   
    runPace: '',       
    runPower: '',      
    runHeartRate: ''   
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    if (workouts[dateStr]) {
      setEditForm({ 
        type: 'strength',
        status: 'completed', 
        runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '',
        ...workouts[dateStr] 
      });
    } else {
      const todayStr = formatDate(new Date());
      const isFuture = dateStr > todayStr;
      resetForm(isFuture ? 'planned' : 'completed');
    }
  }, [selectedDate, workouts]);

  const resetForm = (defaultStatus = 'completed') => {
    setEditForm({
      status: defaultStatus,
      type: 'strength',
      title: '',
      exercises: [],
      runDistance: '',
      runDuration: '',
      runPace: '',
      runPower: '',
      runHeartRate: ''
    });
  };

  const fetchMonthWorkouts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'calendar'));
      const querySnapshot = await getDocs(q);
      const newWorkouts = {};
      querySnapshot.forEach((doc) => {
        newWorkouts[doc.id] = doc.data();
      });
      setWorkouts(newWorkouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setLoading(false);
    }
  };

  // 處理動作名稱變更，並自動偵測肌群
  const handleExerciseNameChange = (idx, value) => {
    const newEx = [...editForm.exercises];
    newEx[idx].name = value;
    // 自動標籤邏輯
    const detectedMuscle = detectMuscleGroup(value);
    if (detectedMuscle) {
        newEx[idx].targetMuscle = detectedMuscle;
    }
    setEditForm({...editForm, exercises: newEx});
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const isStrengthEmpty = editForm.type === 'strength' && editForm.exercises.length === 0 && !editForm.title;
    const isRunEmpty = editForm.type === 'run' && !editForm.runDistance && !editForm.title;

    if (isStrengthEmpty || isRunEmpty) {
      handleDelete();
      return;
    }

    const dateStr = formatDate(selectedDate);
    try {
      const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
      const dataToSave = {
        ...editForm,
        date: dateStr,
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, dataToSave);
      setWorkouts(prev => ({ ...prev, [dateStr]: dataToSave }));
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("儲存失敗");
    }
  };

  const handleDelete = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const dateStr = formatDate(selectedDate);
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'calendar', dateStr));
      const newWorkouts = { ...workouts };
      delete newWorkouts[dateStr];
      setWorkouts(newWorkouts);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
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
      const prompt = `
        請為我設計一個針對「${aiPrompt}」的健身課表。
        請直接回傳一個 JSON 陣列，不要有其他文字。
        格式：[{"name": "動作名稱", "sets": "4", "reps": "8-12", "weight": "適重"}]
      `;
      const response = await runGemini(prompt, apiKey);
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedExercises = JSON.parse(cleanJson);
      
      if (Array.isArray(generatedExercises)) {
        // AI 生成後也跑一次自動標籤
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

      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-y-auto">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 auto-rows-fr">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="bg-transparent aspect-square"></div>;
            
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = formatDate(cellDate);
            const hasWorkout = workouts[dateStr];
            const isSelected = formatDate(selectedDate) === dateStr;
            const isToday = formatDate(new Date()) === dateStr;
            const isPlanned = hasWorkout?.status === 'planned';

            let bgClass = 'bg-gray-900 border-gray-700';
            let textClass = 'text-gray-300';
            
            if (isSelected) {
              bgClass = 'bg-blue-900/20 border-blue-500';
              textClass = 'text-blue-400';
            } else if (hasWorkout) {
              if (isPlanned) {
                bgClass = 'bg-gray-800 border-blue-400/50 border-dashed';
                textClass = 'text-blue-300';
              } else if (hasWorkout.type === 'run') {
                bgClass = 'bg-orange-500/10 border-orange-500/30';
              } else {
                bgClass = 'bg-green-500/10 border-green-500/30';
              }
            }

            return (
              <div 
                key={idx}
                onClick={() => { setSelectedDate(cellDate); setIsModalOpen(true); }}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square ${bgClass} ${isToday ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}`}
              >
                <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                {hasWorkout && (
                  <div className={`mt-1 text-xs px-1 py-0.5 rounded truncate flex items-center gap-1
                    ${isPlanned ? 'text-blue-300 bg-blue-500/10' : 
                      hasWorkout.type === 'run' ? 'text-orange-400 bg-orange-500/10' : 'text-green-400 bg-green-500/10'}`
                  }>
                    {isPlanned && <Clock size={10} />}
                    {hasWorkout.title || (hasWorkout.type === 'run' ? '跑步' : '訓練')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 w-full max-w-4xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className={`p-6 border-b flex justify-between items-center ${editForm.status === 'planned' ? 'border-blue-900 bg-blue-900/10' : 'border-gray-800'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-white">
                    {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
                  </h2>
                  <span className={`text-xs px-2 py-1 rounded-full border ${editForm.status === 'planned' ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-green-500 text-green-400 bg-green-500/10'}`}>
                    {editForm.status === 'planned' ? '未來計畫' : '完成紀錄'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  {editForm.status === 'planned' ? '規劃您未來的訓練菜單' : '紀錄您已完成的運動數據'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
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

                  {/* 動作列表 Header */}
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
                            {/* 顯示自動偵測到的部位標籤 */}
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

            <div className="p-6 border-t border-gray-800 flex justify-between items-center">
              <button onClick={handleDelete} className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2"><Trash2 size={18} /> 刪除</button>
              
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}