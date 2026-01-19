/**
 * 訓練計算工具函數
 * 統一的訓練相關計算邏輯，包括配速、容量等
 */

/**
 * 解析配速字串為小數分鐘
 * 例如 "5'30"" -> 5.5
 * @param {string} paceStr - 配速字串 (格式: "5'30"")
 * @returns {number} 配速（分鐘/公里）
 */
export const parsePaceToDecimal = (paceStr) => {
  if (!paceStr) return 0;
  const match = paceStr.match(/(\d+)'(\d+)"/);
  if (match) {
    return parseInt(match[1]) + parseInt(match[2]) / 60;
  }
  return 0;
};

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
