/**
 * Pose / 姿態相關的純計算函數
 * 將關節角度與跑姿掃描邏輯抽離成可重用的工具。
 */

/**
 * 計算三點關節角度（共用於重訓與跑步）
 * @param {Object} a
 * @param {Object} b
 * @param {Object} c
 * @returns {number} 角度（度數）
 */
export const computeJointAngle = (a, b, c) => {
  if (!a || !b || !c) return 0;
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) -
    Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
};

/**
 * 計算跑步時送髖（前擺）角度
 * 使用肩、髖、膝的相對位置判斷是否為前擺腿，並估算實際髖伸展角度。
 * @param {Array} landmarks - MediaPipe poseLandmarks 陣列
 * @returns {number} 髖伸展角度
 */
export const calculateRealHipExtension = (landmarks) => {
  if (!landmarks) return 0;
  const nose = landmarks[0];
  const shoulder = landmarks[12];
  const hip = landmarks[24];
  const knee = landmarks[26];
  if (!nose || !shoulder || !hip || !knee) return 0;

  const isFacingRight = nose.x > shoulder.x;
  const isLegInFront = isFacingRight ? knee.x > hip.x : knee.x < hip.x;

  if (!isLegInFront) return 0;

  const angle = computeJointAngle(shoulder, hip, knee);
  return Math.max(0, 180 - angle);
};

/**
 * 從完整掃描資料中萃取跑姿指標
 * @param {Array<{timestamp:number, landmarks:Array}>} data
 * @returns {Object|null} 跑姿指標 metrics
 */
export const processRunScanData = (data) => {
  if (!data || data.length === 0) return null;

  // 1. 送髖角度
  const hipDrives = data.map((d) => calculateRealHipExtension(d.landmarks));
  const maxHipDrive = Math.max(...hipDrives);

  // 2. 步頻估算：利用臀部垂直位移過平均線的次數估算步伐
  const hipYs = data.map(
    (d) => (d.landmarks[23].y + d.landmarks[24].y) / 2,
  );
  let steps = 0;
  const avgY = hipYs.reduce((a, b) => a + b, 0) / hipYs.length;
  for (let i = 1; i < hipYs.length; i++) {
    if (hipYs[i] < avgY && hipYs[i - 1] >= avgY) steps++;
  }
  const durationSec = data[data.length - 1].timestamp - data[0].timestamp;
  const cadence =
    durationSec > 0 ? Math.round(((steps * 2 * 60) / durationSec)) : 0;
  const safeCadence =
    cadence > 100 && cadence < 250 ? cadence : 170;

  return {
    hipDrive: {
      label: '最大送髖(前擺)',
      value: maxHipDrive.toFixed(1),
      unit: '°',
      status: maxHipDrive >= 20 ? 'good' : 'warning',
      hint: '目標: 20-60°',
    },
    cadence: {
      label: '平均步頻',
      value: safeCadence.toString(),
      unit: 'spm',
      status: safeCadence >= 170 ? 'good' : 'warning',
    },
  };
};

