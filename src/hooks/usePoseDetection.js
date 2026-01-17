import { useState, useEffect, useRef } from 'react';
import { Pose } from '@mediapipe/pose';

export const usePoseDetection = (onResultsCallback) => {
  const [poseModel, setPoseModel] = useState(null);
  const callbackRef = useRef(onResultsCallback);

  useEffect(() => {
    callbackRef.current = onResultsCallback;
  }, [onResultsCallback]);

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

      pose.onResults((results) => {
          if (callbackRef.current) callbackRef.current(results);
      });

      setPoseModel(pose);
    } catch (error) {
      console.error("MediaPipe Init Error:", error);
    }

    return () => {
      if (pose) pose.close();
    };
  }, []);

  return poseModel;
};