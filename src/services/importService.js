import { collection, addDoc, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { updateAIContext } from '../utils/contextManager';
import { parseFITFile } from './import/fitParser';
import { parseCSVFile } from './import/csvParser';

// 輔助：取得目前所有資料以便比對 (防重複)
const fetchCurrentWorkoutsForCheck = async (uid) => {
  const q = query(collection(db, 'users', uid, 'calendar'));
  const sn = await getDocs(q);
  const res = [];
  sn.forEach((d) => res.push({ id: d.id, ...d.data() }));
  return res;
};

// --- FIT 檔案處理 ---
/**
 * 解析並上傳 FIT 檔案
 * @param {File} file - FIT 檔案
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const parseAndUploadFIT = async (file) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('請先登入');
    }

    // 使用新的解析服務
    const dataToSave = await parseFITFile(file);

    // 上傳到 Firebase
    await addDoc(collection(db, 'users', user.uid, 'calendar'), dataToSave);
    await updateAIContext();

    return {
      success: true,
      message: `FIT 匯入成功！日期：${dataToSave.date}`,
    };
  } catch (error) {
    throw new Error(error.message || 'FIT 匯入失敗');
  }
};

// --- CSV 檔案處理 ---
/**
 * 解析並上傳 CSV 檔案
 * @param {File} file - CSV 檔案
 * @returns {Promise<Object>} { success: boolean, message: string }
 */
export const parseAndUploadCSV = async (file) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('請先登入');
    }

    // 使用新的解析服務
    const workouts = await parseCSVFile(file);

    if (workouts.length === 0) {
      return { success: false, message: '未找到可匯入的資料' };
    }

    // 檢查現有資料以避免重複
    const currentData = await fetchCurrentWorkoutsForCheck(user.uid);
    let importCount = 0;
    let updateCount = 0;

    for (const workout of workouts) {
      const existingDoc = currentData.find(
        (d) => d.date === workout.date && d.type === workout.type && d.title === workout.title
      );
      try {
        if (existingDoc) {
          await updateDoc(doc(db, 'users', user.uid, 'calendar', existingDoc.id), workout);
          updateCount++;
        } else {
          await addDoc(collection(db, 'users', user.uid, 'calendar'), workout);
          importCount++;
        }
      } catch (e) {
        // 單筆錯誤略過，繼續處理其他紀錄
        console.error('匯入單筆資料失敗:', e);
      }
    }

    await updateAIContext();
    return {
      success: true,
      message: `匯入完成！新增：${importCount}, 更新：${updateCount}`,
    };
  } catch (error) {
    throw new Error(error.message || 'CSV 匯入失敗');
  }
};
