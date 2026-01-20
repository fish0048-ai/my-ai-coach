import { parsePaceToDecimal as parsePaceToDecimalFromNumber } from './number';

/**
 * 訓練計算工具函數
 * 統一的訓練相關計算邏輯，包括配速、容量等
 *
 * 注意：
 * - `parsePaceToDecimal` 的實作統一由 `utils/number.js` 提供，
 *   這裡僅作為轉出口，避免重複定義。
 */

/**
 * 解析配速字串為小數分鐘
 * 例如 "5'30"" -> 5.5
 * @param {string} paceStr - 配速字串 (格式: "5'30"")
 * @returns {number} 配速（分鐘/公里）
 *
 * 實際邏輯由 `utils/number.js` 提供，這裡僅作為轉出口。
 */
export const parsePaceToDecimal = parsePaceToDecimalFromNumber;

/**
 * 計算重訓容量 (Volume Load)
 * Volume = 重量 × 組數 × 次數 (總和)
 * @param {Array} exercises - 訓練項目陣列
 * @returns {number} 總容量
 */
export const calculateVolume = (exercises) => {
  if (!Array.isArray(exercises)) return 0;
  return exercises.reduce((total, ex) => {
    const weight = parseFloat(ex.weight) || 0;
    const sets = parseFloat(ex.sets) || 0;
    const reps = parseFloat(ex.reps) || 0;
    return total + (weight * sets * reps);
  }, 0);
};

/**
 * 計算訓練負荷 (Training Load)
 * Training Load = RPE × 時間(分鐘)
 * 這是一個簡單的內部負荷指標，反映訓練對身體的實際壓力
 * @param {number} rpe - 自覺強度 (Rate of Perceived Exertion, 1-10)
 * @param {number} durationMinutes - 訓練時間（分鐘）
 * @returns {number} 訓練負荷值
 */
export const calculateTrainingLoad = (rpe, durationMinutes) => {
  const rpeValue = parseFloat(rpe) || 0;
  const duration = parseFloat(durationMinutes) || 0;
  
  // RPE 必須在 1-10 範圍內
  if (rpeValue < 1 || rpeValue > 10) return 0;
  if (duration <= 0) return 0;
  
  return Math.round(rpeValue * duration);
};

/**
 * 計算進階訓練壓力分數 (TSS - Training Stress Score)
 * TSS = (訓練時間 / FTP時間) × IF² × 100
 * 這裡簡化為基於 RPE 的估算：TSS ≈ (RPE/10)² × 訓練時間(小時) × 100
 * @param {number} rpe - 自覺強度 (1-10)
 * @param {number} durationMinutes - 訓練時間（分鐘）
 * @returns {number} TSS 分數
 */
export const calculateTSS = (rpe, durationMinutes) => {
  const rpeValue = parseFloat(rpe) || 0;
  const duration = parseFloat(durationMinutes) || 0;
  
  if (rpeValue < 1 || rpeValue > 10) return 0;
  if (duration <= 0) return 0;
  
  const intensityFactor = rpeValue / 10; // 強度因子 (0.1 - 1.0)
  const durationHours = duration / 60; // 轉換為小時
  const tss = Math.pow(intensityFactor, 2) * durationHours * 100;
  
  return Math.round(tss);
};

/**
 * 將時間字串轉為秒數
 * 支援格式：HH:MM:SS 或 MM:SS
 * @param {string} timeStr
 * @returns {number} 秒數
 */
export const parseTimeToSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  return 0;
};

/**
 * 將秒數轉為 mm:ss 或 hh:mm:ss 字串
 * @param {number} totalSeconds
 * @returns {string}
 */
export const formatSecondsToTime = (totalSeconds) => {
  const sec = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * 通用比賽配速策略（Negative Split）
 * @param {Object} params
 * @param {number} params.distanceKm - 比賽距離（公里），例如 10, 21.1, 42.2
 * @param {string} params.targetTime - 目標完賽時間，例如 "1:59:00"
 * @param {'flat'|'hilly'} params.courseType - 賽道類型：平路(flat) / 起伏(hilly)
 * @returns {Object|null} 策略物件，包含分段配速與補給時間建議
 */
export const generateRaceStrategy = ({ distanceKm, targetTime, courseType = 'flat' }) => {
  const raceDistance = parseFloat(distanceKm) || 0;
  const totalSeconds = parseTimeToSeconds(targetTime);
  if (!raceDistance || raceDistance <= 0 || !totalSeconds || totalSeconds <= 0) {
    return null;
  }

  // 基本平均配速（秒/公里）
  const basePacePerKm = totalSeconds / raceDistance;

  // 根據賽道類型調整前後段比例（平路稍微後半加速，起伏則前後更保守）
  const negativeSplitFactor = courseType === 'hilly' ? 0.03 : 0.05; // 後半段快 3–5%

  // 前後段切分：前半程 vs 後半程（四捨五入至整數公里，避免過度複雜）
  const firstPartKm = Math.round(raceDistance / 2);
  const secondPartKm = raceDistance - firstPartKm;

  const firstPacePerKm = basePacePerKm * (1 + negativeSplitFactor / 2); // 前段略慢
  const secondPacePerKm = basePacePerKm * (1 - negativeSplitFactor / 2); // 後段略快

  const firstPartTime = firstPacePerKm * firstPartKm;
  const secondPartTime = totalSeconds - firstPartTime; // 確保總時間一致

  // 補給策略：每 45 分鐘一包能量膠（10K 比較短時，可能沒有補給點）
  const gelIntervalSec = 45 * 60;
  const gelPoints = [];
  for (let t = gelIntervalSec; t < totalSeconds; t += gelIntervalSec) {
    const progress = t / totalSeconds;
    const approxKm = raceDistance * progress;
    gelPoints.push({
      time: formatSecondsToTime(t),
      approxKm: Math.round(approxKm * 10) / 10,
    });
  }

  return {
    distanceKm: raceDistance,
    targetTime: formatSecondsToTime(totalSeconds),
    averagePacePerKm: formatSecondsToTime(basePacePerKm),
    segments: [
      {
        label: '前段',
        startKm: 0,
        endKm: firstPartKm,
        pacePerKm: formatSecondsToTime(firstPacePerKm),
        segmentTime: formatSecondsToTime(firstPartTime),
        description: courseType === 'hilly'
          ? '保守起跑，專注穩定呼吸與放鬆步伐'
          : '稍微保守起跑，讓身體進入狀態',
      },
      {
        label: '後段',
        startKm: firstPartKm,
        endKm: raceDistance,
        pacePerKm: formatSecondsToTime(secondPacePerKm),
        segmentTime: formatSecondsToTime(secondPartTime),
        description: courseType === 'hilly'
          ? '視當天狀況微調配速，在下坡與平路穩定推進'
          : '逐步提速，最後幾公里若還有餘力可再加速',
      },
    ],
    gels: gelPoints,
  };
};

/**
 * 向下相容：半馬比賽配速策略
 * @param {Object} params
 * @param {string} params.targetTime
 * @param {'flat'|'hilly'} params.courseType
 */
export const generateHalfMarathonStrategy = ({ targetTime, courseType = 'flat' }) => {
  return generateRaceStrategy({ distanceKm: 21.1, targetTime, courseType });
};
