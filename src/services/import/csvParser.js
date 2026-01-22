/**
 * CSV 檔案解析服務
 * 負責解析 CSV 檔案並轉換為標準化的訓練資料格式
 * 支援多種格式：Strava、通用跑步 CSV、自家匯出格式
 */

import { parseStravaCSV, parseGenericRunCSV } from './platformSync';
import { formatDate } from '../../utils/date';

/**
 * 解析 CSV 檔案
 * @param {File} file - CSV 檔案
 * @returns {Promise<Array>} 解析後的訓練資料陣列
 * @throws {Error} 當解析失敗時拋出錯誤
 */
export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const workouts = await processCSVContent(text);
        resolve(workouts);
      } catch (error) {
        // 如果 UTF-8 解析失敗，嘗試 Big5 編碼
        if (error.message.includes('編碼')) {
          const r2 = new FileReader();
          r2.onload = async (e2) => {
            try {
              const workouts = await processCSVContent(e2.target.result);
              resolve(workouts);
            } catch (err) {
              reject(err);
            }
          };
          r2.onerror = () => reject(new Error('檔案讀取失敗'));
          r2.readAsText(file, 'Big5');
        } else {
          reject(error);
        }
      }
    };

    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };

    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * 處理 CSV 內容
 * @param {string} text - CSV 文字內容
 * @returns {Promise<Array>} 訓練資料陣列
 */
const processCSVContent = async (text) => {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    throw new Error('檔案無內容或格式不正確');
  }

  // 先嘗試使用多平台解析器（Strava / 通用跑步 CSV）
  const stravaWorkouts = parseStravaCSV(text);
  const genericWorkouts = stravaWorkouts.length === 0 ? parseGenericRunCSV(text) : [];

  // 如果平台解析器有解析出資料，直接返回
  if (stravaWorkouts.length > 0 || genericWorkouts.length > 0) {
    return stravaWorkouts.length > 0 ? stravaWorkouts : genericWorkouts;
  }

  // 若非平台格式，使用原本的 CSV 解析邏輯（支援自家匯出）
  return parseCustomCSV(lines);
};

/**
 * 解析自定義 CSV 格式（自家匯出格式）
 * @param {Array<string>} lines - CSV 行陣列
 * @returns {Array} 訓練資料陣列
 */
const parseCustomCSV = (lines) => {
  const parseLine = (line) => {
    const res = [];
    let cur = '';
    let inQuote = false;
    for (let char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        res.push(cur);
        cur = '';
      } else {
        cur += char;
      }
    }
    res.push(cur);
    return res.map((s) => s.replace(/^"|"$/g, '').trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').trim());
  const isChinese = headers.includes('活動類型');
  const isEnglish = headers.includes('Activity Type');

  if (!isChinese && !isEnglish) {
    throw new Error('不支援的 CSV 格式，請確認檔案包含正確的標題列');
  }

  const idxMap = {};
  headers.forEach((h, i) => {
    idxMap[h] = i;
  });

  const getVal = (row, col) => row[idxMap[col]] || '';

  const cols = isChinese
    ? {
        type: '活動類型',
        date: '日期',
        title: '標題',
        dist: '距離',
        time: '時間',
        hr: '平均心率',
        pwr: '平均功率',
        cal: '卡路里',
        sets: '總組數',
        reps: '總次數',
      }
    : {
        type: 'Activity Type',
        date: 'Date',
        title: 'Title',
        dist: 'Distance',
        time: 'Time',
        hr: 'Avg HR',
        pwr: 'Avg Power',
        cal: 'Calories',
        sets: 'Total Sets',
        reps: 'Total Reps',
      };

  const workouts = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < headers.length) continue;

    const dateRaw = getVal(row, cols.date);
    let dateStr = '';
    const dateMatch = dateRaw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (dateMatch) {
      dateStr = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    } else {
      continue;
    }

    let type = 'strength';
    const tRaw = getVal(row, cols.type).toLowerCase();
    if (tRaw.includes('run') || tRaw.includes('跑') || tRaw.includes('walk')) {
      type = 'run';
    }

    const dataToSave = {
      date: dateStr,
      status: 'completed',
      type,
      title: getVal(row, cols.title) || (type === 'run' ? '跑步' : '重訓'),
      exercises: [],
      runDistance: type === 'run' ? getVal(row, cols.dist) : '',
      runDuration: type === 'run' ? getVal(row, cols.time) : '',
      runHeartRate: getVal(row, cols.hr),
      runPower: getVal(row, cols.pwr),
      calories: getVal(row, cols.cal),
      updatedAt: new Date().toISOString(),
    };

    workouts.push(dataToSave);
  }

  return workouts;
};

/**
 * 生成 CSV 資料（用於匯出）
 * @param {Array} workouts - 訓練資料陣列
 * @param {Array} gears - 裝備資料陣列（可選）
 * @returns {string} CSV 字串
 */
export const generateCSVData = (workouts, gears = []) => {
  const headers = [
    '活動類型',
    '日期',
    '標題',
    '距離',
    '時間',
    '平均心率',
    '平均功率',
    '卡路里',
    '總組數',
    '總次數',
  ];

  const rows = workouts.map((w) => {
    const type = w.type === 'run' ? '跑步' : '重訓';
    const totalSets = w.exercises?.reduce((sum, ex) => sum + (parseInt(ex.sets) || 0), 0) || 0;
    const totalReps = w.exercises?.reduce((sum, ex) => sum + (parseInt(ex.reps) || 0) * (parseInt(ex.sets) || 0), 0) || 0;

    return [
      type,
      w.date,
      w.title || '',
      w.runDistance || '',
      w.runDuration || '',
      w.runHeartRate || '',
      w.runPower || '',
      w.calories || '',
      totalSets.toString(),
      totalReps.toString(),
    ];
  });

  // 處理 CSV 轉義（包含逗號或引號的欄位需要加引號）
  const escapeCSV = (val) => {
    const str = String(val || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    '\uFEFF' + headers.map(escapeCSV).join(','), // BOM for Excel
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ];

  return csvLines.join('\n');
};
