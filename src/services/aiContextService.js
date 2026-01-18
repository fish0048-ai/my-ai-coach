import { doc, getDoc, getDocs, collection, query, where, setDoc, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

// 核心函式：統整使用者資料並更新 AI Context
export const updateAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. 獲取個人檔案
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 獲取最近 7 天訓練
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr7 = sevenDaysAgo.toISOString().split('T')[0];

    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const qCalendar = query(
      calendarRef,
      where('date', '>=', dateStr7),
      orderBy('date', 'desc')
    );
    const calendarSnap = await getDocs(qCalendar);

    let runCount = 0;
    let strengthCount = 0;
    let briefLogList = [];

    calendarSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'completed') {
        const shortDate = data.date.slice(5);
        briefLogList.push(`${shortDate}: ${data.title}`);
        if (data.type === 'run') runCount++;
        else if (data.type === 'strength') strengthCount++;
      }
    });

    // 3. 獲取最近飲食紀錄
    const foodLogsRef = collection(db, 'users', user.uid, 'food_logs');
    const qFood = query(foodLogsRef, orderBy('createdAt', 'desc'), limit(5));
    const foodSnap = await getDocs(qFood);
    let recentFoods = [];
    foodSnap.forEach((docSnap) => recentFoods.push(docSnap.data().name));

    // --- 組合 Prompt ---
    let contextString = `[基本資料] TDEE:${profile.tdee || 2000}, 目標:${profile.goal || '健康'}\n`;
    contextString += `[近7天訓練] 跑:${runCount}, 重訓:${strengthCount}\n`;
    if (recentFoods.length > 0) contextString += `[近期飲食] ${recentFoods.join(', ')}\n`;

    // 4. 儲存
    const aiContextRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
    await setDoc(aiContextRef, {
      content: contextString,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Failed to update AI context:", error);
  }
};

// 讀取 Context
export const getAIContext = async () => {
  const user = auth.currentUser;
  if (!user) return "";
  try {
    const docRef = doc(db, 'users', user.uid, 'ai_context', 'summary');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().content : "";
  } catch (error) {
    return "";
  }
};
