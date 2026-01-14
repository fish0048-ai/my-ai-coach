import { doc, getDoc, getDocs, collection, query, where, setDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 輔助：計算平均配速 (秒/公里 -> 分:秒)
const formatPace = (totalSeconds, totalDist) => {
    if (!totalDist || totalDist === 0) return "N/A";
    const avgPaceSec = totalSeconds / totalDist; // 秒/公里
    const mins = Math.floor(avgPaceSec / 60);
    const secs = Math.round(avgPaceSec % 60);
    return `${mins}'${String(secs).padStart(2, '0')}"`;
};

// 輔助：解析配速字串為總秒數 (例如 "5'30"" -> 330)
const parsePaceToSeconds = (paceStr) => {
    if (!paceStr) return 0;
    const match = paceStr.match(/(\d+)'(\d+)"/);
    if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
    }
    return 0;
};

// 核心函式：統整使用者資料並更新 AI Context
export const updateAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return "請先登入";

  try {
    // 1. 獲取個人檔案 (Profile)
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 獲取最近 7 天的訓練紀錄 (用於週摘要)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr7 = sevenDaysAgo.toISOString().split('T')[0];

    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const qSevenDays = query(
        calendarRef, 
        where('date', '>=', dateStr7),
        orderBy('date', 'desc')
    );
    const recentSnap = await getDocs(qSevenDays);

    // --- 計算週摘要 (Weekly Summary) ---
    let totalRunDist = 0;
    let totalRunTimeMin = 0;
    let runCount = 0;
    let strengthCount = 0;
    let muscleFocus = {}; // 統計部位 { 'chest': 2, 'legs': 1 }

    // 簡易列表 (僅日期與標題，給 AI 索引這週做了什麼)
    let briefLogList = [];

    recentSnap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'completed') return;

        const shortDate = data.date.slice(5); // "MM-DD"
        briefLogList.push(`${shortDate}: ${data.title}`);

        if (data.type === 'run') {
            runCount++;
            totalRunDist += parseFloat(data.runDistance || 0);
            totalRunTimeMin += parseFloat(data.runDuration || 0);
        } else if (data.type === 'strength') {
            strengthCount++;
            // 統計訓練部位
            if (Array.isArray(data.exercises)) {
                data.exercises.forEach(ex => {
                    if (ex.targetMuscle) {
                        // 簡單計數，出現一次算一次
                        muscleFocus[ex.targetMuscle] = (muscleFocus[ex.targetMuscle] || 0) + 1;
                    }
                });
            }
        }
    });

    // 計算平均配速
    const avgPace = totalRunDist > 0 ? formatPace(totalRunTimeMin * 60, totalRunDist) : "N/A";
    
    // 找出訓練重點 (前兩名)
    const sortedMuscles = Object.entries(muscleFocus)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(entry => entry[0]) // 取出部位名稱
        .join(' & ');

    // 3. 獲取最近的體態 (僅取最新一筆作為參考)
    const bodyLogsRef = collection(db, 'users', user.uid, 'body_logs');
    const qBody = query(bodyLogsRef, orderBy('date', 'desc'), limit(1));
    const bodySnap = await getDocs(qBody);
    let latestBody = "";
    if (!bodySnap.empty) {
        const b = bodySnap.docs[0].data();
        latestBody = `${b.weight}kg / ${b.bodyFat || '?'}% (${b.date})`;
    }

    // --- 組合精簡版 Prompt ---
    let contextString = `[基本資料]\n`;
    contextString += `體態: ${latestBody || '無紀錄'}\n`;
    if (profile.goal) contextString += `目標: ${profile.goal}\n`;
    
    contextString += `\n[過去7天訓練摘要]\n`;
    if (runCount > 0) {
        contextString += `- 跑步: 共${runCount}次, 里程${totalRunDist.toFixed(1)}km, 均速${avgPace}\n`;
    }
    if (strengthCount > 0) {
        contextString += `- 重訓: 共${strengthCount}次` + (sortedMuscles ? `, 重點部位: ${sortedMuscles}` : '') + `\n`;
    }
    if (runCount === 0 && strengthCount === 0) {
        contextString += `- (本週尚無訓練紀錄)\n`;
    }

    contextString += `\n[近期活動清單 (若需細節請詢問)]\n`;
    contextString += briefLogList.slice(0, 5).join('\n') || "無";

    // 4. 儲存
    const aiContextRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
    await setDoc(aiContextRef, {
        content: contextString,
        lastUpdated: new Date().toISOString()
    });

    console.log("AI Context Optimized (Weekly Summary)");
    return contextString;

  } catch (error) {
    console.error("Failed to update AI context:", error);
    throw error;
  }
};

// 輔助函式：取得目前的 Context
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