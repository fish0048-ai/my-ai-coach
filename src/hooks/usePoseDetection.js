import { useState, useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';

// 這是一個自定義 Hook，專門處理 MediaPipe 的初始化與運算
export const usePoseDetection = (onResultsCallback) => {
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let pose = null;
    try {
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

      pose.onResults(onResultsCallback);
      setModel(pose);
      setIsLoading(false);
    } catch (error) {
      console.error("MediaPipe Init Error:", error);
      setIsLoading(false);
    }

    return () => {
      if (pose) pose.close();
    };
  }, []); // 空依賴，只在掛載時執行一次

  return { poseModel: model, isModelLoading: isLoading };
};