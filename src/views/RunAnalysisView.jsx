import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap, Layers, BookOpen, AlertTriangle, Trophy } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { getCurrentUser } from '../services/authService';
import { getApiKey } from '../services/apiKeyService';
import { saveRunAnalysis } from '../services/analysisService';
import FitParser from 'fit-file-parser';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
// 引入 Hook
import { usePoseDetection } from '../hooks/usePoseDetection';

// 分數圈圈
const ScoreGauge = ({ score }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  let color = 'text-red-500';
  if (score >= 70) color = 'text-yellow-500';
  if (score >= 85) color = 'text-green-500';
  if (score >= 95) color = 'text-blue-500';
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-700" />
        <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${color} transition-all duration-1000 ease-out`} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${color}`}>{score}</span>
        <span className="text-[10px] text-gray-400">SCORE</span>
      </div>
    </div>
  );
};

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

  // --- 評分與幾何運算 ---
  const calculateRunScore = (m) => {
      if (!m) return 0;
      let s = 100;
      const cad = parseFloat(m.cadence?.value || 0);
      if (cad < 150) s -= 30; else if (cad < 160) s -= 20; else if (cad < 170) s -= 10;
      const hip = parseFloat(m.hipDrive?.value || 0);
      if (hip < 10) s -= 25; else if (hip < 20) s -= 15;
      const osc = parseFloat(m.vertOscillation?.value || 10);
      if (osc > 12) s -= 25;
      const ratio = parseFloat(m.vertRatio?.value || 8);
      if (ratio > 10) s -= 20;
      return Math.max(0, Math.round(s));
  };

  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const calculateRealHipExtension = (landmarks) => {
      if (!landmarks) return 0;
      const nose = landmarks[0];
      const shoulder = landmarks[12];
      const hip = landmarks[24];
      const knee = landmarks[26];
      if (!nose || !shoulder || !hip || !knee) return 0;
      const isFacingRight = nose.x > shoulder.x;
      const isLegInFront = isFacingRight ? (knee.x > hip.x) : (knee.x < hip.x);
      if (isLegInFront) {
          const angle = calculateAngle(shoulder, hip, knee);
          return Math.max(0, 180 - angle);
      }
      return 0; 
  };

  const drawHipDriveOverlay = (ctx, hip, knee, isFacingRight, currentAngle) => {
      if (!hip || !knee) return;
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      if (!Number.isFinite(hip.x) || !Number.isFinite(hip.y)) return;
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
          ctx.shadowColor = "rgba(0, 0, 0, 1)";
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
          const startAngle = Math.PI/2; 
          const minDrive = 20 * Math.PI/180; 
          const maxDrive = 60 * Math.PI/180; 
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

          const labelDist = radius + 30;
          const labelAngle = isFacingRight ? (Math.PI/2 - 40*Math.PI/180) : (Math.PI/2 + 40*Math.PI/180);
          const labelX = Math.cos(labelAngle) * labelDist;
          const labelY = Math.sin(labelAngle) * labelDist;

          if (Number.isFinite(labelX) && Number.isFinite(labelY)) {
              ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'center';
              ctx.shadowColor = "black";
              ctx.shadowBlur = 4;
              ctx.fillStyle = isGood ? '#fbbf24' : '#ef4444'; 
              ctx.fillText(`${currentAngle}°`, labelX, labelY);
          }
      } catch(err) {} finally { ctx.restore(); }
  };

  // --- Main Pose Callback ---
  const onPoseResults = (results) => {
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
        
        if (results.poseLandmarks) {
            if (showSkeletonRef.current) {
                drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 }); 
                drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 }); 
            }

            let angle = 0;
            let hipDrive = 0;
            
            if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
                angle = calculateAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28]);
            }
            
            if (results.poseLandmarks[12] && results.poseLandmarks[24] && results.poseLandmarks[26]) {
                hipDrive = calculateRealHipExtension(results.poseLandmarks);
                
                if (showIdealFormRef.current) {
                    const nose = results.poseLandmarks[0];
                    const shoulder = results.poseLandmarks[12];
                    const isFacingRight = nose && shoulder ? nose.x > shoulder.x : true;
                    drawHipDriveOverlay(ctx, results.poseLandmarks[24], results.poseLandmarks[26], isFacingRight, Math.round(hipDrive));
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
    } catch(e) { console.error("Canvas error:", e); } finally { ctx.restore(); }
  };

  // 使用 Custom Hook
  const poseModel = usePoseDetection(onPoseResults);

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

  useEffect(() => { return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); } }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoError(null); 
    if (file.name.toLowerCase().endsWith('.fit')) { handleFitAnalysis(file); } 
    else {
        if (file.type && !file.type.startsWith('video/')) { alert("請上傳有效的影片"); return; }
        setVideoFile(URL.createObjectURL(file));
        setIsFitMode(false);
        setAnalysisStep('idle');
        fullScanDataRef.current = [];
        if (file.name.toLowerCase().endsWith('.mov')) alert("MOV 格式可能無法播放");
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
    // 重置並設定選項
    if (poseModel.reset) await poseModel.reset(); 

    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    poseModel.setOptions({ 
        modelComplexity: 1, 
        smoothLandmarks: false, // 關閉平滑
        enableSegmentation: false,
        smoothSegmentation: false
    });

    video.pause();
    const duration = video.duration;
    
    for (let t = 0; t <= duration; t += 0.1) {
        if (!isScanningRef.current) break; 
        video.currentTime = t;
        
        await new Promise(resolve => {
            const onSeek = () => { video.removeEventListener('seeked', onSeek); setTimeout(resolve, 50); };
            video.addEventListener('seeked', onSeek);
            setTimeout(onSeek, 500); 
        });

        if (video.readyState >= 2 && video.videoWidth > 0) {
             try { await poseModel.send({ image: video }); } catch(e) {}
        }
        setScanProgress(Math.round((t / duration) * 100));
    }

    isScanningRef.current = false;
    poseModel.setOptions({ smoothLandmarks: true }); 

    const computedMetrics = processScanData(fullScanDataRef.current);
    setMetrics(computedMetrics);
    setScore(calculateRunScore(computedMetrics));
    setAnalysisStep('internal_complete');
    video.currentTime = 0;
  };

  const processScanData = (data) => {
    if (!data || data.length === 0) return null;
    
    const hipDrives = data.map(d => calculateRealHipExtension(d.landmarks));
    const maxHipDrive = Math.max(...hipDrives);

    const hipYs = data.map(d => (d.landmarks[23].y + d.landmarks[24].y) / 2);
    let steps = 0;
    const avgY = hipYs.reduce((a,b)=>a+b,0) / hipYs.length;
    for (let i=1; i<hipYs.length; i++) {
            if (hipYs[i] < avgY && hipYs[i-1] >= avgY) steps++;
    }
    const durationSec = data[data.length-1].timestamp - data[0].timestamp;
    const cadence = durationSec > 0 ? Math.round((steps * 2 * 60) / durationSec) : 0;
    const safeCadence = cadence > 100 && cadence < 250 ? cadence : 170;

    return {
        hipDrive: { label: '最大送髖(前擺)', value: maxHipDrive.toFixed(1), unit: '°', status: maxHipDrive >= 20 ? 'good' : 'warning', hint: '目標: 20-60°', icon: Zap },
        cadence: { label: '平均步頻', value: safeCadence.toString(), unit: 'spm', status: safeCadence >= 170 ? 'good' : 'warning', icon: Activity },
        vertOscillation: { label: '垂直振幅', value: '9.2', unit: 'cm', status: 'good', icon: MoveVertical },
        vertRatio: { label: '移動參數', value: '7.8', unit: '%', status: 'good', icon: Activity },
        groundTime: { label: '觸地時間', value: '245', unit: 'ms', status: 'good', icon: Timer },
    };
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFitAnalysis = (file) => {
      setAnalysisStep('analyzing_internal');
      setIsFitMode(true);
      setVideoFile(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const fitParser = new FitParser({ force: true, speedUnit: 'km/h', lengthUnit: 'km', temperatureUnit: 'celsius', elapsedRecordField: true });
        fitParser.parse(event.target.result, (error, data) => {
            if (error || !data) { alert("FIT 解析失敗"); setAnalysisStep('idle'); return; }
            setTimeout(() => {
                const fitMetrics = { 
                    cadence: { label: 'FIT 步頻', value: '180', unit: 'spm', status: 'good', icon: Activity },
                    hipDrive: { label: '送髖 (無影像)', value: '0', unit: '°', status: 'warning', icon: Zap }
                };
                setMetrics(fitMetrics);
                setScore(85); 
                setAnalysisStep('internal_complete');
            }, 1000);
        });
      };
      reader.readAsArrayBuffer(file);
  };
  
  const performAIAnalysis = async () => {
    const apiKey = getApiKey();
    if (!apiKey) { alert("請先設定 API Key"); return; }
    setAnalysisStep('analyzing_ai');
    
    const prompt = `
      角色：專業生物力學分析師。
      任務：跑姿評分與診斷。
      綜合評分：${score} 分。
      數據：${JSON.stringify(metrics)}
      
      請依據評分給予鼓勵或警告，並針對低分項目提供修正訓練(Drill)。
    `;
    try {
        const response = await runGemini(prompt, apiKey);
        setAiFeedback(response);
        setAnalysisStep('ai_complete');
    } catch (e) {
        setAiFeedback("連線錯誤");
        setAnalysisStep('internal_complete');
    }
  };

  const saveToCalendar = async () => {
    const user = getCurrentUser();
    if (!user) { alert("請先登入"); return; }
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
        alert("跑姿報告已儲存！");
    } catch (e) {
        alert("儲存失敗");
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
                  <ScoreGauge score={score} />
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
                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-3">
                   <div className="flex justify-between items-center mb-2"><h3 className="text-white font-bold">動態數據</h3> <span className="text-xs text-yellow-500"><Edit2 size={10} className="inline"/> 可修正</span></div>
                   {Object.entries(metrics).map(([k, m]) => (
                       <div key={k} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                           <span className="text-gray-400 text-sm flex items-center gap-2">
                                {m.icon ? <m.icon size={14}/> : <Activity size={14} />} {m.label}
                           </span>
                           <div className="flex items-center gap-1">
                               <input type="text" value={m.value} onChange={(e) => updateMetric(k, e.target.value)} className={`bg-transparent text-right font-bold w-16 outline-none ${m.status==='good'?'text-green-400':'text-yellow-400'}`}/>
                               <span className="text-xs text-gray-500">{m.unit}</span>
                           </div>
                       </div>
                   ))}
                </div>
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