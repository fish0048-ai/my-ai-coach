import { doc, getDoc, getDocs, collection, query, where, setDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 核心函式：統整使用者資料並更新 AI Context
export const updateAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return "請先登入";

  try {
    // 1. 獲取個人檔案 (Profile) - 這是舊資料
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 獲取最近 30 天的訓練紀錄 (Calendar) - 這也是舊資料
    // 我們抓取過去 30 天的紀錄，讓 AI 知道您的近期狀態
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const q = query(
        calendarRef, 
        where('date', '>=', dateStr),
        orderBy('date', 'desc'),
        limit(20) // 限制筆數避免 Token 爆炸
    );
    const calendarSnap = await getDocs(q);

    // 3. 資料壓縮與格式化 (將舊資料轉為 AI 提示詞)
    let contextString = `[使用者 Profile]\n`;
    if (profile.height) contextString += `身材:${profile.height}cm/${profile.weight}kg, 體脂:${profile.bodyFat}%\n`;
    if (profile.goal) contextString += `目標:${profile.goal}\n`;
    if (profile.tdee) contextString += `TDEE:${profile.tdee}, BMR:${profile.bmr || 'N/A'}\n`;
    if (profile.supplements) contextString += `補品:${profile.supplements.replace(/\n/g, ',')}\n`;
    
    contextString += `\n[近期訓練紀錄 (近30天)]\n`;
    
    if (calendarSnap.empty) {
        contextString += "無近期紀錄。\n";
    } else {
        calendarSnap.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'completed') return;

            // 簡化日期顯示
            const shortDate = data.date.slice(5); // "2023-10-25" -> "10-25"
            
            if (data.type === 'run') {
                contextString += `${shortDate}:跑步 ${data.runDistance}km/${data.runDuration}m (配速:${data.runPace})\n`;
            } else if (data.type === 'strength' && Array.isArray(data.exercises)) {
                // 每個動作只取名稱與最大重量
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

    console.log("AI Context Updated Successfully");
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