/**
 * Pose / 姿態分析服務
 * 封裝 MediaPipe 姿態分析邏輯，包括角度計算、掃描處理、繪圖等
 */

/**
 * 計算三點關節角度（共用於重訓與跑步）
 * @param {Object} a - 第一個點 {x, y, z}
 * @param {Object} b - 關節點（頂點）{x, y, z}
 * @param {Object} c - 第三個點 {x, y, z}
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
 * @param {Array<{timestamp:number, landmarks:Array}>} data - 掃描資料陣列
 * @returns {Object|null} 跑姿指標 metrics
 */
export const processRunScanData = (data) => {
  if (!data || data.length === 0) return null;

  // 1. 送髖角度
  const hipDrives = data.map((d) => calculateRealHipExtension(d.landmarks));
  const maxHipDrive = Math.max(...hipDrives);

  // 2. 步頻估算：利用臀部垂直位移過平均線的次數估算步伐
  const hipYs = data.map(
    (d) => (d.landmarks[23]?.y && d.landmarks[24]?.y) ? (d.landmarks[23].y + d.landmarks[24].y) / 2 : 0,
  ).filter(y => y > 0);
  
  if (hipYs.length === 0) return null;
  
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

/**
 * 分析姿態並提取角度（用於重訓分析）
 * @param {Object} results - MediaPipe 檢測結果
 * @param {'bench'|'squat'} mode - 動作模式
 * @returns {number} 關節角度
 */
export const analyzePoseAngle = (results, mode) => {
  if (!results || !results.poseLandmarks) return 0;

  if (mode === 'bench') {
    // 臥推：計算手肘角度（肩膀-手肘-手腕）
    if (results.poseLandmarks[12] && results.poseLandmarks[14] && results.poseLandmarks[16]) {
      return computeJointAngle(
        results.poseLandmarks[12],
        results.poseLandmarks[14],
        results.poseLandmarks[16]
      );
    }
  } else if (mode === 'squat') {
    // 深蹲：計算膝蓋角度（髖-膝-踝）
    if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
      return computeJointAngle(
        results.poseLandmarks[24],
        results.poseLandmarks[26],
        results.poseLandmarks[28]
      );
    }
  }

  return 0;
};

/**
 * 執行全影片掃描
 * 注意：此函數會逐幀掃描影片，但實際的 landmarks 資料收集需要在 onPoseResults 回調中完成
 * @param {HTMLVideoElement} video - 影片元素
 * @param {Object} poseModel - MediaPipe Pose 模型
 * @param {Function} onProgress - 進度回調 (progress: number) => void
 * @param {Function} [onFrame] - 每幀回調（可選，實際資料在 onPoseResults 中收集）
 * @returns {Promise<void>}
 */
export const performFullVideoScan = async (video, poseModel, onProgress, onFrame) => {
  if (!video || !poseModel) {
    throw new Error('需要影片和 Pose 模型');
  }

  // 重置模型
  if (poseModel.reset) {
    await poseModel.reset();
  }

  // 設定掃描模式選項
  poseModel.setOptions({
    modelComplexity: 1,
    smoothLandmarks: false, // 關閉平滑以獲取原始數據
    enableSegmentation: false,
    smoothSegmentation: false,
  });

  const duration = video.duration;

  // 暫停影片
  video.pause();

  // 逐幀掃描
  for (let t = 0; t <= duration; t += 0.1) {
    video.currentTime = t;

    // 等待影片跳轉完成
    await new Promise((resolve) => {
      const onSeek = () => {
        video.removeEventListener('seeked', onSeek);
        setTimeout(resolve, 50);
      };
      video.addEventListener('seeked', onSeek);
      setTimeout(onSeek, 500); // 超時保護
    });

    if (video.readyState >= 2 && video.videoWidth > 0) {
      try {
        await poseModel.send({ image: video });
        // 等待回調處理完成（資料會在 onPoseResults 中收集）
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (e) {
        console.error('掃描幀失敗:', e);
      }
    }

    const progress = Math.round((t / duration) * 100);
    if (onProgress) {
      onProgress(progress);
    }
  }

  // 恢復平滑選項
  poseModel.setOptions({ smoothLandmarks: true });

  // 重置影片
  video.currentTime = 0;
};

