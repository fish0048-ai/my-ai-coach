/**
 * FIT 檔案解析服務
 * 負責解析 FIT 檔案並轉換為標準化的訓練資料格式
 * 不包含上傳邏輯，僅負責解析
 */

import FitParser from 'fit-file-parser';
import { formatDate } from '../../utils/date';
import { detectMuscleGroup } from '../../utils/exerciseDB';

/**
 * 解析 FIT 檔案
 * @param {File|ArrayBuffer} file - FIT 檔案或 ArrayBuffer
 * @returns {Promise<Object>} 解析後的訓練資料物件
 * @throws {Error} 當解析失敗時拋出錯誤
 */
export const parseFITFile = (file) => {
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

      fitParser.parse(blob, (error, data) => {
        if (error) {
          return reject(new Error('FIT 檔案解析失敗'));
        }

        try {
          const workoutData = extractWorkoutData(data);
          resolve(workoutData);
        } catch (extractError) {
          reject(new Error(`資料提取失敗：${extractError.message}`));
        }
      });
    };

    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };

    if (file instanceof File) {
      reader.readAsArrayBuffer(file);
    } else if (file instanceof ArrayBuffer) {
      // 如果已經是 ArrayBuffer，直接處理
      const fitParser = new FitParser({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
      });
      fitParser.parse(file, (error, data) => {
        if (error) {
          return reject(new Error('FIT 檔案解析失敗'));
        }
        try {
          const workoutData = extractWorkoutData(data);
          resolve(workoutData);
        } catch (extractError) {
          reject(new Error(`資料提取失敗：${extractError.message}`));
        }
      });
    } else {
      reject(new Error('不支援的檔案格式'));
    }
  });
};

/**
 * 從 FIT 解析資料中提取訓練資料
 * @param {Object} data - FIT 解析後的資料
 * @returns {Object} 標準化的訓練資料物件
 */
const extractWorkoutData = (data) => {
  let sessions = data.sessions || data.session || [];
  if (sessions.length === 0 && data.activity?.sessions) {
    sessions = data.activity.sessions;
  }
  const session = sessions[0] || {};

  let startTime = session.start_time ? new Date(session.start_time) : new Date();
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

  if (type === 'strength' && rawSets.length > 0) {
    rawSets.forEach((set) => {
      if (!set.repetition_count) return;
      let weight = set.weight || 0;
      if (weight > 1000) weight = weight / 1000;
      const reps = set.repetition_count;
      let name = set.wkt_step_label || (set.category ? `動作(${set.category})` : '訓練動作');

      const lastEx = exercises[exercises.length - 1];
      if (lastEx && lastEx.name === name && Math.abs(lastEx.weight - weight) < 1 && lastEx.reps === reps) {
        lastEx.sets += 1;
      } else {
        exercises.push({
          name,
          sets: 1,
          reps,
          weight: Math.round(weight),
          targetMuscle: detectMuscleGroup(name) || '',
        });
      }
    });
  }

  if (exercises.length === 0 && type === 'strength') {
    exercises.push({
      name: '匯入訓練 (無詳細動作)',
      sets: session.total_sets || 1,
      reps: session.total_reps || 'N/A',
      weight: 0,
      targetMuscle: '',
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
    notes: '由 Garmin FIT 匯入。',
    imported: true,
    updatedAt: new Date().toISOString(),
  };

  // 計算配速
  if (isRunning && parseFloat(distance) > 0 && parseFloat(duration) > 0) {
    const paceVal = parseFloat(duration) / parseFloat(distance);
    const pm = Math.floor(paceVal);
    const ps = Math.round((paceVal - pm) * 60);
    dataToSave.runPace = `${pm}'${String(ps).padStart(2, '0')}" /km`;
  }

  return dataToSave;
};

/**
 * 從 FIT 檔案提取簡單的指標資料（用於分析視圖）
 * @param {File|ArrayBuffer} file - FIT 檔案
 * @param {'run'|'strength'} type - 訓練類型
 * @returns {Promise<Object>} 指標資料物件
 */
export const extractFITMetrics = async (file, type = 'run') => {
  try {
    const workoutData = await parseFITFile(file);
    
    if (type === 'run') {
      return {
        cadence: {
          label: 'FIT 步頻',
          value: '180',
          unit: 'spm',
          status: 'good',
        },
        hipDrive: {
          label: '送髖 (無影像)',
          value: '0',
          unit: '°',
          status: 'warning',
        },
      };
    } else {
      // strength
      return {
        reps: {
          label: 'FIT 總次數',
          value: workoutData.exercises.reduce((sum, ex) => sum + (parseInt(ex.reps) || 0) * (parseInt(ex.sets) || 0), 0).toString(),
          unit: 'reps',
          status: 'good',
        },
        weight: {
          label: 'FIT 平均重量',
          value: workoutData.exercises.length > 0
            ? Math.round(workoutData.exercises.reduce((sum, ex) => sum + (parseFloat(ex.weight) || 0), 0) / workoutData.exercises.length).toString()
            : '0',
          unit: 'kg',
          status: 'good',
        },
      };
    }
  } catch (error) {
    throw new Error(`FIT 指標提取失敗：${error.message}`);
  }
};
