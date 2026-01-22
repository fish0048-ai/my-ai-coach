/**
 * 動作分析相關的評分計算函數
 * 將 Strength / Run 分數邏輯集中管理，方便後續調整與重用。
 */

/**
 * 計算重訓動作分數
 * @param {Object} metrics - 動作指標物件
 * @param {'bench'|'squat'} mode - 動作模式
 * @returns {number} 分數 (0-100)
 */
export const calculateStrengthScore = (metrics, mode) => {
  if (!metrics) return 0;
  let s = 100;

  // 離心時間評分
  const ecc = parseFloat(metrics.eccentricTime?.value || 2);
  if (ecc < 1.0) s -= 20;
  else if (ecc < 1.5) s -= 10;

  // 關節角度評分
  const angle = parseFloat(
    mode === 'bench'
      ? metrics.elbowAngle?.value || 90
      : metrics.kneeAngle?.value || 90,
  );

  if (mode === 'bench') {
    // 臥推：手肘角度應該在 75-90 度之間
    if (angle > 90) s -= 20;
    else if (angle < 75) s -= 15;
  } else {
    // 深蹲：膝蓋角度應該在 80-100 度之間
    if (angle > 100) s -= 20;
    else if (angle < 80) s -= 15;
  }

  // 軌跡偏移評分（僅臥推）
  if (mode === 'bench' && metrics.barPath) {
    const barPath = parseFloat(metrics.barPath.value || 0);
    if (barPath > 3) s -= 15;
    else if (barPath > 2) s -= 10;
  }

  // 核心穩定度評分
  if (metrics.stability) {
    const stability = parseFloat(metrics.stability.value || 100);
    if (stability < 80) s -= 10;
    else if (stability < 90) s -= 5;
  }

  return Math.max(0, Math.round(s));
};

/**
 * 計算跑姿分數
 * @param {Object} metrics - 跑姿指標物件
 * @returns {number} 分數 (0-100)
 */
export const calculateRunScore = (metrics) => {
  if (!metrics) return 0;
  let s = 100;

  // 步頻評分（理想：170-180 spm）
  const cad = parseFloat(metrics.cadence?.value || 0);
  if (cad < 150) s -= 30;
  else if (cad < 160) s -= 20;
  else if (cad < 170) s -= 10;
  else if (cad >= 180) s -= 5; // 過高也可能有問題

  // 送髖角度評分（理想：20-60°）
  const hip = parseFloat(metrics.hipDrive?.value || 0);
  if (hip < 10) s -= 25;
  else if (hip < 20) s -= 15;
  else if (hip > 60) s -= 10; // 過度送髖

  // 垂直振幅評分（理想：< 12cm）
  const osc = parseFloat(metrics.vertOscillation?.value || 10);
  if (osc > 12) s -= 25;
  else if (osc > 10) s -= 15;

  // 垂直比例評分（理想：< 10%）
  const ratio = parseFloat(metrics.vertRatio?.value || 8);
  if (ratio > 10) s -= 20;
  else if (ratio > 8) s -= 10;

  return Math.max(0, Math.round(s));
};

/**
 * 計算動作評分（通用函數）
 * @param {Object} metrics - 動作指標物件
 * @param {'strength'|'run'} type - 動作類型
 * @param {'bench'|'squat'} [mode] - 重訓模式（僅 strength 需要）
 * @returns {number} 分數 (0-100)
 */
export const calculateFormScore = (metrics, type, mode = null) => {
  if (!metrics || !type) return 0;

  if (type === 'strength') {
    if (!mode) return 0;
    return calculateStrengthScore(metrics, mode);
  } else if (type === 'run') {
    return calculateRunScore(metrics);
  }

  return 0;
};

