/**
 * MediaPipe 姿態繪圖服務
 * 封裝 Canvas 繪圖邏輯，包括骨架繪製、角度標註等
 */

/**
 * 初始化 MediaPipe 繪圖工具
 * @returns {Promise<{drawingUtils: Object, poseConnections: Array}>}
 */
export const initDrawingUtils = async () => {
  try {
    const [drawing, connections] = await Promise.all([
      import('@mediapipe/drawing_utils').then(m => m),
      import('@mediapipe/pose').then(m => m.POSE_CONNECTIONS)
    ]);
    return {
      drawingUtils: drawing,
      poseConnections: connections
    };
  } catch (error) {
    console.error('Failed to load MediaPipe drawing utils:', error);
    throw error;
  }
};

/**
 * 繪製姿態骨架和關節點
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Array} landmarks - MediaPipe poseLandmarks
 * @param {Object} drawingUtils - MediaPipe drawing utils
 * @param {Array} poseConnections - MediaPipe pose connections
 * @param {Object} options - 繪圖選項
 * @param {boolean} [options.showSkeleton=true] - 是否顯示骨架
 * @param {string} [options.connectorColor='#00FF00'] - 連接線顏色
 * @param {string} [options.landmarkColor='#FF0000'] - 關節點顏色
 */
export const drawPoseSkeleton = (ctx, landmarks, drawingUtils, poseConnections, options = {}) => {
  if (!landmarks || !drawingUtils || !poseConnections) return;

  const {
    showSkeleton = true,
    connectorColor = '#00FF00',
    landmarkColor = '#FF0000',
    lineWidth = 3,
    radius = 4
  } = options;

  if (showSkeleton) {
    drawingUtils.drawConnectors(ctx, landmarks, poseConnections, {
      color: connectorColor,
      lineWidth
    });
    drawingUtils.drawLandmarks(ctx, landmarks, {
      color: landmarkColor,
      lineWidth: lineWidth - 1,
      radius
    });
  }
};

/**
 * 繪製角度標註（用於重訓分析）
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Object} jointPoint - 關節點 {x, y}
 * @param {number} angle - 角度值
 * @param {number} canvasWidth - Canvas 寬度
 * @param {number} canvasHeight - Canvas 高度
 * @param {Object} options - 繪圖選項
 */
export const drawAngleLabel = (ctx, jointPoint, angle, canvasWidth, canvasHeight, options = {}) => {
  if (!jointPoint || !Number.isFinite(angle)) return;

  const {
    color = '#fbbf24',
    fontSize = 'bold 20px Arial',
    offsetX = 15,
    offsetY = 0
  } = options;

  ctx.save();
  try {
    ctx.fillStyle = color;
    ctx.font = fontSize;
    ctx.fillText(
      `${angle}°`,
      jointPoint.x * canvasWidth + offsetX,
      jointPoint.y * canvasHeight + offsetY
    );
  } finally {
    ctx.restore();
  }
};

/**
 * 繪製送髖覆蓋層（用於跑步分析）
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Object} hip - 髖關節點 {x, y}
 * @param {Object} knee - 膝關節點 {x, y}
 * @param {boolean} isFacingRight - 是否面向右側
 * @param {number} currentAngle - 當前送髖角度
 */
export const drawHipDriveOverlay = (ctx, hip, knee, isFacingRight, currentAngle) => {
  if (!hip || !knee || !Number.isFinite(hip.x) || !Number.isFinite(hip.y)) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const hipX = hip.x * w;
  const hipY = hip.y * h;
  const kneeX = knee.x * w;
  const kneeY = knee.y * h;
  const thighLen = Math.sqrt(Math.pow(kneeX - hipX, 2) + Math.pow(kneeY - hipY, 2));
  const radius = thighLen * 1.2;

  if (!Number.isFinite(radius) || radius <= 0) return;

  ctx.save();
  try {
    ctx.translate(hipX, hipY);
    ctx.shadowColor = 'rgba(0, 0, 0, 1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // 參考線
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.stroke();

    // 扇形
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const startAngle = Math.PI / 2;
    const minDrive = 20 * Math.PI / 180;
    const maxDrive = 60 * Math.PI / 180;
    const isGood = currentAngle >= 20;

    if (isFacingRight) {
      ctx.arc(0, 0, radius, startAngle - maxDrive, startAngle - minDrive);
    } else {
      ctx.arc(0, 0, radius, startAngle + minDrive, startAngle + maxDrive);
    }

    ctx.lineTo(0, 0);
    ctx.fillStyle = isGood ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 197, 94, 0.3)';
    ctx.fill();

    ctx.strokeStyle = isGood ? '#fbbf24' : '#22c55e';
    ctx.setLineDash([]);
    ctx.lineWidth = 3;
    ctx.stroke();

    // 高亮大腿
    const vecX = kneeX - hipX;
    const vecY = kneeY - hipY;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(vecX, vecY);
    ctx.strokeStyle = isGood ? '#fbbf24' : '#ef4444';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 角度標籤
    const labelDist = radius + 30;
    const labelAngle = isFacingRight
      ? (Math.PI / 2 - 40 * Math.PI / 180)
      : (Math.PI / 2 + 40 * Math.PI / 180);
    const labelX = Math.cos(labelAngle) * labelDist;
    const labelY = Math.sin(labelAngle) * labelDist;

    if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillStyle = isGood ? '#fbbf24' : '#ef4444';
      ctx.fillText(`${currentAngle}°`, labelX, labelY);
    }
  } catch (err) {
    console.error('繪製送髖覆蓋層錯誤:', err);
  } finally {
    ctx.restore();
  }
};

