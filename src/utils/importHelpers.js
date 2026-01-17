import { collection, addDoc, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updateAIContext } from './contextManager';
import { detectMuscleGroup } from '../assets/data/exerciseDB';
import FitParser from 'fit-file-parser';

// 輔助：日期格式化
const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 輔助：檢查重複資料
const fetchCurrentWorkoutsForCheck = async (uid) => {
  const q = query(collection(db, 'users', uid, 'calendar'));
  const sn = await getDocs(q);
  const res = [];
  sn.forEach(d => res.push({ id: d.id, ...d.data() }));
  return res;
};

// --- FIT 檔案處理 ---
export const parseAndUploadFIT = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const blob = event.target.result;
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
      });

      fitParser.parse(blob, async (error, data) => {
        if (error) {
          console.error("FIT Parse Error:", error);
          reject("FIT 檔案解析失敗");
          return;
        }

        const user = auth.currentUser;
        if (!user) {
           reject("請先登入");
           return;
        }

        // 1. 尋找 session
        let sessions = data.sessions || data.session || [];
        if (sessions.length === 0 && data.activity?.sessions) sessions = data.activity.sessions;
        const session = sessions[0] || {};
        
        let startTime = session.start_time ? new Date(session.start_time) : new Date();
        // 如果沒有時間，嘗試從 records 抓
        if (!session.start_time && data.records && data.records.length > 0) {
             startTime = new Date(data.records[0].timestamp);
        }
        const dateStr = formatDate(startTime);

        const isRunning = session.sport === 'running' || session.sub_sport === 'treadmill';
        const type = isRunning ? 'run' : 'strength';

        const duration = Math.round((session.total_elapsed_time || 0) / 60).toString();
        const distance = isRunning ? (session.total_distance || 0).toFixed(2) : '';
        const calories = Math.round(session.total_calories || 0).toString();
        const hr = Math.round(session.avg_heart_rate || 0).toString();
        const power = Math.round(session.avg_power || 0).toString();

        let exercises = [];
        const rawSets = data.sets || data.set || [];

        // 2. 解析 Sets
        if (type === 'strength' && rawSets.length > 0) {
            rawSets.forEach((set) => {
                if (!set.repetition_count) return;
                let weight = set.weight || 0;
                if (weight > 1000) weight = weight / 1000;
                const reps = set.repetition_count;

                let name = "訓練動作";
                if (set.wkt_step_label) name = set.wkt_step_label;
                else if (set.category) {
                     const catMap = { 13: '胸部', 15: '腿部', 3: '腹部', 1: '背部', 2: '手臂', 23: '肩膀' };
                     name = catMap[set.category] ? `${catMap[set.category]}訓練` : `動作(類別${set.category})`;
                }

                // 合併邏輯
                const lastEx = exercises[exercises.length - 1];
                if (lastEx && lastEx.name === name && Math.abs(lastEx.weight - weight) < 1 && lastEx.reps === reps) {
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

        // 兜底摘要
        if (exercises.length === 0 && type === 'strength') {
            exercises.push({
                name: "匯入訓練 (無詳細動作)",
                sets: session.total_sets || 1,
                reps: session.total_reps || "N/A",
                weight: 0,
                targetMuscle: ""
            });
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

        // 配速計算
        if (isRunning && parseFloat(distance) > 0 && parseFloat(duration) > 0) {
            const paceVal = parseFloat(duration) / parseFloat(distance);
            const pm = Math.floor(paceVal);
            const ps = Math.round((paceVal - pm) * 60);
            dataToSave.runPace = `${pm}'${String(ps).padStart(2, '0')}" /km`;
        }

        try {
            await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
            await updateAIContext();
            resolve({ success: true, message: `FIT 匯入成功！\n日期：${dateStr}` });
        } catch (e) {
            console.error(e);
            reject("資料庫寫入失敗");
        }
      });
    };
    reader.readAsArrayBuffer(file);
  });
};

// --- CSV 檔案處理 ---
export const parseAndUploadCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // 內部處理函式
    const processContent = async (text) => {
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

        if (!isChinese && !isEnglish) return { retryBig5: true };

        const idxMap = {};
        headers.forEach((h, i) => idxMap[h] = i);
        const getVal = (row, col) => row[idxMap[col]] || '';
        
        const cols = isChinese ? 
            { type: '活動類型', date: '日期', title: '標題', dist: '距離', time: '時間', hr: '平均心率', pwr: '平均功率', cal: '卡路里', sets: '總組數', reps: '總次數' } :
            { type: 'Activity Type', date: 'Date', title: 'Title', dist: 'Distance', time: 'Time', hr: 'Avg HR', pwr: 'Avg Power', cal: 'Calories', sets: 'Total Sets', reps: 'Total Reps' };

        const user = auth.currentUser;
        if (!user) return { success: false, message: "請先登入" };

        const currentData = await fetchCurrentWorkoutsForCheck(user.uid); 
        let importCount = 0;
        let updateCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = parseLine(lines[i]);
            if (row.length < headers.length) continue;

            const dateRaw = getVal(row, cols.date);
            let dateStr = '';
            const dateMatch = dateRaw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
            if (dateMatch) {
                const y = dateMatch[1];
                const m = dateMatch[2].padStart(2, '0');
                const d = dateMatch[3].padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            } else continue;

            let type = 'strength';
            const tRaw = getVal(row, cols.type).toLowerCase();
            if (tRaw.includes('run') || tRaw.includes('跑') || tRaw.includes('walk') || tRaw.includes('走')) type = 'run';

            // 時間解析
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

            // 數據欄位
            const runDistance = type === 'run' ? getVal(row, cols.dist).replace(/,/g, '') : '';
            const runHeartRate = getVal(row, cols.hr).replace('--', '');
            const runPower = type === 'run' ? getVal(row, cols.pwr).replace('--', '') : '';
            const calories = getVal(row, cols.cal).replace(/,/g, '');
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
                        weight: 0, targetMuscle: "" 
                    });
                    notes = `匯入摘要: 總組數 ${totalSets}, 總次數 ${totalReps}`;
                }
            }

            const dataToSave = {
                date: dateStr,
                status: 'completed',
                type,
                title: getVal(row, cols.title) || (type === 'run' ? '跑步訓練' : '肌力訓練'),
                exercises,
                runDistance, runDuration, runPace, runPower, runHeartRate, calories, notes,    
                imported: true,
                updatedAt: new Date().toISOString()
            };

            // 防重複與更新
            const existingDoc = currentData.find(d => d.date === dateStr && d.title === dataToSave.title && d.type === type);

            try {
                if (existingDoc) {
                    await updateDoc(doc(db, 'users', user.uid, 'calendar', existingDoc.id), dataToSave);
                    updateCount++;
                } else {
                    await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
                    importCount++;
                }
            } catch (e) {
                console.error("Row import error", e);
            }
        }
        await updateAIContext();
        return { success: true, message: `匯入完成！\n新增：${importCount} 筆\n更新：${updateCount} 筆` };
    };

    // 第一次嘗試 UTF-8
    reader.onload = async (e) => {
        const text = e.target.result;
        const res = await processContent(text);
        if (res.retryBig5) {
            // 重試 Big5
            const readerBig5 = new FileReader();
            readerBig5.onload = async (e2) => {
                const resBig5 = await processContent(e2.target.result);
                resolve(resBig5);
            };
            readerBig5.readAsText(file, 'Big5');
        } else {
            resolve(res);
        }
    };
    reader.readAsText(file, 'UTF-8');
  });
};