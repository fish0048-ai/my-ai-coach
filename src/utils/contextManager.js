import { doc, getDoc, getDocs, collection, query, where, setDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 核心函式：統整使用者資料並更新 AI Context
export const updateAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. 獲取個人檔案 (Profile)
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 獲取最近 14 天的訓練紀錄 (Calendar)
    // 限制 14 天是為了 Token 最佳化，AI 只需要知道「近期狀態」
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 14);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const q = query(
        calendarRef, 
        where('date', '>=', dateStr),
        orderBy('date', 'desc'),
        limit(10) // 最多只取最近 10 筆，避免爆 Token
    );
    const calendarSnap = await getDocs(q);

    // 3. 資料壓縮與格式化 (Token Saving Logic)
    let contextString = `[Profile]\n`;
    contextString += `Stats:${profile.height}cm/${profile.weight}kg/BF:${profile.bodyFat}%/TDEE:${profile.tdee}\n`;
    contextString += `Goal:${profile.goal}\n`;
    if (profile.supplements) contextString += `Supps:${profile.supplements.replace(/\n/g, ',')}\n`;
    
    contextString += `\n[Recent Logs (Last 2 weeks)]\n`;
    
    if (calendarSnap.empty) {
        contextString += "No recent records.\n";
    } else {
        calendarSnap.forEach(doc => {
            const data = doc.data();
            if (data.status !== 'completed') return;

            // 簡化日期
            const shortDate = data.date.slice(5); // "2023-10-25" -> "10-25"
            
            if (data.type === 'run') {
                contextString += `${shortDate}:Run ${data.runDistance}km in ${data.runDuration}m\n`;
            } else if (data.type === 'strength' && data.exercises) {
                // 每個動作只取名稱與最大重量，節省空間
                const exSummary = data.exercises.map(ex => {
                    return `${ex.name}(${ex.weight}kg)`;
                }).join(',');
                contextString += `${shortDate}:Str(${data.title}): ${exSummary}\n`;
            } else if (data.type === 'analysis') {
                contextString += `${shortDate}:Analysis:${data.title} (Score:${data.score})\n`;
            }
        });
    }

    // 4. 儲存統整後的 Context 到 Firestore
    // 這樣下次與 AI 對話時，只需讀取這個欄位，不用重新撈資料
    const aiContextRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
    await setDoc(aiContextRef, {
        content: contextString,
        lastUpdated: new Date().toISOString()
    });

    console.log("AI Context Updated Successfully (Token Optimized)");
    return contextString;

  } catch (error) {
    console.error("Failed to update AI context:", error);
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