/**
 * 建立姿態分析回調函數（用於重訓）
 * @param {Object} options - 選項
 * @param {React.RefObject} options.canvasRef - Canvas ref
 * @param {React.Dispatch} options.setRealtimeAngle - 設定即時角度的函數
 * @param {React.RefObject} options.showSkeletonRef - 顯示骨架的 ref
 * @param {React.RefObject} options.modeRef - 動作模式的 ref
 * @param {Object} options.drawingUtils - MediaPipe drawing utils
 * @param {Array} options.poseConnections - MediaPipe pose connections
 * @param {Function} options.analyzePoseAngle - 分析角度函數
 * @returns {Function} 回調函數
 */
export const createStrengthPoseCallback = ({
  canvasRef,
  setRealtimeAngle,
  showSkeletonRef,
  modeRef,
  drawingUtils,
  poseConnections,
  analyzePoseAngle
}) => {
  return (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks && drawingUtils && poseConnections) {
        // 繪製骨架
        drawPoseSkeleton(ctx, results.poseLandmarks, drawingUtils, poseConnections, {
          showSkeleton: showSkeletonRef.current
        });

        // 計算並顯示角度
        const angle = analyzePoseAngle(results, modeRef.current);
        setRealtimeAngle(angle);

        // 繪製角度標註
        if (showSkeletonRef.current) {
          const currentMode = modeRef.current;
          let jointPoint = null;

          if (currentMode === 'bench' && results.poseLandmarks[14]) {
            jointPoint = results.poseLandmarks[14]; // 手肘
          } else if (currentMode === 'squat' && results.poseLandmarks[26]) {
            jointPoint = results.poseLandmarks[26]; // 膝蓋
          }

          if (jointPoint && angle > 0) {
            drawAngleLabel(ctx, jointPoint, angle, canvas.width, canvas.height);
          }
        }
      }
    } catch (e) {
      console.error('Canvas error', e);
    } finally {
      ctx.restore();
    }
  };
};

/**
 * 建立姿態分析回調函數（用於跑步）
 * @param {Object} options - 選項
 * @param {React.RefObject} options.canvasRef - Canvas ref
 * @param {React.Dispatch} options.setRealtimeAngle - 設定即時膝蓋角度的函數
 * @param {React.Dispatch} options.setHipExtensionAngle - 設定送髖角度的函數
 * @param {React.RefObject} options.showSkeletonRef - 顯示骨架的 ref
 * @param {React.RefObject} options.showIdealFormRef - 顯示理想送髖的 ref
 * @param {React.RefObject} options.isScanningRef - 是否正在掃描的 ref
 * @param {React.RefObject} options.fullScanDataRef - 掃描資料的 ref
 * @param {React.RefObject} options.videoRef - Video ref
 * @param {React.RefObject} options.lastUiUpdateRef - 最後 UI 更新時間的 ref
 * @param {Object} options.drawingUtils - MediaPipe drawing utils
 * @param {Array} options.poseConnections - MediaPipe pose connections
 * @param {Function} options.computeJointAngle - 計算關節角度函數
 * @param {Function} options.calculateRealHipExtension - 計算送髖角度函數
 * @returns {Function} 回調函數
 */
export const createRunPoseCallback = ({
  canvasRef,
  setRealtimeAngle,
  setHipExtensionAngle,
  showSkeletonRef,
  showIdealFormRef,
  isScanningRef,
  fullScanDataRef,
  videoRef,
  lastUiUpdateRef,
  drawingUtils,
  poseConnections,
  computeJointAngle,
  calculateRealHipExtension
}) => {
  return (results) => {
    // 掃描模式：存資料
    if (isScanningRef.current && results.poseLandmarks) {
      fullScanDataRef.current.push({
        timestamp: videoRef.current ? videoRef.current.currentTime : 0,
        landmarks: results.poseLandmarks
      });
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    try {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.poseLandmarks && drawingUtils && poseConnections) {
        // 繪製骨架
        drawPoseSkeleton(ctx, results.poseLandmarks, drawingUtils, poseConnections, {
          showSkeleton: showSkeletonRef.current,
          lineWidth: 2,
          radius: 3
        });

        let angle = 0;
        let hipDrive = 0;

        // 計算膝蓋角度
        if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
          angle = computeJointAngle(
            results.poseLandmarks[24],
            results.poseLandmarks[26],
            results.poseLandmarks[28]
          );
        }

        // 計算送髖角度
        if (results.poseLandmarks[12] && results.poseLandmarks[24] && results.poseLandmarks[26]) {
          hipDrive = calculateRealHipExtension(results.poseLandmarks);

          // 繪製送髖覆蓋層
          if (showIdealFormRef.current) {
            const nose = results.poseLandmarks[0];
            const shoulder = results.poseLandmarks[12];
            const isFacingRight = nose && shoulder ? nose.x > shoulder.x : true;
            drawHipDriveOverlay(
              ctx,
              results.poseLandmarks[24],
              results.poseLandmarks[26],
              isFacingRight,
              Math.round(hipDrive)
            );
          }
        }

        // 節流 UI 更新
        const now = Date.now();
        if (now - lastUiUpdateRef.current > 100) {
          setHipExtensionAngle(Math.round(hipDrive));
          setRealtimeAngle(angle);
          lastUiUpdateRef.current = now;
        }
      }
    } catch (e) {
      console.error('Canvas error:', e);
    } finally {
      ctx.restore();
    }
  };
};
