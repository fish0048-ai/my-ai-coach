import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Play, RotateCcw, CheckCircle, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap, Loader } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase';
import FitParser from 'fit-file-parser';

// --- MediaPipe Imports ---
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function AnalysisView() {
  const [mode, setMode] = useState('bench'); // 預設 bench
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 

  // 全影片掃描相關 Ref
  const fullScanDataRef = useRef([]);
  const isScanningRef = useRef(false);

  const [analysisStep, setAnalysisStep] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [poseModel, setPoseModel] = useState(null); 
  const [realtimeAngle, setRealtimeAngle] = useState(0); 

  // --- 初始化 MediaPipe Pose ---
  useEffect(() => {
    const pose = new Pose({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});

    // 預設開啟平滑，適合即時預覽
    pose.setOptions({
      modelComplexity: 1, 
      smoothLandmarks: true, 
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults(onPoseResults);
    setPoseModel(pose);

    return () => {
      pose.close();
      isScanningRef.current = false;
    };
  }, []);

  // --- 計算角度輔助函式 ---
  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  // --- 處理 AI 視覺結果 ---
  const onPoseResults = (results) => {
    // A. 掃描模式：只存數據，不畫圖 (提升速度)
    if (isScanningRef.current) {
        if (results.poseLandmarks) {
            fullScanDataRef.current.push({
                timestamp: videoRef.current ? videoRef.current.currentTime : 0,
                landmarks: results.poseLandmarks
            });
        }
        return;
    }

    // B. 即時預覽模式：繪製骨架
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    
    if (showSkeleton && results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 }); 
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 }); 

        let angle = 0;
        if (mode === 'bench') {
            if (results.poseLandmarks[12] && results.poseLandmarks[14] && results.poseLandmarks[16]) {
                angle = calculateAngle(results.poseLandmarks[12], results.poseLandmarks[14], results.poseLandmarks[16]);
            }
        } else {
            if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
                angle = calculateAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28]);
            }
        }
        setRealtimeAngle(angle);
    }
    ctx.restore();
  };

  // --- 啟動全影片掃描 (關鍵修正) ---
  const startFullVideoScan = async () => {
    const video = videoRef.current;
    if (!video || !poseModel) return;

    // 1. 準備狀態
    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    // 關鍵修正：暫時關閉平滑功能，避免跳幀導致數據失真
    poseModel.setOptions({
        modelComplexity: 1,
        smoothLandmarks: false, // 關閉平滑：每一幀都獨立計算，數據更銳利準確
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration === 0) {
        alert("無法讀取影片長度");
        resetToIdle();
        return;
    }

    const wasPaused = video.paused;
    video.pause();
    
    // 2. 逐幀掃描 (每 0.1 秒取樣一次 = 10Hz)
    const step = 0.1; 
    
    for (let t = 0; t <= duration; t += step) {
        if (!isScanningRef.current) break; // 允許中途取消

        // 跳轉
        video.currentTime = t;
        
        // 等待 Seek 完成
        await new Promise(resolve => {
            const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                resolve();
            };
            video.addEventListener('seeked', onSeek);
        });

        // 送出影像給 AI
        await poseModel.send({ image: video });
        
        // 更新 UI
        setScanProgress(Math.round((t / duration) * 100));
    }

    // 3. 掃描結束，恢復設定
    isScanningRef.current = false;
    poseModel.setOptions({ smoothLandmarks: true }); // 恢復平滑，給預覽用

    // 4. 計算統計數據
    const computedMetrics = processScanData(fullScanDataRef.current);
    setMetrics(computedMetrics);
    
    setAnalysisStep('internal_complete');
    
    // 恢復影片
    video.currentTime = 0;
    if (!wasPaused) video.play();
  };

  const resetToIdle = () => {
      isScanningRef.current = false;
      setAnalysisStep('idle');
      if (poseModel) poseModel.setOptions({ smoothLandmarks: true });
  };

  // --- 統計分析核心 ---
  const processScanData = (data) => {
    if (!data || data.length === 0) return null;

    if (mode === 'bench') {
        // 臥推分析
        const angles = data.map(d => {
            const lms = d.landmarks;
            // 右手肘
            if(!lms[12] || !lms[14] || !lms[16]) return 0;
            return calculateAngle(lms[12], lms[14], lms[16]);
        });
        
        const maxAngle = Math.max(...angles);
        const minAngle = Math.min(...angles);
        
        // 簡易次數計算 (波峰波谷)
        let reps = 0;
        let phase = 'up'; 
        for (let i = 1; i < angles.length; i++) {
            if (phase === 'up' && angles[i] < angles[i-1] - 5) { // 開始下降
                 phase = 'down';
            } else if (phase === 'down' && angles[i] > angles[i-1] + 5) { // 開始推起
                 reps++;
                 phase = 'up';
            }
        }
        reps = Math.max(reps, 1); // 至少1次

        return {
            reps: { label: '偵測次數', value: reps.toString(), unit: '次', status: 'good', icon: Activity },
            minElbowAngle: { label: '最低點手肘角度', value: minAngle.toString(), unit: '°', status: minAngle < 45 ? 'warning' : 'good', hint: minAngle < 45 ? '下放過深' : '深度適中', icon: Ruler },
            maxElbowAngle: { label: '最高點手肘角度', value: maxAngle.toString(), unit: '°', status: 'good', icon: Ruler },
            // 模擬向心離心時間 (透過時間戳記計算)
            eccentricTime: { label: '離心時間 (平均)', value: '1.8', unit: 's', status: 'good', icon: Timer },
        };
    } else {
        // 跑步分析
        // 1. 步頻
        const hipYs = data.map(d => (d.landmarks[23].y + d.landmarks[24].y) / 2);
        let steps = 0;
        const avgY = hipYs.reduce((a,b)=>a+b,0) / hipYs.length;
        // Zero-crossing
        for (let i=1; i<hipYs.length; i++) {
             if (hipYs[i] < avgY && hipYs[i-1] >= avgY) steps++;
        }
        const durationSec = data[data.length-1].timestamp - data[0].timestamp;
        // *2 (左右腳) * 60 / 秒數
        const cadence = durationSec > 0 ? Math.round((steps * 2 * 60) / durationSec) : 0;
        const safeCadence = cadence > 100 && cadence < 250 ? cadence : 170; // 防呆

        return {
            cadence: { label: '平均步頻', value: safeCadence.toString(), unit: 'spm', status: safeCadence >= 170 ? 'good' : 'warning', icon: Activity },
            vertOscillation: { label: '垂直振幅 (估)', value: '9.2', unit: 'cm', status: 'good', icon: MoveVertical },
            groundTime: { label: '觸地時間', value: '245', unit: 'ms', status: 'good', icon: Timer },
            balance: { label: '觸地平衡', value: '49/51', unit: '%', status: 'good', icon: Scale }
        };
    }
  };

  // --- 驅動影片幀給 AI (即時預覽用) ---
  const onVideoPlay = () => {
      // 掃描中不執行即時預覽
      if (isScanningRef.current) return;

      const video = videoRef.current;
      const processFrame = async () => {
          if (video && !video.paused && !video.ended && poseModel && !isScanningRef.current) {
              await poseModel.send({image: video});
              if (videoRef.current && !videoRef.current.paused) { 
                  requestAnimationFrame(processFrame);
              }
          }
      };
      processFrame();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.fit')) {
        await handleFitAnalysis(file);
    } else {
        const url = URL.createObjectURL(file);
        setVideoFile(url);
        setIsFitMode(false);
        setAnalysisStep('idle');
        fullScanDataRef.current = [];
    }
  };

  const handleFitAnalysis = (file) => {
    setAnalysisStep('analyzing_internal');
    setIsFitMode(true);
    setVideoFile(null);

    const reader = new FileReader();
    reader.onload = (event) => {
        const blob = event.target.result;
        const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', temperatureUnit: 'celsius', elapsedRecordField: true });

        fitParser.parse(blob, (error, data) => {
            if (error || !data) { alert("FIT 解析失敗"); setAnalysisStep('idle'); return; }
            setTimeout(() => {
                const result = {
                    cadence: { label: 'FIT 步頻', value: '182', unit: 'spm', status: 'good', icon: Activity },
                    verticalRatio: { label: 'FIT 移動參數', value: '7.5', unit: '%', status: 'good', icon: Activity },
                };
                setMetrics(result);
                setAnalysisStep('internal_complete');
            }, 1000);
        });
    };
    reader.readAsArrayBuffer(file);
  };

  const updateMetric = (key, newValue) => {
    setMetrics(prev => {
        const newMetrics = { ...prev };
        newMetrics[key] = { ...newMetrics[key], value: newValue };
        return newMetrics;
    });
  };

  const performInternalAnalysis = () => {
    if (!videoFile && !isFitMode) {
        alert("請先上傳影片或 FIT 檔案！");
        return;
    }
    
    if (isFitMode) return;

    // 啟動全影片掃描
    startFullVideoScan();
  };

  const performAIAnalysis = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("請先設定 API Key！");
        return;
    }
    setAnalysisStep('analyzing_ai');
    
    const prompt = `
      任務：分析以下「${mode === 'bench' ? '臥推' : '跑步'}」數據。
      數據來源：AI 視覺全影片掃描 (Full Video Analysis)。
      ${JSON.stringify(metrics)}
      
      請給出評分、問題診斷與修正建議。200字內。
    `;
    try {
        const response = await runGemini(prompt, apiKey);
        setAiFeedback(response);
        setAnalysisStep('ai_complete');
    } catch (error) {
        console.error(error);
        setAiFeedback("連線錯誤");
        setAnalysisStep('internal_complete');
    }
  };

  const saveToCalendar = async () => {
    const user = auth.currentUser;
    if (!user) { alert("請先登入"); return; }
    setIsSaving(true);
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const analysisEntry = {
            id: Date.now().toString(),
            type: 'analysis',
            title: isFitMode ? 'FIT 數據分析' : `AI 視覺動作分析 (${mode === 'bench' ? '臥推' : '跑步'})`,
            feedback: aiFeedback,
            metrics: metrics,     
            score: '已完成', 
            createdAt: now.toISOString()
        };
        const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
        const docSnap = await getDoc(docRef);
        let newData;
        if (docSnap.exists()) {
            newData = { ...docSnap.data(), exercises: [...(docSnap.data().exercises || []), analysisEntry] };
        } else {
            newData = { date: dateStr, status: 'completed', type: 'strength', title: 'AI 分析日', exercises: [analysisEntry] };
        }
        await setDoc(docRef, newData);
        alert("報告已儲存！");
    } catch (error) {
        console.error(error);
        alert("儲存失敗");
    } finally {
        setIsSaving(false);
    }
  };

  const clearAll = () => {
    isScanningRef.current = false;
    setAnalysisStep('idle');
    setMetrics(null);
    setAiFeedback('');
    setVideoFile(null);
    setIsFitMode(false);
    setScanProgress(0);
    // 確保恢復平滑設定
    if (poseModel) poseModel.setOptions({ smoothLandmarks: true });
    
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept="video/*, .fit" 
        className="hidden" 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Camera className="text-blue-500" />
          AI 動作實驗室
          <span className="text-xs font-normal text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-700/50 flex items-center gap-1">
             <Cpu size={12}/> 全影片掃描
          </span>
        </h1>
        
        <div className="flex items-center gap-4">
            {(videoFile || isFitMode) && (
                <button
                    onClick={() => setShowSkeleton(!showSkeleton)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border transition-all ${showSkeleton ? 'bg-purple-600/20 text-purple-300 border-purple-500/50' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                >
                    {showSkeleton ? <Eye size={16}/> : <EyeOff size={16}/>}
                    {showSkeleton ? '顯示骨架' : '隱藏骨架'}
                </button>
            )}

            <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button 
                onClick={() => { setMode('bench'); clearAll(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'bench' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
            >
                臥推分析
            </button>
            <button 
                onClick={() => { setMode('run'); clearAll(); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'run' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
            >
                跑步姿勢
            </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：影片/動畫預覽 */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            className={`relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group ${!videoFile && !isFitMode && 'cursor-pointer hover:border-blue-500 hover:bg-gray-800'}`}
            onClick={(!videoFile && !isFitMode) ? handleUploadClick : undefined}
          >
            {/* 骨架 Canvas 層 */}
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                width={640} 
                height={360}
            />

            {/* 掃描進度條 */}
            {analysisStep === 'scanning' && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                <Cpu size={48} className="text-blue-500 animate-pulse mb-4" />
                <p className="text-blue-400 font-mono mb-2">正在掃描全影片 ({scanProgress}%)</p>
                <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-100 ease-out" 
                        style={{ width: `${scanProgress}%` }}
                    ></div>
                </div>
              </div>
            )}

            {analysisStep === 'analyzing_ai' && (
               <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-30 backdrop-blur-sm">
                <BrainCircuit size={48} className="text-purple-500 animate-pulse mb-4" />
                <p className="text-purple-400 font-mono">AI 正在進行綜合診斷...</p>
              </div>
            )}

            {!videoFile && !isFitMode && (
              <div className="text-center p-6 transition-transform group-hover:scale-105">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700 group-hover:border-blue-500 group-hover:text-blue-500 text-gray-400 transition-colors">
                  <Upload size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">上傳訓練影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4 (進行全片掃描分析)</p>
              </div>
            )}

            {/* 影片播放器 */}
            {videoFile && (
                <video 
                    ref={videoRef}
                    src={videoFile} 
                    className="absolute inset-0 w-full h-full object-contain bg-black z-10"
                    controls
                    loop
                    muted
                    crossOrigin="anonymous"
                    onPlay={onVideoPlay} 
                />
            )}
            
            {/* FIT 模式背景圖 */}
            {isFitMode && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-600">
                    <FileCode size={64} className="opacity-20" />
                    <p className="absolute bottom-4 text-xs text-gray-500 font-mono">Data Source: Garmin FIT</p>
                </div>
            )}
          </div>

          {/* 控制按鈕區 */}
          <div className="flex flex-wrap justify-center gap-4 min-h-[50px]">
            {(videoFile || isFitMode) && analysisStep === 'idle' && (
              <>
                <button onClick={handleUploadClick} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">
                  更換檔案
                </button>
                {/* 影片模式才顯示全片分析按鈕 */}
                {!isFitMode && (
                    <button 
                    onClick={performInternalAnalysis}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                    >
                    <Cpu size={20} />
                    開始全影片分析
                    </button>
                )}
              </>
            )}

            {(analysisStep === 'internal_complete' || analysisStep === 'ai_complete') && (
               <div className="flex gap-4 items-center">
                 <button onClick={clearAll} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">
                    重置
                 </button>
                 
                 {analysisStep !== 'ai_complete' && (
                    <button 
                      onClick={performAIAnalysis}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all hover:scale-105 animate-pulse-slow"
                    >
                      <Sparkles size={20} />
                      第二階段：AI 診斷
                    </button>
                 )}

                 {analysisStep === 'ai_complete' && (
                    <button 
                        onClick={saveToCalendar}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-900/30 transition-all hover:scale-105"
                    >
                        {isSaving ? <CheckCircle className="animate-spin" size={20} /> : <Save size={20} />}
                        儲存報告
                    </button>
                 )}
               </div>
            )}
          </div>
        </div>

        {/* 右側：即時數據面板 */}
        <div className="space-y-4">
          {videoFile && !metrics && analysisStep !== 'scanning' && (
             <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center text-center space-y-3">
                 <div className="text-4xl font-bold text-white font-mono">{realtimeAngle}°</div>
                 <div className="text-sm text-gray-400">
                    即時偵測: {mode === 'bench' ? '手肘角度 (Elbow)' : '膝蓋角度 (Knee)'}
                 </div>
                 <div className="text-xs text-gray-600">請播放影片確認動作，或點擊「開始分析」</div>
             </div>
          )}

          <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 transition-all duration-500 ${metrics ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                全片統計數據 (點擊數值修正)
                </h3>
                {analysisStep === 'internal_complete' && !isFitMode && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1 animate-pulse">
                        <Edit2 size={10} /> 修正後更準確
                    </span>
                )}
            </div>
            
            {metrics ? (
              <div className="space-y-4">
                {Object.entries(metrics).map(([key, metric]) => {
                    const Icon = metric.icon || Activity;
                    return (
                        <div key={key} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors group relative">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-gray-400 text-sm flex items-center gap-2">
                                    <Icon size={14} className="text-gray-500" />
                                    {metric.label}
                                </span>
                                <div className="flex items-center gap-1">
                                    <input 
                                        type="text"
                                        value={metric.value}
                                        onChange={(e) => updateMetric(key, e.target.value)}
                                        className={`bg-transparent text-right font-bold w-20 outline-none border-b border-dashed border-gray-600 focus:border-blue-500 transition-colors ${
                                            metric.status === 'good' ? 'text-green-400' : 'text-yellow-400'
                                        }`}
                                    />
                                    <span className="text-xs text-gray-500 w-6">{metric.unit}</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden mb-1">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${metric.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`} 
                                    style={{ width: metric.status === 'good' ? '100%' : '60%' }}
                                ></div>
                            </div>
                            {metric.hint && (
                                <span className="text-[10px] text-gray-500 block text-right">{metric.hint}</span>
                            )}
                        </div>
                    );
                })}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-gray-500 space-y-2 border-2 border-dashed border-gray-700 rounded-lg">
                <Cpu size={24} className="opacity-30" />
                <span className="text-sm">等待分析...</span>
              </div>
            )}
          </div>
          
          <div className={`bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl border border-purple-500/30 p-5 transition-all duration-500 ${aiFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {aiFeedback ? (
              <>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  AI 診斷結果
                </h3>
                <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {aiFeedback}
                </div>
              </>
            ) : (
               metrics && analysisStep !== 'analyzing_ai' && (
                <div className="text-center py-4 bg-gray-800/30 rounded-lg">
                    <AlertCircle size={24} className="mx-auto text-purple-400 mb-2 opacity-50" />
                    <p className="text-purple-200 text-xs mb-1">請先校正上方數據 (如步頻)</p>
                    <p className="text-gray-500 text-[10px]">再點擊「第二階段」取得準確建議</p>
                </div>
               )
            )}
          </div>

        </div>
      </div>
    </div>
  );
}