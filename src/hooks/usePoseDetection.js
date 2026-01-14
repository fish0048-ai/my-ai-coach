import { useState, useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';

/**
 * 通用的 MediaPipe Pose Hook
 * @param {Function} onResultsCallback - 當 AI 偵測到骨架時要執行的函式
 * @returns {Object} poseModel - MediaPipe 實例，可用於 .send({image: video})
 */
export const usePoseDetection = (onResultsCallback) => {
  const [pose, setPose] = useState(null);
  
  // 使用 Ref 儲存最新的 callback，避免閉包導致讀取到舊變數
  const callbackRef = useRef(onResultsCallback);

  useEffect(() => {
    callbackRef.current = onResultsCallback;
  }, [onResultsCallback]);

  useEffect(() => {
    let p = null;
    try {
      p = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      p.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // 設置回呼，永遠執行 Ref 中的最新函式
      p.onResults((results) => {
        if (callbackRef.current) {
          callbackRef.current(results);
        }
      });

      setPose(p);
    } catch (error) {
      console.error("MediaPipe Init Error:", error);
    }

    // 組件卸載時自動關閉模型，防止記憶體洩漏
    return () => {
      if (p) p.close();
    };
  }, []);

  return pose;
};