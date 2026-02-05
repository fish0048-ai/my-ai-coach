import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Eye, EyeOff, FileCode, Zap, Layers, BookOpen, AlertTriangle, Trophy } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { saveRunAnalysis } from '../services/analysisService';
import { handleError } from '../services/core/errorService';
import { generateRunAnalysisFeedback } from '../services/ai/analysisService';
import { usePoseDetection } from '../hooks/usePoseDetection';
import { computeJointAngle, calculateRealHipExtension, processRunScanData, performFullVideoScan } from '../services/analysis/poseAnalysis';
import { calculateRunScore } from '../services/analysis/metricsCalculator';
import { initDrawingUtils, createRunPoseCallback } from '../services/analysis/poseDrawing';
import ScoreGauge from '../components/Analysis/ScoreGauge';
import MetricsPanel from '../components/Analysis/MetricsPanel';

export default function RunAnalysisView() {
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 

  const fullScanDataRef = useRef([]);
  const isScanningRef = useRef(false);
  const requestRef = useRef(null); 
  const lastUiUpdateRef = useRef(0);
  /** PWA 瘦身：追蹤影片 blob URL，清除/卸載時 revoke 釋放記憶體 */
  const videoBlobUrlRef = useRef(null);

  const [analysisStep, setAnalysisStep] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [videoError, setVideoError] = useState(null); 
  
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showIdealForm, setShowIdealForm] = useState(false);
  
  const showSkeletonRef = useRef(true);
  const showIdealFormRef = useRef(false);

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
    showIdealFormRef.current = showIdealForm;
  }, [showSkeleton, showIdealForm]);
  
  const [metrics, setMetrics] = useState(null);
  const [score, setScore] = useState(0); 
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [realtimeAngle, setRealtimeAngle] = useState(0); 
  const [hipExtensionAngle, setHipExtensionAngle] = useState(0); 

  // drawHipDriveOverlay 已移至 poseDrawing.js 服務

  // 延遲加載 MediaPipe 繪圖工具
  const [drawingUtils, setDrawingUtils] = useState(null);
  const [poseConnections, setPoseConnections] = useState(null);

  // --- Main Pose Callback ---
  // 使用新的繪圖服務建立回調（使用 useMemo 確保依賴正確）
  const onPoseResults = useMemo(() => {
    if (drawingUtils && poseConnections) {
      return createRunPoseCallback({
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
      });
    }
    return () => {}; // 如果繪圖工具未載入，使用空函數
  }, [drawingUtils, poseConnections, computeJointAngle, calculateRealHipExtension]);

  // 使用 Custom Hook（延遲加載 MediaPipe）
  // 注意：必須在 onPoseResults 定義之後調用，因為 Hook 需要這個回調
  const { poseModel, isLoading: isLoadingPose } = usePoseDetection(onPoseResults);

  useEffect(() => {
    if (poseModel && !drawingUtils) {
      // 使用新的繪圖服務初始化
      initDrawingUtils()
        .then(({ drawingUtils: drawing, poseConnections: connections }) => {
          setDrawingUtils(drawing);
          setPoseConnections(connections);
        })
        .catch(err => console.error('Failed to load MediaPipe drawing utils:', err));
    }
  }, [poseModel, drawingUtils]);

  // --- Video Loop & Scan Logic ---
  const processFrame = async () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended && poseModel && !isScanningRef.current) {
          if (video.readyState >= 2 && video.videoWidth > 0) {
              try { await poseModel.send({image: video}); } catch(e) { }
          }
          if (video && !video.paused) {
             requestRef.current = requestAnimationFrame(processFrame);
          }
      }
  };

  const onVideoPlay = () => {
      if (isScanningRef.current) return;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      processFrame();
  };

  const onVideoPause = () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoBlobUrlRef.current) {
        URL.revokeObjectURL(videoBlobUrlRef.current);
        videoBlobUrlRef.current = null;
      }
    };
  }, []);

  const revokeVideoBlob = () => {
    if (videoBlobUrlRef.current) {
      URL.revokeObjectURL(videoBlobUrlRef.current);
      videoBlobUrlRef.current = null;
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoError(null);
    if (file.name.toLowerCase().endsWith('.fit')) {
      revokeVideoBlob();
      await handleFitAnalysis(file);
    } else {
      if (file.type && !file.type.startsWith('video/')) {
        handleError("請上傳有效的影片", { context: 'RunAnalysisView', operation: 'handleFileChange' });
        return;
      }
      revokeVideoBlob();
      const url = URL.createObjectURL(file);
      videoBlobUrlRef.current = url;
      setVideoFile(url);
      setIsFitMode(false);
      setAnalysisStep('idle');
      fullScanDataRef.current = [];
      if (file.name.toLowerCase().endsWith('.mov')) {
        handleError("MOV 格式可能無法播放", { context: 'RunAnalysisView', operation: 'handleFileChange' });
      }
    }
  };

  const handleVideoError = (e) => {
      console.error("Video Error:", e);
      setVideoError("瀏覽器不支援此影片格式");
  };

  const startFullVideoScan = async () => {
    const video = videoRef.current;
    if (!video || !poseModel) return;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);

    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    try {
      // 使用新的掃描服務
      await performFullVideoScan(
        video,
        poseModel,
        (progress) => {
          setScanProgress(progress);
        },
        (landmarks, timestamp) => {
          // 在 onPoseResults 回調中已經處理，這裡不需要額外處理
        }
      );

      // 處理掃描資料
      const computedMetrics = processRunScanData(fullScanDataRef.current);
      if (computedMetrics) {
        setMetrics(computedMetrics);
        setScore(calculateRunScore(computedMetrics));
      }
      setAnalysisStep('internal_complete');
    } catch (error) {
      handleError(error, { context: 'RunAnalysisView', operation: 'startFullVideoScan' });
      setAnalysisStep('idle');
    } finally {
      isScanningRef.current = false;
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFitAnalysis = async (file) => {
      setAnalysisStep('analyzing_internal');
      setIsFitMode(true);
      revokeVideoBlob();
      setVideoFile(null);
      
      try {
        // 使用新的 FIT 解析服務
        const { extractFITMetrics } = await import('../services/import/fitParser');
        const fitMetrics = await extractFITMetrics(file, 'run');
        
        // 添加 icon 屬性
        const metricsWithIcons = {
          cadence: { ...fitMetrics.cadence, icon: Activity },
          hipDrive: { ...fitMetrics.hipDrive, icon: Zap }
        };
        
        setMetrics(metricsWithIcons);
        setScore(85);
        setAnalysisStep('internal_complete');
      } catch (error) {
        handleError(error.message || "FIT 解析失敗", { context: 'RunAnalysisView', operation: 'handleFitAnalysis' });
        setAnalysisStep('idle');
      }
  };
  
  const performAIAnalysis = async () => {
    if (!metrics) {
      handleError("請先完成內部分析", { context: 'RunAnalysisView', operation: 'performAIAnalysis' });
      return;
    }
    setAnalysisStep('analyzing_ai');
    try {
      const feedback = await generateRunAnalysisFeedback({ score, metrics });
      setAiFeedback(feedback);
      setAnalysisStep('ai_complete');
    } catch (e) {
      setAiFeedback("連線錯誤，請稍後再試。");
      setAnalysisStep('internal_complete');
    }
  };

  const saveToCalendar = async () => {
    const user = getCurrentUser();
    if (!user) { 
      handleError("請先登入", { context: 'RunAnalysisView', operation: 'saveToCalendar' }); 
      return; 
    }
    setIsSaving(true);
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const analysisEntry = {
            id: Date.now().toString(),
            type: 'analysis',
            title: '跑步跑姿分析 (Running AI)',
            feedback: aiFeedback,
            metrics: metrics,     
            score: `${score}分`, 
            status: 'completed',
            updatedAt: now.toISOString()
        };
        await saveRunAnalysis(dateStr, analysisEntry);
        // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
    } catch (e) {
        handleError(e, { context: 'RunAnalysisView', operation: 'saveToCalendar' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const updateMetric = (key, val) => {
      setMetrics(prev => {
          const newMetrics = {...prev, [key]: {...prev[key], value: val}};
          setScore(calculateRunScore(newMetrics));
          return newMetrics;
      });
  };
  const clearAll = () => {
    isScanningRef.current = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    revokeVideoBlob();
    setAnalysisStep('idle');
    setMetrics(null);
    setScore(0);
    setAiFeedback('');
    setVideoFile(null);
    setVideoError(null);
    setIsFitMode(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*, .fit" className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-green-500" /> 跑姿 AI 分析
          <span className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded border border-green-700">動力學/送髖</span>
        </h1>
        <div className="flex gap-2">
            {(videoFile || isFitMode) && (
                <>
                    <button 
                      onClick={() => setShowIdealForm(!showIdealForm)} 
                      className={`px-3 py-1.5 rounded-lg border text-sm flex gap-1 ${
                        showIdealForm 
                          ? 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/50' 
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                    >
                        <Layers size={16}/> {showIdealForm ? '隱藏模擬' : '顯示理想送髖'}
                    </button>
                    <button onClick={() => setShowSkeleton(!showSkeleton)} className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 text-sm flex gap-1">
                        {showSkeleton ? <Eye size={16}/> : <EyeOff size={16}/>} 骨架
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div 
            className={`relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group ${!videoFile && !isFitMode && 'cursor-pointer hover:border-blue-500 hover:bg-gray-800'}`}
            onClick={(!videoFile && !isFitMode) ? () => fileInputRef.current.click() : undefined}
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" width={640} height={360}/>
            {analysisStep === 'scanning' && (
              <div className="absolute inset-0 bg-gray-900/90 z-30 flex flex-col items-center justify-center text-blue-400">
                  <Cpu className="animate-pulse mb-2" size={32}/> 
                  <p className="mb-2">全影片掃描中 ({scanProgress}%)</p>
                  <div className="w-64 h-1 bg-gray-700 rounded overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-100" style={{width: `${scanProgress}%`}}></div>
                  </div>
              </div>
            )}
            {analysisStep === 'analyzing_ai' && <div className="absolute inset-0 bg-gray-900/80 z-30 flex items-center justify-center text-purple-400 font-mono"><BrainCircuit className="animate-pulse mr-2"/> AI 診斷中...</div>}
            {videoError && (
                <div className="absolute inset-0 z-40 bg-gray-900 flex flex-col items-center justify-center text-red-400 p-4 text-center">
                    <AlertTriangle size={48} className="mb-2" />
                    <p className="font-bold">影片無法播放</p>
                    <p className="text-sm text-gray-400">{videoError}</p>
                    <button onClick={clearAll} className="mt-4 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 text-white">重試</button>
                </div>
            )}
            {!videoFile && !isFitMode && !videoError && (
              <div className="text-center p-6 cursor-pointer">
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <h3 className="text-white font-bold">上傳跑步影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4 (分析送髖、步頻)</p>
              </div>
            )}
            {videoFile && (
                <video 
                    ref={videoRef}
                    src={videoFile} 
                    className={`absolute inset-0 w-full h-full object-contain bg-black z-10 transition-opacity duration-300 ${showIdealForm ? 'opacity-30' : 'opacity-100'}`}
                    controls
                    loop
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    onPlay={onVideoPlay}
                    onPause={onVideoPause}
                    onError={(e) => { console.error("Video Error:", e); setVideoError("瀏覽器不支援此影片格式 (建議使用 MP4)"); }}
                />
            )}
            {isFitMode && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><FileCode size={48}/> FIT 模式</div>}
          </div>

          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={handleUploadClick} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">更換檔案</button>
                    {!isFitMode && (
                        <button onClick={startFullVideoScan} className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"><Cpu size={20} /> 開始全影片分析</button>
                    )}
                 </>
             )}
             {(analysisStep === 'internal_complete' || analysisStep === 'ai_complete') && (
                 <>
                    <button onClick={() => { setAnalysisStep('idle'); setMetrics(null); setAiFeedback(''); }} className="px-6 py-2 bg-gray-700 text-white rounded-lg">重置</button>
                    {analysisStep !== 'ai_complete' && <button onClick={performAIAnalysis} className="px-6 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2"><Sparkles size={18}/> AI 診斷</button>}
                    {analysisStep === 'ai_complete' && <button onClick={saveToCalendar} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><Save size={18}/> 儲存</button>}
                 </>
             )}
          </div>
        </div>

        <div className="space-y-4">
           {metrics && (
              <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                  <div>
                      <h3 className="text-white font-bold flex items-center gap-2"><Trophy className="text-yellow-400"/> 跑姿評分</h3>
                      <p className="text-xs text-gray-400">基於動力學指標計算</p>
                  </div>
                  <ScoreGauge score={score} showBlue />
              </div>
           )}

           {videoFile && !metrics && analysisStep !== 'scanning' && (
             <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 text-center">
                 <div className="text-4xl font-bold text-white font-mono">{realtimeAngle}°</div>
                 <div className="text-sm text-gray-400">即時膝蓋角度</div>
                 {hipExtensionAngle > 0 && <div className="text-green-400 mt-2 text-sm font-bold">送髖(前擺): {hipExtensionAngle}°</div>}
             </div>
           )}

           {metrics && (
             <>
                <MetricsPanel metrics={metrics} title="動態資料" onUpdateMetric={updateMetric} />
                <div className="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30 text-gray-300 text-sm space-y-3">
                    <h3 className="text-blue-400 font-bold flex items-center gap-2"><BookOpen size={16} /> 什麼是送髖 (Hip Drive)?</h3>
                    <p><strong>定義：</strong> 跑步時利用骨盆前傾，主動帶動大腿<strong>向前抬起</strong>。</p>
                </div>
             </>
           )}
           {aiFeedback && (
               <div className="bg-purple-900/20 p-5 rounded-xl border border-purple-500/30 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                   <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Sparkles size={16}/> 跑姿診斷</h3>
                   {aiFeedback}
               </div>
           )}
        </div>
      </div>
    </div>
  );
}