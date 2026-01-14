import { doc, getDoc, getDocs, collection, query, where, setDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 核心函式：統整使用者資料並更新 AI Context
export const updateAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return "請先登入";

  try {
    // 1. 獲取個人檔案 (Profile) - 基礎資料
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 獲取最近 30 天的訓練紀錄 (Calendar) - 運動表現
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const qCalendar = query(
        calendarRef, 
        where('date', '>=', dateStr),
        orderBy('date', 'desc'),
        limit(20)
    );
    const calendarSnap = await getDocs(qCalendar);

    // 3. 獲取最近的體重/體脂紀錄 (Body Logs) - 身體變化 (新增部分)
    const bodyLogsRef = collection(db, 'users', user.uid, 'body_logs');
    const qBody = query(
        bodyLogsRef,
        orderBy('date', 'desc'),
        limit(10) // 抓取最近 10 筆體態變化，讓 AI 判斷趨勢
    );
    const bodyLogsSnap = await getDocs(qBody);

    // --- 資料壓縮與格式化 (Prompt Engineering) ---
    let contextString = `[使用者 Profile]\n`;
    if (profile.height) contextString += `身高:${profile.height}cm, 體重:${profile.weight}kg, 體脂:${profile.bodyFat || '?'}%\n`;
    if (profile.age) contextString += `年齡:${profile.age}, 性別:${profile.gender}, 活動量:${profile.activity}\n`;
    if (profile.goal) contextString += `目標:${profile.goal}\n`;
    if (profile.tdee) contextString += `TDEE:${profile.tdee} kcal, BMR:${profile.bmr || 'N/A'}\n`;
    if (profile.maxHeartRate) contextString += `最大心率:${profile.maxHeartRate}\n`;
    if (profile.supplements) contextString += `補品:${profile.supplements.replace(/\n/g, ',')}\n`;
    
    // 加入體態趨勢
    if (!bodyLogsSnap.empty) {
        contextString += `\n[近期體態趨勢 (Body Trends)]\n`;
        const logs = [];
        bodyLogsSnap.forEach(doc => logs.push(doc.data()));
        // 顯示為：日期: 體重kg, 體脂%
        logs.forEach(log => {
            contextString += `${log.date}: ${log.weight}kg` + (log.bodyFat ? `, ${log.bodyFat}%` : '') + '\n';
        });
    }

    contextString += `\n[近期訓練紀錄 (近30天)]\n`;
    
    if (calendarSnap.empty) {
        contextString += "無近期紀錄。\n";
    } else {
        calendarSnap.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'completed') return;

            const shortDate = data.date.slice(5); // "2023-10-25" -> "10-25"
            
            if (data.type === 'run') {
                contextString += `${shortDate}:跑步 ${data.runDistance}km/${data.runDuration}m (配速:${data.runPace}, HR:${data.runHeartRate || 'N/A'})\n`;
            } else if (data.type === 'strength' && Array.isArray(data.exercises)) {
                // 每個動作只取名稱與最大重量，節省 token
                const exSummary = data.exercises.map(ex => {
                    const weightStr = ex.weight ? `(${ex.weight}kg)` : '';
                    return `${ex.name}${weightStr}`;
                }).join(', ');
                contextString += `${shortDate}:重訓(${data.title}): ${exSummary}\n`;
            } else if (data.type === 'analysis') {
                contextString += `${shortDate}:AI分析:${data.title} (評分:${data.score})\n`;
            }
        });
    }

    // 4. 儲存統整後的 Context 到 Firestore
    const aiContextRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
    await setDoc(aiContextRef, {
        content: contextString,
        lastUpdated: new Date().toISOString()
    });

    console.log("AI Context Updated Successfully with History");
    return contextString;

  } catch (error) {
    console.error("Failed to update AI context:", error);
    throw error;
  }
};

// 輔助函式：取得目前的 Context (給 Chat UI 用)
export const getAIContext = async () => {
    const user = auth.currentUser;
    if (!user) return "";
    
    try {
        const docRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data().content : "";
    } catch (error) {
        console.error("Error reading AI context:", error);
        return "";
    }
};