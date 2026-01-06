import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell } from 'lucide-react';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';

// 日期格式化工具 (YYYY-MM-DD)
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState({}); // 快取當月訓練資料
  const [loading, setLoading] = useState(false);
  
  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    exercises: [] // [{ id, name, sets, reps, weight }]
  });
  
  // AI 相關
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // 監聽月份切換，讀取該月資料
  useEffect(() => {
    fetchMonthWorkouts();
  }, [currentDate]);

  // 當選取日期改變，準備編輯資料
  useEffect(() => {
    const dateStr = formatDate(selectedDate);
    if (workouts[dateStr]) {
      setEditForm(workouts[dateStr]);
    } else {
      setEditForm({ title: '', exercises: [] });
    }
  }, [selectedDate, workouts]);

  const fetchMonthWorkouts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // 這裡簡單抓取所有訓練紀錄，優化做法是只抓當月 (where date >= startOfMonth)
      // 為了示範方便，我們先抓取該使用者的所有 calendar collection
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
    
    // 如果標題和動作都是空的，視為刪除
    if (!editForm.title && editForm.exercises.length === 0) {
      handleDelete();
      return;
    }

    const dateStr = formatDate(selectedDate);
    try {
      const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
      const dataToSave = {
        ...editForm,
        date: dateStr,
        updatedAt: new Date()
      };
      
      await setDoc(docRef, dataToSave);
      
      // 更新本地狀態
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
      setEditForm({ title: '', exercises: [] });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  // 呼叫 AI 生成課表
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
        請直接回傳一個 JSON 陣列，不要有其他文字或 Markdown標記。
        格式範例：
        [
          {"name": "槓鈴臥推", "sets": "4", "reps": "8-12", "weight": "適重"},
          {"name": "啞鈴飛鳥", "sets": "3", "reps": "12-15", "weight": "輕"}
        ]
      `;
      
      const response = await runGemini(prompt, apiKey);
      // 清理回應字串，確保可以被 parse
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const generatedExercises = JSON.parse(cleanJson);
      
      if (Array.isArray(generatedExercises)) {
        setEditForm(prev => ({
          ...prev,
          title: prev.title || aiPrompt + " 訓練",
          exercises: [...prev.exercises, ...generatedExercises]
        }));
        setAiPrompt('');
      }
    } catch (error) {
      console.error(error);
      alert("AI 生成失敗，請確認格式或稍後再試。");
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
      {/* 頂部控制列 */}
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

      {/* 日曆網格 */}
      <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 p-4 overflow-y-auto">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-2 h-[calc(100%-2rem)] grid-rows-5">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="bg-transparent"></div>;
            
            // 建構該格子的日期字串
            const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dateStr = formatDate(cellDate);
            const hasWorkout = workouts[dateStr];
            const isSelected = formatDate(selectedDate) === dateStr;

            return (
              <div 
                key={idx}
                onClick={() => { setSelectedDate(cellDate); setIsModalOpen(true); }}
                className={`
                  relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700
                  ${isSelected ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-900'}
                  ${hasWorkout ? 'border-green-500/50' : ''}
                `}
              >
                <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                  {day}
                </span>
                
                {hasWorkout && (
                  <div className="mt-2 text-xs bg-green-500/20 text-green-400 p-1 rounded truncate">
                    {hasWorkout.title || '訓練'}
                  </div>
                )}
                {hasWorkout && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></div>
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
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日 訓練計畫
                </h2>
                <p className="text-gray-400 text-sm">編輯您的每日菜單</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* 標題輸入 */}
              <div>
                <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">訓練主題</label>
                <input 
                  type="text" 
                  value={editForm.title}
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  placeholder="例如：腿部轟炸日"
                  className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 outline-none"
                />
              </div>

              {/* AI 生成器 */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-4 rounded-xl border border-purple-500/30">
                <label className="text-xs text-purple-300 uppercase font-semibold mb-2 block flex items-center gap-1">
                  <Sparkles size={12} /> AI 智慧排程
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="輸入部位或目標 (例如: 高強度背肌訓練)"
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
                      <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center text-gray-400 font-mono text-xs">
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
                        className="w-16 bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1"
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
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800 flex justify-between">
              <button 
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2"
              >
                <Trash2 size={18} /> 刪除當日計畫
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
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                >
                  <Save size={18} /> 儲存變更
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}