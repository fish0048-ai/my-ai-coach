/**
 * 資料備份與恢復服務
 * 提供一鍵匯出所有資料和資料恢復功能
 */

import { collection, getDocs, query, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { formatDate } from '../utils/date';
import { handleError } from './errorService';

const getCurrentUser = () => {
  return auth.currentUser;
};

// 以 localStorage 紀錄最後備份時間與摘要資訊
const LAST_BACKUP_KEY_PREFIX = 'my_ai_coach_last_backup_';

/**
 * 讀取當前使用者的最後備份資訊
 * @param {string} userId
 * @returns {{date:string|null, timestamp:number|null, stats?:Object}|null}
 */
export const getLastBackupInfo = (userId) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${LAST_BACKUP_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * 儲存最後備份資訊到 localStorage（僅在瀏覽器端呼叫）
 * @param {string} userId
 * @param {Object} payload
 */
const setLastBackupInfo = (userId, payload) => {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${LAST_BACKUP_KEY_PREFIX}${userId}`,
      JSON.stringify(payload)
    );
  } catch {
    // 忽略本地儲存錯誤，不影響主流程
  }
};

/**
 * 匯出所有用戶資料
 * @returns {Promise<Object>} 完整的用戶資料物件
 */
export const exportAllUserData = async () => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');

  try {
    // 1. 用戶 Profile
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? profileSnap.data() : {};

    // 2. 訓練記錄 (Calendar)
    const calendarRef = collection(db, 'users', user.uid, 'calendar');
    const calendarSnap = await getDocs(query(calendarRef));
    const calendar = calendarSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. 身體數據記錄
    const bodyLogsRef = collection(db, 'users', user.uid, 'body_logs');
    const bodyLogsSnap = await getDocs(query(bodyLogsRef));
    const bodyLogs = bodyLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 4. 營養記錄
    const foodLogsRef = collection(db, 'users', user.uid, 'food_logs');
    const foodLogsSnap = await getDocs(query(foodLogsRef));
    const foodLogs = foodLogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 5. 裝備記錄
    const gearsRef = collection(db, 'users', user.uid, 'gears');
    const gearsSnap = await getDocs(query(gearsRef));
    const gears = gearsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 6. 成就記錄
    const achievementsRef = collection(db, 'users', user.uid, 'achievements');
    const achievementsSnap = await getDocs(query(achievementsRef));
    const achievements = achievementsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userId: user.uid,
      userEmail: user.email,
      data: {
        profile,
        calendar,
        bodyLogs,
        foodLogs,
        gears,
        achievements
      },
      stats: {
        calendarCount: calendar.length,
        bodyLogsCount: bodyLogs.length,
        foodLogsCount: foodLogs.length,
        gearsCount: gears.length,
        achievementsCount: achievements.length
      }
    };

    return backupData;
  } catch (error) {
    console.error('匯出資料失敗:', error);
    handleError(error, { context: 'backupService', operation: 'exportAllUserData' });
    throw error;
  }
};

/**
 * 下載備份檔案
 * @returns {Promise<void>}
 */
export const downloadBackup = async () => {
  try {
    const backupData = await exportAllUserData();
    const user = getCurrentUser();

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my_ai_coach_backup_${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 成功下載後，更新本地最後備份時間
    if (user) {
      setLastBackupInfo(user.uid, {
        date: formatDate(new Date()),
        timestamp: Date.now(),
        stats: backupData.stats || {}
      });
    }
  } catch (error) {
    handleError(error, { context: 'backupService', operation: 'downloadBackup' });
    throw error;
  }
};

/**
 * 驗證備份檔案格式
 * @param {Object} backupData - 備份資料
 * @returns {Object} 驗證結果 {valid, errors}
 */
export const validateBackupData = (backupData) => {
  const errors = [];

  if (!backupData) {
    errors.push('備份資料為空');
    return { valid: false, errors };
  }

  if (!backupData.version) {
    errors.push('缺少版本資訊');
  }

  if (!backupData.data) {
    errors.push('缺少資料區塊');
  } else {
    const { data } = backupData;
    if (!data.profile) errors.push('缺少用戶資料');
    if (!Array.isArray(data.calendar)) errors.push('訓練記錄格式錯誤');
    if (!Array.isArray(data.bodyLogs)) errors.push('身體數據格式錯誤');
    if (!Array.isArray(data.foodLogs)) errors.push('營養記錄格式錯誤');
    if (!Array.isArray(data.gears)) errors.push('裝備記錄格式錯誤');
    if (!Array.isArray(data.achievements)) errors.push('成就記錄格式錯誤');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * 恢復資料（從備份檔案）
 * @param {Object} backupData - 備份資料
 * @param {Object} options - 選項 {overwrite: boolean, collections: string[]}
 * @returns {Promise<Object>} 恢復結果 {success, restored, errors}
 */
export const restoreFromBackup = async (backupData, options = {}) => {
  const user = getCurrentUser();
  if (!user) throw new Error('請先登入');

  const { overwrite = false, collections = ['all'] } = options;
  const restored = {};
  const errors = [];

  try {
    // 驗證備份資料
    const validation = validateBackupData(backupData);
    if (!validation.valid) {
      throw new Error(`備份資料格式錯誤: ${validation.errors.join(', ')}`);
    }

    const { data } = backupData;

    // 恢復 Profile
    if (collections.includes('all') || collections.includes('profile')) {
      try {
        if (data.profile) {
          const profileRef = doc(db, 'users', user.uid);
          await setDoc(profileRef, data.profile, { merge: !overwrite });
          restored.profile = true;
        }
      } catch (error) {
        errors.push(`恢復用戶資料失敗: ${error.message}`);
      }
    }

    // 恢復訓練記錄
    if (collections.includes('all') || collections.includes('calendar')) {
      try {
        if (Array.isArray(data.calendar) && data.calendar.length > 0) {
          // 注意：大量資料恢復需要批次處理，這裡簡化處理
          // 實際應用中應該使用批次寫入
          const calendarRef = collection(db, 'users', user.uid, 'calendar');
          let restoredCount = 0;
          for (const item of data.calendar) {
            try {
              const { id, ...itemData } = item;
              const docRef = doc(calendarRef, id);
              await setDoc(docRef, itemData, { merge: !overwrite });
              restoredCount++;
            } catch (error) {
              console.error(`恢復訓練記錄 ${id} 失敗:`, error);
            }
          }
          restored.calendar = restoredCount;
        }
      } catch (error) {
        errors.push(`恢復訓練記錄失敗: ${error.message}`);
      }
    }

    // 恢復身體數據
    if (collections.includes('all') || collections.includes('bodyLogs')) {
      try {
        if (Array.isArray(data.bodyLogs) && data.bodyLogs.length > 0) {
          const bodyLogsRef = collection(db, 'users', user.uid, 'body_logs');
          let restoredCount = 0;
          for (const item of data.bodyLogs) {
            try {
              const { id, ...itemData } = item;
              const docRef = doc(bodyLogsRef, id);
              await setDoc(docRef, itemData, { merge: !overwrite });
              restoredCount++;
            } catch (error) {
              console.error(`恢復身體數據 ${id} 失敗:`, error);
            }
          }
          restored.bodyLogs = restoredCount;
        }
      } catch (error) {
        errors.push(`恢復身體數據失敗: ${error.message}`);
      }
    }

    // 恢復營養記錄
    if (collections.includes('all') || collections.includes('foodLogs')) {
      try {
        if (Array.isArray(data.foodLogs) && data.foodLogs.length > 0) {
          const foodLogsRef = collection(db, 'users', user.uid, 'food_logs');
          let restoredCount = 0;
          for (const item of data.foodLogs) {
            try {
              const { id, ...itemData } = item;
              const docRef = doc(foodLogsRef, id);
              await setDoc(docRef, itemData, { merge: !overwrite });
              restoredCount++;
            } catch (error) {
              console.error(`恢復營養記錄 ${id} 失敗:`, error);
            }
          }
          restored.foodLogs = restoredCount;
        }
      } catch (error) {
        errors.push(`恢復營養記錄失敗: ${error.message}`);
      }
    }

    // 恢復裝備記錄
    if (collections.includes('all') || collections.includes('gears')) {
      try {
        if (Array.isArray(data.gears) && data.gears.length > 0) {
          const gearsRef = collection(db, 'users', user.uid, 'gears');
          let restoredCount = 0;
          for (const item of data.gears) {
            try {
              const { id, ...itemData } = item;
              const docRef = doc(gearsRef, id);
              await setDoc(docRef, itemData, { merge: !overwrite });
              restoredCount++;
            } catch (error) {
              console.error(`恢復裝備記錄 ${id} 失敗:`, error);
            }
          }
          restored.gears = restoredCount;
        }
      } catch (error) {
        errors.push(`恢復裝備記錄失敗: ${error.message}`);
      }
    }

    // 恢復成就記錄
    if (collections.includes('all') || collections.includes('achievements')) {
      try {
        if (Array.isArray(data.achievements) && data.achievements.length > 0) {
          const achievementsRef = collection(db, 'users', user.uid, 'achievements');
          let restoredCount = 0;
          for (const item of data.achievements) {
            try {
              const { id, ...itemData } = item;
              const docRef = doc(achievementsRef, id);
              await setDoc(docRef, itemData, { merge: !overwrite });
              restoredCount++;
            } catch (error) {
              console.error(`恢復成就記錄 ${id} 失敗:`, error);
            }
          }
          restored.achievements = restoredCount;
        }
      } catch (error) {
        errors.push(`恢復成就記錄失敗: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      restored,
      errors
    };
  } catch (error) {
    handleError(error, { context: 'backupService', operation: 'restoreFromBackup' });
    throw error;
  }
};

