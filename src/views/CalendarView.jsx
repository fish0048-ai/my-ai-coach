import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, CheckCircle2, Clock, ArrowLeft, Edit3, Copy, Move, Upload, RefreshCw, Download, CalendarDays, ShoppingBag, Timer, Flame, Heart, BarChart2, AlignLeft, Tag } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import { getHeadCoachPrompt, getWeeklySchedulerPrompt } from '../utils/aiPrompts';
// 關鍵：從 helpers 匯入所有工具
import { parseAndUploadFIT, parseAndUploadCSV, generateCSVData, formatDate, cleanNumber } from '../utils/importHelpers';
import WorkoutForm from '../components/Calendar/WorkoutForm';

// 只保留 UI 相關的 Helper
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

  const handleHeadCoachGenerate = async () => {
    /* ... 邏輯不變，省略 ... */
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
        }));
        alert("總教練已生成課表！");
    } catch (error) { alert("總教練思考中斷"); } finally { setIsGenerating(false); }
  };

  const handleWeeklyGenerate = async () => {
     /* ... 邏輯不變，省略 ... */
     // 使用 getWeeklySchedulerPrompt
     // 使用 cleanNumber
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
        link.setAttribute("download", `training_backup_${formatDate(new Date())}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) { alert("匯出失敗"); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    setLoading(true);
    try {
        let result;
        if (fileName.endsWith('.fit')) result = await parseAndUploadFIT(file);
        else if (fileName.endsWith('.csv')) result = await parseAndUploadCSV(file);
        
        if (result && result.success) {
            await fetchMonthWorkouts();
            alert(result.message);
        }
    } catch (err) { alert(err); } finally { setLoading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  // Drag Drop, Save, Edit, Delete... (保持原樣，確保 textClass 宣告)

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const days = []; for (let i = 0; i < firstDayOfMonth; i++) days.push(null); for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
       {/* ... Header & Controls ... */}
       
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
            
            // 修正：明確宣告 textClass
            let bgClass = 'bg-gray-900 border-gray-700';
            let textClass = 'text-gray-300';
            
            if (isDragOver) { bgClass = 'bg-blue-900/40 border-blue-400 border-dashed scale-105 shadow-xl'; }
            else if (isSelected) { bgClass = 'bg-blue-900/20 border-blue-500'; textClass = 'text-blue-400'; }
            
            return (
               // ... Grid Cell ...
               <div 
                key={idx}
                onClick={() => { setSelectedDate(cellDate); setModalView('list'); setIsModalOpen(true); }}
                className={`relative p-2 rounded-lg border transition-all cursor-pointer flex flex-col hover:bg-gray-700 aspect-square overflow-hidden ${bgClass}`}
              >
                <span className={`text-sm font-bold ${textClass}`}>{day}</span>
                {/* ... */}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* ... Modals (Import WorkoutForm) ... */}
    </div>
  );
}