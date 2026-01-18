/**
 * 心率計算工具函數
 * 統一心率相關計算邏輯，包括心率區間計算
 */

/**
 * 計算心率區間
 * @param {number} maxHR - 最大心率 (bpm)
 * @returns {Array} 心率區間陣列，每個項目包含 {label, range, color, bg}
 */
export const calculateHeartRateZones = (maxHR) => {
  if (!maxHR || maxHR <= 0) return [];
  
  return [
    { 
      label: 'Z1 恢復跑 (Recovery)', 
      range: `${Math.round(maxHR * 0.5)} - ${Math.round(maxHR * 0.6)}`, 
      color: 'text-gray-400', 
      bg: 'bg-gray-700/30' 
    },
    { 
      label: 'Z2 有氧耐力 (Aerobic)', 
      range: `${Math.round(maxHR * 0.6)} - ${Math.round(maxHR * 0.7)}`, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10' 
    },
    { 
      label: 'Z3 節奏跑 (Tempo)', 
      range: `${Math.round(maxHR * 0.7)} - ${Math.round(maxHR * 0.8)}`, 
      color: 'text-green-400', 
      bg: 'bg-green-500/10' 
    },
    { 
      label: 'Z4 乳酸閾值 (Threshold)', 
      range: `${Math.round(maxHR * 0.8)} - ${Math.round(maxHR * 0.9)}`, 
      color: 'text-orange-400', 
      bg: 'bg-orange-500/10' 
    },
    { 
      label: 'Z5 最大攝氧 (VO2 Max)', 
      range: `${Math.round(maxHR * 0.9)} - ${maxHR}`, 
      color: 'text-red-400', 
      bg: 'bg-red-500/10' 
    },
  ];
};

/**
 * 計算實際使用的最大心率（手動優先，否則用年齡估算）
 * @param {number|string} manualMaxHR - 手動輸入的最大心率
 * @param {number|string} age - 年齡
 * @returns {number} 最大心率
 */
export const calculateActiveMaxHR = (manualMaxHR, age) => {
  const manual = parseInt(manualMaxHR);
  if (manual && manual > 0) return manual;
  
  const ageValue = parseInt(age);
  if (ageValue && ageValue > 0) return 220 - ageValue;
  
  return 0;
};
