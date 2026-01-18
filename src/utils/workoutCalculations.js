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
