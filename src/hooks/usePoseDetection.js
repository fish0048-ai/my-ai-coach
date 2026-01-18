/**
 * MediaPipe 姿態檢測 Hook
 * 延遲加載 MediaPipe 庫，優化初始載入性能
 */

import { useState, useEffect, useRef } from 'react';

/**
 * 姿態檢測 Hook
 * @param {Function} onResultsCallback - 檢測結果回調函數
 * @returns {Object|null} MediaPipe Pose 模型或 null
 */
export const usePoseDetection = (onResultsCallback) => {
  const [poseModel, setPoseModel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const callbackRef = useRef(onResultsCallback);

  useEffect(() => {
    callbackRef.current = onResultsCallback;
  }, [onResultsCallback]);

  useEffect(() => {
    let pose = null;
    let isMounted = true;

    const initPoseDetection = async () => {
      setIsLoading(true);
      try {
        // 動態導入 MediaPipe，延遲加載
        const { Pose } = await import('@mediapipe/pose');
        
        if (!isMounted) return;

        pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (callbackRef.current) callbackRef.current(results);
        });

        if (isMounted) {
          setPoseModel(pose);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("MediaPipe Init Error:", error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initPoseDetection();

    return () => {
      isMounted = false;
      if (pose) pose.close();
    };
  }, []);

  return { poseModel, isLoading };
};