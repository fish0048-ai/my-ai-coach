/**
 * 營養計算工具函數
 * 統一的營養相關計算邏輯，包括 TDEE、BMR、目標卡路里等
 */

/**
 * 計算基礎代謝率 (BMR)
 * @param {number} weight - 體重 (kg)
 * @param {number} height - 身高 (cm)
 * @param {number} age - 年齡
 * @param {string} gender - 性別 ('male' | 'female')
 * @returns {number} BMR 值
 */
export const calculateBMR = (weight, height, age, gender) => {
  const w = parseFloat(weight) || 0;
  const h = parseFloat(height) || 0;
  const a = parseFloat(age) || 0;

  if (!w || !h || !a) return 0;

  if (gender === 'male') {
    return (10 * w) + (6.25 * h) - (5 * a) + 5;
  } else {
    return (10 * w) + (6.25 * h) - (5 * a) - 161;
  }
};

/**
 * 計算總每日能量消耗 (TDEE)
 * @param {Object} params - 參數物件
 * @param {number} params.weight - 體重 (kg)
 * @param {number} params.height - 身高 (cm)
 * @param {number} params.age - 年齡
 * @param {string} params.gender - 性別 ('male' | 'female')
 * @param {number} params.activity - 活動係數 (1.2-1.9)
 * @param {number} params.manualBmr - 手動輸入的 BMR (可選，優先使用)
 * @returns {number} TDEE 值
 */
export const calculateTDEE = ({ weight, height, age, gender, activity, manualBmr }) => {
  const act = parseFloat(activity) || 0;
  
  if (!act) return 0;

  // 如果提供了手動 BMR，優先使用
  const manualBmrValue = parseFloat(manualBmr);
  if (manualBmrValue && manualBmrValue > 0) {
    return Math.round(manualBmrValue * act);
  }

  // 否則計算 BMR
  const bmr = calculateBMR(weight, height, age, gender);
  if (!bmr) return 0;

  return Math.round(bmr * act);
};

/**
 * 根據目標計算目標卡路里
 * @param {number} tdee - TDEE 值
 * @param {string} goal - 目標 ('增肌' | '減脂' | '維持')
 * @returns {number} 目標卡路里
 */
export const getTargetCalories = (tdee, goal) => {
  if (!tdee) return 0;
  
  switch (goal) {
    case '增肌': return tdee + 300;
    case '減脂': return tdee - 400;
    default: return tdee;
  }
};
