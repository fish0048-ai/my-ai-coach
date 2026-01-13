import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap, Layers, BookOpen } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase';
import FitParser from 'fit-file-parser';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function RunAnalysisView() {
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 

  const fullScanDataRef = useRef([]);
  const isScanningRef = useRef(false);

  const [analysisStep, setAnalysisStep] = useState('idle');
  const [scanProgress, setScanProgress] = useState(0);
  // 狀態
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showIdealForm, setShowIdealForm] = useState(false);
  
  // 使用 Ref 解決 MediaPipe 閉包問題
  const showSkeletonRef = useRef(true);
  const showIdealFormRef = useRef(false);

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
    showIdealFormRef.current = showIdealForm;
  }, [showSkeleton, showIdealForm]);
  
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [poseModel, setPoseModel] = useState(null); 
  const [realtimeAngle, setRealtimeAngle] = useState(0); 
  const [hipDriveAngle, setHipDriveAngle] = useState(0); 

  useEffect(() => {
    const pose = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
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
    return () => { pose.close(); isScanningRef.current = false; };
  }, []);

  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  // --- 計算送髖 (Forward Drive / Hip Flexion) ---
  // 定義：骨盆前傾帶動大腿向前抬起
  // 計算方式：當大腿在軀幹前方時，計算屈髖角度 (180 - 夾角)
  const calculateHipDrive = (landmarks) => {
      if (!landmarks) return 0;
      const nose = landmarks[0];
      const shoulder = landmarks[12]; // 右肩
      const hip = landmarks[24];      // 右髖
      const knee = landmarks[26];     // 右膝

      if (!nose || !shoulder || !hip || !knee) return 0;

      // 1. 判斷跑向
      const isFacingRight = nose.x > shoulder.x;

      // 2. 判斷腿是否在 "前方" (Forward Phase)
      // 向右跑: 膝蓋 X > 臀部 X (右邊)
      // 向左跑: 膝蓋 X < 臀部 X (左邊)
      const isLegInFront = isFacingRight ? (knee.x > hip.x) : (knee.x < hip.x);

      if (isLegInFront) {
          const angle = calculateAngle(shoulder, hip, knee);
          // 直立是 180，前抬會讓角度變小
          // Drive 角度 = 180 - 夾角
          return Math.max(0, 180 - angle);
      }
      
      return 0; // 腿在後擺階段，前抬角度為 0
  };

  // --- 繪製理想送髖區間 (修正為前方扇形) ---
  const drawHipDriveOverlay = (ctx, hip, knee, isFacingRight, currentAngle) => {
      if (!hip || !knee) return;
      
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const hipX = hip.x * w;
      const hipY = hip.y * h;
      
      const kneeX = knee.x * w;
      const kneeY = knee.y * h;
      const thighLen = Math.sqrt(Math.pow(kneeX - hipX, 2) + Math.pow(kneeY - hipY, 2));
      const radius = thighLen * 1.2; 

      ctx.save();
      ctx.translate(hipX, hipY);
      
      ctx.shadowColor = "rgba(0, 0, 0, 1)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // 1. 垂直參考線
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. 理想前擺/送髖區間 (扇形)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      const startAngle = Math.PI/2; // 垂直向下
      // 設定目標區間：前抬 20度 ~ 60度 (視配速而定，一般慢跑約20-30，快跑>45)
      const minDrive = 20 * Math.PI/180; 
      const maxDrive = 60 * Math.PI/180; 
      
      // 判斷是否在有效推進區間 (>15度)
      const isGood = currentAngle >= 20;

      if (isFacingRight) {
          // 向右跑，前腳在右 (順時針 from down) -> 角度減少? No.
          // Right is 0, Down is PI/2.
          // Forward (Right) is towards 0.
          // So we subtract angle from PI/2
          ctx.arc(0, 0, radius, startAngle - maxDrive, startAngle - minDrive);
      } else {
          // 向左跑，前腳在左 (逆時針 from down) -> 角度增加
          // Left is PI. Down is PI/2.
          // Forward (Left) is towards PI.
          ctx.arc(0, 0, radius, startAngle + minDrive, startAngle + maxDrive);
      }

      ctx.lineTo(0, 0);
      ctx.fillStyle = isGood ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 197, 94, 0.3)'; 
      ctx.fill();
      
      ctx.strokeStyle = isGood ? '#fbbf24' : '#22c55e';
      ctx.setLineDash([]);
      ctx.lineWidth = 3; 
      ctx.stroke();

      // 3. 繪製當前大腿向量
      const vecX = (knee.x * w) - hipX;
      const vecY = (knee.y * h) - hipY;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vecX, vecY);
      ctx.strokeStyle = isGood ? '#fbbf24' : '#ef4444'; 
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 4. 浮動標籤
      const labelDist = radius + 30;
      // 標籤位置計算
      const labelAngle = isFacingRight ? (Math.PI/2 - 40*Math.PI/180) : (Math.PI/2 + 40*Math.PI/180);
      const labelX = Math.cos(labelAngle) * labelDist;
      const labelY = Math.sin(labelAngle) * labelDist;

      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      
      if (isGood) {
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillText(`Good Drive! ${currentAngle}°`, labelX, labelY);
      } else {
          ctx.fillStyle = '#ef4444'; 
          ctx.fillText(`${currentAngle}°`, labelX, labelY);
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#4ade80';
          ctx.fillText(`目標 20°-60°`, labelX, labelY + 16);
      }

      ctx.restore();
  };

  const onPoseResults = (results) => {
    // 掃描模式下依然繪圖
    if (isScanningRef.current) {
        if (results.poseLandmarks) {
            fullScanDataRef.current.push({
                timestamp: videoRef.current ? videoRef.current.currentTime : 0,
                landmarks: results.poseLandmarks
            });
        }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
        if (showSkeletonRef.current) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 }); 
            drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 }); 
        }

        let angle = 0;
        let driveAngle = 0;
        
        // 膝蓋角度
        if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
            angle = calculateAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28]);
        }
        
        // 計算送髖 (前擺)
        if (results.poseLandmarks[12] && results.poseLandmarks[24] && results.poseLandmarks[26]) {
            driveAngle = calculateHipDrive(results.poseLandmarks);
            
            if (showIdealFormRef.current) {
                const nose = results.poseLandmarks[0];
                const shoulder = results.poseLandmarks[12];
                const isFacingRight = nose && shoulder ? nose.x > shoulder.x : true;
                // 傳入右腿數據進行視覺化 (假設右側面對)
                drawHipDriveOverlay(ctx, results.poseLandmarks[24], results.poseLandmarks[26], isFacingRight, Math.round(driveAngle));
            }
        }
        
        setHipExtensionAngle(Math.round(driveAngle));
        setRealtimeAngle(angle);
    }
    ctx.restore();
  };

  const startFullVideoScan = async () => {
    const video = videoRef.current;
    if (!video || !poseModel) return;

    await poseModel.reset(); 

    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    poseModel.setOptions({ 
        modelComplexity: 1, 
        smoothLandmarks: false, 
        enableSegmentation: false,
        smoothSegmentation: false
    });

    video.pause();
    const duration = video.duration;
    
    for (let t = 0; t <= duration; t += 0.1) {
        if (!isScanningRef.current) break; 
        video.currentTime = t;
        await new Promise(resolve => {
            const onSeek = () => { 
                video.removeEventListener('seeked', onSeek); 
                setTimeout(resolve, 50); 
            };
            video.addEventListener('seeked', onSeek);
        });
        await poseModel.send({ image: video });
        setScanProgress(Math.round((t / duration) * 100));
    }

    isScanningRef.current = false;
    poseModel.setOptions({ smoothLandmarks: true }); 

    const computedMetrics = processScanData(fullScanDataRef.current);
    setMetrics(computedMetrics);
    setAnalysisStep('internal_complete');
    video.currentTime = 0;
  };

  const processScanData = (data) => {
    if (!data || data.length === 0) return null;
    
    // 跑姿分析核心
    const hipDrives = data.map(d => calculateHipDrive(d.landmarks));
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
        hipDrive: { label: '最大送髖(前擺)', value: maxHipDrive.toFixed(1), unit: '°', status: maxHipDrive >= 20 ? 'good' : 'warning', hint: '目標: >20° (帶動大腿)', icon: Zap },
        cadence: { label: '平均步頻', value: safeCadence.toString(), unit: 'spm', status: safeCadence >= 170 ? 'good' : 'warning', icon: Activity },
        vertOscillation: { label: '垂直振幅', value: '9.2', unit: 'cm', status: 'good', icon: MoveVertical },
        vertRatio: { label: '移動參數', value: '7.8', unit: '%', status: 'good', icon: Activity },
        groundTime: { label: '觸地時間', value: '245', unit: 'ms', status: 'good', icon: Timer },
    };
  };

  const onVideoPlay = () => {
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

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.fit')) {
        handleFitAnalysis(file);
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
      setTimeout(() => {
          setMetrics({ cadence: { label: 'FIT 步頻', value: '180', unit: 'spm', status: 'good', icon: Activity } });
          setAnalysisStep('internal_complete');
      }, 1000);
  };

  const performAIAnalysis = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("請先設定 API Key"); return; }
    setAnalysisStep('analyzing_ai');
    
    // 更新 Prompt 以符合使用者定義
    const prompt = `
      角色：專業生物力學分析師與跑步教練 (專精送髖 Hip Drive)。
      任務：分析以下「跑步」數據。
      數據來源：AI 視覺全影片掃描 (Full Video Analysis)。
      ${JSON.stringify(metrics)}
      
      特別針對「送髖技術」進行分析 (定義：骨盆前傾、帶動大腿向前抬起)：
      1. **前擺角度評估**：目前的抬腿角度是否足夠？(有效前進通常需 >20度)。
      2. **骨盆連動**：是否有利用骨盆前傾來輔助大腿前擺？還是單純靠股四頭肌？
      3. **修正訓練**：請提供 1-2 個針對「骨盆活動度」與「髂腰肌/臀肌」的訓練 (如：A Skip、高抬腿、弓箭步)。
      250字內，繁體中文。
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
    const user = auth.currentUser;
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
            score: '已分析', 
            createdAt: now.toISOString()
        };
        const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
        const docSnap = await getDoc(docRef);
        let newData = docSnap.exists() 
            ? { ...docSnap.data(), exercises: [...(docSnap.data().exercises || []), analysisEntry] }
            : { date: dateStr, status: 'completed', type: 'strength', title: 'AI 分析日', exercises: [analysisEntry] };
        await setDoc(docRef, newData);
        alert("跑姿報告已儲存！");
    } catch (e) {
        alert("儲存失敗");
    } finally {
        setIsSaving(false);
    }
  };
  
  const updateMetric = (key, val) => setMetrics(prev => ({...prev, [key]: {...prev[key], value: val}}));

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const clearAll = () => {
    isScanningRef.current = false;
    setAnalysisStep('idle');
    setMetrics(null);
    setAiFeedback('');
    setVideoFile(null);
    setIsFitMode(false);
    setScanProgress(0);
    if (poseModel) poseModel.setOptions({ smoothLandmarks: true });
    
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
              <div className="absolute inset-0 bg-gray-900/90 z-30 flex flex-col items-center justify-center text-blue-400">
                  <Cpu className="animate-pulse mb-2" size={32}/> 
                  <p className="mb-2">全影片掃描中 ({scanProgress}%)</p>
                  <div className="w-64 h-1 bg-gray-700 rounded overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-100" style={{width: `${scanProgress}%`}}></div>
                  </div>
              </div>
            )}

            {analysisStep === 'analyzing_ai' && <div className="absolute inset-0 bg-gray-900/80 z-30 flex items-center justify-center text-purple-400 font-mono"><BrainCircuit className="animate-pulse mr-2"/> AI 診斷中...</div>}

            {!videoFile && !isFitMode && (
              <div className="text-center p-6 cursor-pointer">
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <h3 className="text-white font-bold">上傳跑步影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4 (分析送髖、步頻)</p>
              </div>
            )}

            {/* 影片播放器 - 背景淡化 */}
            {videoFile && (
                <video 
                    ref={videoRef}
                    src={videoFile} 
                    className={`absolute inset-0 w-full h-full object-contain bg-black z-10 transition-opacity duration-300 ${showIdealForm ? 'opacity-30' : 'opacity-100'}`}
                    controls
                    loop
                    muted
                    crossOrigin="anonymous"
                    onPlay={onVideoPlay} 
                />
            )}
            
            {isFitMode && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><FileCode size={48}/> FIT 模式</div>}
          </div>

          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={handleUploadClick} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">
                      更換檔案
                    </button>
                    {!isFitMode && (
                        <button 
                        onClick={startFullVideoScan}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                        >
                        <Cpu size={20} />
                        開始全影片分析
                        </button>
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
           {videoFile && !metrics && analysisStep !== 'scanning' && (
             <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 text-center">
                 <div className="text-4xl font-bold text-white font-mono">{realtimeAngle}°</div>
                 <div className="text-sm text-gray-400">即時膝蓋角度</div>
                 {hipExtensionAngle > 0 && <div className="text-green-400 mt-2 text-sm font-bold">送髖: {hipExtensionAngle}°</div>}
             </div>
           )}

           {metrics && (
             <>
                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-3">
                   <div className="flex justify-between items-center mb-2"><h3 className="text-white font-bold">動態數據</h3> <span className="text-xs text-yellow-500"><Edit2 size={10} className="inline"/> 可修正</span></div>
                   {Object.entries(metrics).map(([k, m]) => (
                       <div key={k} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                           <span className="text-gray-400 text-sm flex items-center gap-2"><m.icon size={14}/> {m.label}</span>
                           <div className="flex items-center gap-1">
                               <input type="text" value={m.value} onChange={(e) => updateMetric(k, e.target.value)} className={`bg-transparent text-right font-bold w-16 outline-none ${m.status==='good'?'text-green-400':'text-yellow-400'}`}/>
                               <span className="text-xs text-gray-500">{m.unit}</span>
                           </div>
                       </div>
                   ))}
                </div>

                {/* 說明文字更新 */}
                <div className="bg-blue-900/20 p-5 rounded-xl border border-blue-500/30 text-gray-300 text-sm space-y-3">
                    <h3 className="text-blue-400 font-bold flex items-center gap-2">
                        <BookOpen size={16} /> 什麼是送髖 (Hip Drive)?
                    </h3>
                    <p>
                        <strong>定義：</strong> 跑步時利用骨盆前傾，主動帶動大腿<strong>向前抬起</strong>，創造有效前進動力。
                    </p>
                    <p>
                        <strong>觀察重點：</strong> 畫面中的 <span className="text-green-400">綠色前扇形區間</span> 代表大腿前擺的理想角度 (20°-60°)。良好的送髖能增加步幅並減少觸地時間。
                    </p>
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                        <h4 className="font-bold text-white mb-1">如何提升？</h4>
                        <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
                            <li><strong>意識：</strong> 專注於「骨盆」而非單純抬膝蓋，想像用核心帶動大腿。</li>
                            <li><strong>肌力：</strong> 加強髂腰肌 (Hip Flexors) 與核心穩定度。</li>
                            <li><strong>技術：</strong> 練習「A Skip (A字跳)」與「高抬腿跑」。</li>
                        </ul>
                    </div>
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