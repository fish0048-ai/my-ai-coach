import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles, Save, Trash2, Calendar as CalendarIcon, Loader, X, Dumbbell, Activity, CheckCircle2, Clock, ArrowLeft, Edit3, Copy, Move, Upload, RefreshCw, Download, CalendarDays, ShoppingBag, Timer, Flame, Heart, BarChart2, AlignLeft, Tag } from 'lucide-react';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs, query, updateDoc, where, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGemini } from '../utils/gemini';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import { updateAIContext, getAIContext } from '../utils/contextManager';
import FitParser from 'fit-file-parser';
import { getHeadCoachPrompt, getWeeklySchedulerPrompt } from '../utils/aiPrompts';
import WorkoutForm from '../components/Calendar/WorkoutForm';

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
        const cleanNumber = (val) => (typeof val === 'number' ? val : parseFloat(val?.replace(/[^\d.]/g, '')) || '');

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
            runHeartRate: plan.runHeartRate || '', 
        }));
        alert("總教練已生成課表！");
    } catch (error) {
        console.error("AI Gen Error:", error);
        alert("總教練思考中斷，請重試");
    } finally { setIsGenerating(false); }
  };

  const handleWeeklyGenerate = async () => {
    const user = auth.currentUser;
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!user || !apiKey) return alert("請先登入並設定 API Key");
    setLoading(true);
    try {
        const weekDates = getWeekDates(currentDate);
        const planningDates = weekDates.filter(d => {
            const hasCompleted = (workouts[d] || []).some(w => w.status === 'completed');
            return !hasCompleted && weeklyPrefs[d] !== 'rest';
        });

        if (planningDates.length === 0) {
            setLoading(false);
            return alert("本週無需規劃。");
        }

        const profileRef = doc(db, 'users', user.uid);
        const profileSnap = await getDoc(profileRef);
        const userProfile = profileSnap.exists() ? profileSnap.data() : { goal: '健康' };
        const recentLogs = await getAIContext();
        const monthlyStats = { currentDist: monthlyMileage };

        let prompt = getWeeklySchedulerPrompt(userProfile, recentLogs, planningDates, weeklyPrefs, monthlyStats);
        prompt += "\n\nIMPORTANT: Output ONLY raw JSON Array.";
        const response = await runGemini(prompt, apiKey);
        
        let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const startIndex = cleanJson.indexOf('[');
        const endIndex = cleanJson.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1) cleanJson = cleanJson.substring(startIndex, endIndex + 1);

        const plans = JSON.parse(cleanJson);
        const batchPromises = plans.map(async (plan) => {
            if (plan.type === 'rest') return;
            const dataToSave = {
                date: plan.date,
                status: 'planned',
                type: plan.type === 'run' ? 'run' : 'strength',
                title: plan.title || 'AI 訓練計畫',
                notes: `[總教練週計畫]\n${plan.advice || ''}`,
                exercises: plan.exercises || [],
                runDistance: plan.runDistance || '',
                runDuration: plan.runDuration || '',
                runPace: plan.runPace || '',
                runHeartRate: plan.runHeartRate || '',
                updatedAt: new Date().toISOString()
            };
            await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
        });

        await Promise.all(batchPromises);
        await fetchMonthWorkouts();
        setShowWeeklyModal(false);
        alert(`成功生成 ${plans.length} 筆訓練計畫！`);
    } catch (error) {
        console.error("Weekly Gen Error:", error);
        alert("生成失敗");
    } finally { setLoading(false); }
  };

  const openWeeklyModal = () => {
      const weekDates = getWeekDates(currentDate);
      const initialPrefs = {};
      weekDates.forEach(date => initialPrefs[date] = 'auto');
      setWeeklyPrefs(initialPrefs);
      setShowWeeklyModal(true);
  };

  const handleSync = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
        await updateAIContext();
        await fetchMonthWorkouts();
        alert("同步完成！");
    } catch (error) { console.error("Sync failed:", error); } finally { setLoading(false); }
  };

  const handleExport = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'calendar'));
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
      const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
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

  // 補回 handleImportClick
  const handleImportClick = () => {
    csvInputRef.current?.click();
  };
  
  const handleCSVUpload = async (e) => { 
      const file = e.target.files?.[0];
      if (!file) return;
      
      setLoading(true);

      const processCSVContent = async (text) => {
          const lines = text.split(/\r\n|\n/).filter(l => l.trim());
          if (lines.length < 2) return { success: false, message: "檔案無內容" };

          const parseLine = (line) => {
              const res = [];
              let cur = '';
              let inQuote = false;
              for (let char of line) {
                  if (char === '"') inQuote = !inQuote;
                  else if (char === ',' && !inQuote) { res.push(cur); cur = ''; }
                  else cur += char;
              }
              res.push(cur);
              return res.map(s => s.replace(/^"|"$/g, '').trim());
          };

          const headers = parseLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
          const isChinese = headers.includes('活動類型');
          const isEnglish = headers.includes('Activity Type');
          
          if (!isChinese && !isEnglish) {
              return { success: false, retryBig5: true };
          }

          const idxMap = {};
          headers.forEach((h, i) => idxMap[h] = i);
          const getVal = (row, col) => row[idxMap[col]] || '';
          
          const cols = isChinese ? 
              { type: '活動類型', date: '日期', title: '標題', dist: '距離', time: '時間', hr: '平均心率', pwr: '平均功率', cal: '卡路里', sets: '總組數', reps: '總次數' } :
              { type: 'Activity Type', date: 'Date', title: 'Title', dist: 'Distance', time: 'Time', hr: 'Avg HR', pwr: 'Avg Power', cal: 'Calories', sets: 'Total Sets', reps: 'Total Reps' };

          const user = auth.currentUser;
          if (!user) return { success: false, message: "請先登入" };

          let importCount = 0;
          let updateCount = 0;
          const currentData = await fetchCurrentWorkoutsForCheck(user.uid); 

          for (let i = 1; i < lines.length; i++) {
                const row = parseLine(lines[i]);
                if (row.length < headers.length) continue;
                
                const activityTypeRaw = getVal(row, cols.type);
                const dateRaw = getVal(row, cols.date);
                
                let dateStr = '';
                const dateMatch = dateRaw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                if (dateMatch) {
                    const y = dateMatch[1];
                    const m = dateMatch[2].padStart(2, '0');
                    const d = dateMatch[3].padStart(2, '0');
                    dateStr = `${y}-${m}-${d}`;
                } else {
                    continue;
                }

                const title = getVal(row, cols.title);
                let type = 'strength';
                const tRaw = activityTypeRaw.toLowerCase();
                if (tRaw.includes('run') || tRaw.includes('跑') || tRaw.includes('walk') || tRaw.includes('走')) {
                    type = 'run';
                }

                const durRaw = getVal(row, cols.time);
                let duration = 0;
                if (durRaw.includes(':')) {
                    const parts = durRaw.split(':').map(Number);
                    if (parts.length === 3) duration = parts[0]*60 + parts[1] + parts[2]/60;
                    else if (parts.length === 2) duration = parts[0] + parts[1]/60;
                } else {
                    duration = parseFloat(durRaw) || 0;
                }
                const runDuration = Math.round(duration).toString();

                const distRaw = getVal(row, cols.dist);
                const runDistance = type === 'run' ? distRaw.replace(/,/g, '') : '';
                const hrRaw = getVal(row, cols.hr);
                const runHeartRate = (hrRaw.includes('--') ? '' : hrRaw);
                const pwrRaw = getVal(row, cols.pwr);
                const runPower = type === 'run' ? (pwrRaw.includes('--') ? '' : pwrRaw) : '';
                
                const calRaw = getVal(row, cols.cal);
                const calories = calRaw.replace(/,/g, '');
                const setsRaw = getVal(row, cols.sets);
                const repsRaw = getVal(row, cols.reps);
                
                let runPace = '';
                if (type === 'run' && parseFloat(runDistance) > 0 && duration > 0) {
                   const dist = parseFloat(runDistance);
                   const paceVal = duration / dist; 
                   const pm = Math.floor(paceVal);
                   const ps = Math.round((paceVal - pm) * 60);
                   runPace = `${pm}'${String(ps).padStart(2, '0')}" /km`;
                }

                let exercises = [];
                let notes = '';
                
                if (type === 'strength') {
                    const totalSets = setsRaw && setsRaw !== '--' ? parseInt(setsRaw) : 0;
                    const totalReps = repsRaw && repsRaw !== '--' ? parseInt(repsRaw) : 0;
                    
                    if (totalSets > 0 || totalReps > 0 || calories > 0 || duration > 0) {
                        const displaySets = totalSets > 0 ? totalSets : 1;
                        const displayReps = totalSets > 0 && totalReps > 0 ? Math.round(totalReps / totalSets) : (totalReps > 0 ? totalReps : 0);
                        
                        exercises.push({
                            name: `匯入訓練 (共 ${displaySets} 組)`,
                            sets: displaySets,
                            reps: displayReps > 0 ? displayReps : "N/A",
                            weight: 0, 
                            targetMuscle: "" 
                        });
                        
                        let noteParts = [];
                        if (totalSets) noteParts.push(`總組數: ${totalSets}`);
                        if (totalReps) noteParts.push(`總次數: ${totalReps}`);
                        if (calories) noteParts.push(`消耗: ${calories} kcal`);
                        notes = noteParts.join(', ');
                    }
                }

                const dataToSave = {
                    date: dateStr,
                    status: 'completed',
                    type,
                    title: title || (type === 'run' ? '跑步訓練' : '肌力訓練'),
                    exercises,
                    runDistance,
                    runDuration,
                    runPace,
                    runPower,
                    runHeartRate,
                    calories, 
                    notes,    
                    imported: true,
                    updatedAt: new Date().toISOString()
                };

                const existingDoc = currentData.find(d => 
                    d.date === dateStr && 
                    d.title === dataToSave.title && 
                    d.type === type
                );

                try {
                    if (existingDoc) {
                        await updateDoc(doc(db, 'users', user.uid, 'calendar', existingDoc.id), dataToSave);
                        updateCount++;
                    } else {
                        await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
                        importCount++;
                    }
                } catch (e) {
                    console.error("Import error row " + i, e);
                }
           }

          return { success: true, count: importCount, updateCount };
      };

      const readerUtf8 = new FileReader();
      readerUtf8.onload = async (e) => {
          const text = e.target.result;
          const result = await processCSVContent(text);
          
          if (result.retryBig5) {
              const readerBig5 = new FileReader();
              readerBig5.onload = async (e2) => {
                  const textBig5 = e2.target.result;
                  const resBig5 = await processCSVContent(textBig5);
                  finishUpload(resBig5);
              };
              readerBig5.readAsText(file, 'Big5');
          } else {
              finishUpload(result);
          }
      };
      readerUtf8.readAsText(file, 'UTF-8');

      const finishUpload = async (res) => {
          if (res.success) {
              await updateAIContext();
              await fetchMonthWorkouts();
              alert(`匯入完成！\n新增：${res.count} 筆\n更新：${res.updateCount} 筆`);
          } else {
              alert(res.message || "匯入失敗");
          }
          setLoading(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
      };
  };

  const fetchCurrentWorkoutsForCheck = async (uid) => {
        const q = query(collection(db, 'users', uid, 'calendar'));
        const sn = await getDocs(q);
        const res = [];
        sn.forEach(d => res.push({ id: d.id, ...d.data() }));
        return res;
    };
  
  const handleFitUpload = (file) => {
      // FIT 匯入邏輯 (保持不變)
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
          const blob = event.target.result;
          const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', temperatureUnit: 'celsius', elapsedRecordField: true });
          fitParser.parse(blob, async (error, data) => {
              if (error) { alert("FIT 解析失敗"); setLoading(false); return; }
              
              let sessions = data.sessions || data.session || [];
              if (sessions.length === 0 && data.activity?.sessions) sessions = data.activity.sessions;
              const session = sessions[0] || {};
              const startTime = session.start_time ? new Date(session.start_time) : new Date();
              const dateStr = formatDate(startTime);
              
              const isRunning = session.sport === 'running';
              const type = isRunning ? 'run' : 'strength';
              
              const duration = Math.round((session.total_elapsed_time || 0) / 60).toString();
              const distance = isRunning ? (session.total_distance || 0).toFixed(2) : '';
              const calories = Math.round(session.total_calories || 0).toString();
              const hr = Math.round(session.avg_heart_rate || 0).toString();
              const power = Math.round(session.avg_power || 0).toString();

              let exercises = [];
              const rawSets = data.sets || data.set || [];
              
              if (type === 'strength' && rawSets.length > 0) {
                  rawSets.forEach((set, idx) => {
                      if (!set.repetition_count || set.repetition_count === 0) return;

                      let weight = set.weight || 0;
                      if (weight > 1000) weight = weight / 1000;
                      const reps = set.repetition_count;
                      
                      let name = "訓練動作";
                      if (set.wkt_step_label) {
                          name = set.wkt_step_label;
                      } else if (set.category) {
                           const catMap = { 
                               13: '胸部', 15: '腿部', 3: '腹部', 1: '背部', 2: '手臂', 23: '肩膀' 
                           };
                           name = catMap[set.category] ? `${catMap[set.category]}訓練` : `動作(類別${set.category})`;
                      }

                      const lastEx = exercises[exercises.length - 1];
                      if (lastEx && lastEx.name === name && Math.abs(lastEx.weight - weight) < 0.1 && lastEx.reps === reps) {
                          lastEx.sets += 1;
                      } else {
                          exercises.push({
                              name: name,
                              sets: 1, 
                              reps: reps,
                              weight: Math.round(weight), 
                              targetMuscle: detectMuscleGroup(name) || "" 
                          });
                      }
                  });
              }

              if (exercises.length === 0 && type === 'strength') {
                  const totalSets = session.total_sets || session.num_sets || 0;
                  const totalReps = session.total_reps || session.num_reps || 0;
                  
                  if (totalSets > 0) {
                      exercises.push({
                          name: "匯入訓練 (無詳細組數)",
                          sets: totalSets,
                          reps: totalReps || "N/A",
                          weight: 0,
                          targetMuscle: ""
                      });
                  }
              }

              const dataToSave = {
                  date: dateStr,
                  status: 'completed',
                  type,
                  title: isRunning ? '跑步訓練 (FIT)' : '重訓 (FIT匯入)',
                  exercises,
                  runDistance: distance,
                  runDuration: duration,
                  runPace: '', 
                  runPower: power,
                  runHeartRate: hr,
                  calories,
                  notes: `由 Garmin FIT 匯入。共解析 ${exercises.length} 項動作。`,
                  imported: true,
                  updatedAt: new Date().toISOString()
              };

              if (isRunning && parseFloat(distance) > 0 && parseFloat(duration) > 0) {
                  const paceVal = parseFloat(duration) / parseFloat(distance);
                  const pm = Math.floor(paceVal);
                  const ps = Math.round((paceVal - pm) * 60);
                  dataToSave.runPace = `${pm}'${String(ps).padStart(2, '0')}" /km`;
              }

              try {
                  const user = auth.currentUser;
                  if (user) {
                       await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
                      await updateAIContext();
                      await fetchMonthWorkouts();
                      alert("FIT 匯入成功！");
                  }
              } catch(e) { alert("儲存失敗"); }
              finally { setLoading(false); }
          });
      };
      reader.readAsArrayBuffer(file);
  };
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.fit')) { await handleFitUpload(file); }
    else if (fileName.endsWith('.csv')) { await handleCSVUpload(file); }
    else { alert("僅支援 .fit 或 .csv 檔案"); }
    if (fileInputRef.current) fileInputRef.current.value = '';
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
  const weekDateList = getWeekDates(currentDate);

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
            <button onClick={() => { 
                const initialPrefs = {}; 
                weekDateList.forEach(d => initialPrefs[d] = 'auto'); 
                setWeeklyPrefs(initialPrefs); 
                setShowWeeklyModal(true); 
            }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-900/30 transition-all">
                <CalendarDays size={18} /> 本週總教練排程
            </button>
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
          </div>
        </div>
      )}
    </div>
  );
}