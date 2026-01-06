import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, Timer, Zap, Heart } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';

// 修正日期格式化：強制使用本地時間，解決時區落差問題
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
    type: 'strength', // 'strength' | 'run'
    title: '',
    // 重訓資料
    exercises: [], 
    // 跑步資料
    runDistance: '',   // km
    runDuration: '',   // minutes
    runPace: '',       // calculated string
    runPower: '',      // watts
    runHeartRate: ''   // bpm
  });
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 監聽跑步數據變化，自動計算配速
  useEffect(() => {
    if (editForm.type === 'run' && editForm.runDistance && editForm.runDuration) {
      const dist = parseFloat(editForm.runDistance);
      const time = parseFloat(editForm.runDuration);
      
      if (dist > 0 && time > 0) {
        const paceDecimal = time / dist;
        const paceMin = Math.floor(paceDecimal);
        const paceSec = Math.round((paceDecimal - paceMin) * 60);
        const paceStr = `${paceMin}'${String(paceSec).padStart(2, '0')}" /km`;
        
        setEditForm(prev => ({ ...prev, runPace: paceStr }));
      }
    }
  }, [editForm.runDistance, editForm.runDuration, editForm.type]);

  useEffect(() => {
    fetchMonthWorkouts();
  }, [currentDate]);

  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    if (workouts[dateStr]) {
      // 如果有舊資料，載入它；如果舊資料沒有 type 欄位，預設為 'strength'
      setEditForm({ 
        type: 'strength',
        runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '',
        ...workouts[dateStr] 
      });
    } else {
      resetForm();
    }
  }, [selectedDate, workouts]);

  const resetForm = () => {
    setEditForm({
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

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // 簡單檢核：如果標題空且沒內容，視為刪除
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
        updatedAt: new Date().toISOString() // 這裡存 ISO 字串給後端沒問題
      };
      
      await setDoc(docRef, dataToSave);
      
      setWorkouts(prev => ({
        ...prev,
        [dateStr]: dataToSave
      }));
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
      resetForm();
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
        setEditForm(prev => ({
          ...prev,
          type: 'strength', // 強制切換回重訓模式
          title: prev.title || aiPrompt + " 訓練",
          exercises: [...prev.exercises, ...generatedExercises]
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

  // 日曆邏輯
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-blue-500" />
          運動行事曆
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-700 rounded-full text-white">
            <ChevronLeft />
          </button>
          <span className="text-xl font-mono text-white min-w-[140px] text-center">
            {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-700 rounded-full text-white">
            <ChevronRight />
          </button>
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

            return (
              <div 
                key={idx}
                onClick={() => { setSelectedDate(cellDate); setIsModalOpen(true); }}
                className={`
                  relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square
                  ${isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-900'}
                  ${isToday ? 'ring-2 ring-yellow-500 ring-offset-2 ring-offset-gray-900' : ''}
                `}
              >
                <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                  {day}
                </span>
                
                {hasWorkout && (
                  <div className={`mt-1 text-xs px-1 py-0.5 rounded truncate ${hasWorkout.type === 'run' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                    {hasWorkout.title || (hasWorkout.type === 'run' ? '跑步' : '訓練')}
                  </div>
                )}
                {hasWorkout && (
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${hasWorkout.type === 'run' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 編輯 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日 紀錄
                </h2>
                <p className="text-gray-400 text-sm">請選擇運動類型並記錄</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* 類型切換 */}
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

              {/* 共用標題 */}
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

              {/* 根據類型顯示不同表單 */}
              {editForm.type === 'strength' ? (
                <>
                  {/* AI 生成器 (僅重訓顯示) */}
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

                  {/* 動作列表 */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-gray-500 uppercase font-semibold">動作清單</label>
                      <button 
                        onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '' }] }))}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <Plus size={12} /> 新增動作
                      </button>
                    </div>
                    
                    {editForm.exercises.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                        尚無動作，請手動新增或使用 AI 生成
                      </div>
                    ) : (
                      editForm.exercises.map((ex, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-gray-800 p-2 rounded-lg border border-gray-700">
                          <div className="w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-gray-400 font-mono text-xs">
                            {idx + 1}
                          </div>
                          <input 
                            placeholder="動作名稱"
                            value={ex.name}
                            onChange={e => {
                              const newEx = [...editForm.exercises];
                              newEx[idx].name = e.target.value;
                              setEditForm({...editForm, exercises: newEx});
                            }}
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600"
                          />
                          <input 
                            placeholder="組數"
                            value={ex.sets}
                            onChange={e => {
                              const newEx = [...editForm.exercises];
                              newEx[idx].sets = e.target.value;
                              setEditForm({...editForm, exercises: newEx});
                            }}
                            className="w-12 bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
                          />
                          <span className="text-gray-500 text-xs">x</span>
                          <input 
                            placeholder="次數"
                            value={ex.reps}
                            onChange={e => {
                              const newEx = [...editForm.exercises];
                              newEx[idx].reps = e.target.value;
                              setEditForm({...editForm, exercises: newEx});
                            }}
                            className="w-14 bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
                          />
                          <button 
                            onClick={() => {
                              const newEx = editForm.exercises.filter((_, i) => i !== idx);
                              setEditForm({...editForm, exercises: newEx});
                            }}
                            className="p-2 text-gray-500 hover:text-red-400"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                /* 跑步輸入表單 */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase font-semibold">距離 (km)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editForm.runDistance}
                      onChange={e => setEditForm({...editForm, runDistance: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase font-semibold">時間 (分鐘)</label>
                    <input 
                      type="number"
                      step="1"
                      value={editForm.runDuration}
                      onChange={e => setEditForm({...editForm, runDuration: e.target.value})}
                      placeholder="0"
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg"
                    />
                  </div>
                  
                  {/* 自動計算區塊 */}
                  <div className="col-span-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 uppercase">平均配速 (自動計算)</div>
                      <div className="text-xl font-bold text-orange-400 font-mono">
                        {editForm.runPace || '--\'--" /km'}
                      </div>
                    </div>
                    <Timer className="text-orange-500 opacity-20" size={32} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                      <Zap size={12} /> 平均功率 (W)
                    </label>
                    <input 
                      type="number"
                      value={editForm.runPower}
                      onChange={e => setEditForm({...editForm, runPower: e.target.value})}
                      placeholder="例如: 200"
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
                      <Heart size={12} /> 平均心率 (bpm)
                    </label>
                    <input 
                      type="number"
                      value={editForm.runHeartRate}
                      onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})}
                      placeholder="例如: 155"
                      className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex justify-between">
              <button 
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2"
              >
                <Trash2 size={18} /> 刪除
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  className={`px-6 py-2 text-white rounded-lg font-bold transition-colors flex items-center gap-2 ${
                    editForm.type === 'run' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <Save size={18} /> 儲存紀錄
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}