/**
 * 讀取備份檔案
 * @param {File} file - 備份檔案
 * @returns {Promise<Object>} 備份資料
 */
export const readBackupFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('無法解析備份檔案，請確認檔案格式正確'));
      }
    };
    reader.onerror = () => reject(new Error('讀取檔案失敗'));
    reader.readAsText(file);
  });
};

/**
 * 計算是否需要顯示備份提醒
 * @param {string} userId
 * @param {number} thresholdDays - 間隔天數門檻，預設 30 天
 * @returns {{shouldRemind:boolean, daysSince:number|null, lastDate:string|null, message:string}}
 */
export const getBackupReminder = (userId, thresholdDays = 30) => {
  if (!userId || typeof window === 'undefined') {
    return { shouldRemind: false, daysSince: null, lastDate: null, message: '' };
  }

  const info = getLastBackupInfo(userId);
  if (!info || !info.timestamp) {
    return {
      shouldRemind: true,
      daysSince: null,
      lastDate: null,
      message: '建議先備份一次資料，以防止訓練紀錄與設定遺失。'
    };
  }

  const diffMs = Date.now() - info.timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= thresholdDays) {
    return {
      shouldRemind: true,
      daysSince: diffDays,
      lastDate: info.date || null,
      message: `距離上次備份已超過 ${diffDays} 天，建議立即下載備份檔案。`
    };
  }

  return {
    shouldRemind: false,
    daysSince: diffDays,
    lastDate: info.date || null,
    message: ''
  };
};
