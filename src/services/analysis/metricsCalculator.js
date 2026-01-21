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

  const ecc = parseFloat(metrics.eccentricTime?.value || 2);
  if (ecc < 1.0) s -= 20;
  else if (ecc < 1.5) s -= 10;

  const angle = parseFloat(
    mode === 'bench'
      ? metrics.elbowAngle?.value || 90
      : metrics.kneeAngle?.value || 90,
  );

  if (mode === 'bench') {
    if (angle > 90) s -= 20;
  } else {
    if (angle > 100) s -= 20;
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

  const cad = parseFloat(metrics.cadence?.value || 0);
  if (cad < 150) s -= 30;
  else if (cad < 160) s -= 20;
  else if (cad < 170) s -= 10;

  const hip = parseFloat(metrics.hipDrive?.value || 0);
  if (hip < 10) s -= 25;
  else if (hip < 20) s -= 15;

  const osc = parseFloat(metrics.vertOscillation?.value || 10);
  if (osc > 12) s -= 25;

  const ratio = parseFloat(metrics.vertRatio?.value || 8);
  if (ratio > 10) s -= 20;

  return Math.max(0, Math.round(s));
};

