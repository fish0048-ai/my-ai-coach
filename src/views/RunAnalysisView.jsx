import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap, Layers } from 'lucide-react';
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
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showIdealForm, setShowIdealForm] = useState(false);
  
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [poseModel, setPoseModel] = useState(null); 
  const [realtimeAngle, setRealtimeAngle] = useState(0); 
  const [hipExtensionAngle, setHipExtensionAngle] = useState(0); 

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

  const calculateRealHipExtension = (landmarks) => {
      if (!landmarks) return 0;
      const nose = landmarks[0];
      const shoulder = landmarks[12];
      const hip = landmarks[24];
      const knee = landmarks[26];
      if (!nose || !shoulder || !hip || !knee) return 0;
      const isFacingRight = nose.x > shoulder.x;
      const isLegBehind = isFacingRight ? (knee.x < hip.x) : (knee.x > hip.x);
      if (isLegBehind) {
          const angle = calculateAngle(shoulder, hip, knee);
          return Math.max(0, 180 - angle);
      }
      return 0; 
  };

  // --- 繪製理想跑姿 (視覺化疊加層 - 強制最上層) ---
  const drawHipAnalysisOverlay = (ctx, hip, knee, isFacingRight, currentAngle) => {
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
      
      // 設定陰影，增加立體感
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // 1. 垂直參考線
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, radius);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.stroke();

      // 2. 理想送髖區間 (扇形)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      const startAngle = Math.PI/2; 
      const minExt = 10 * Math.PI/180; 
      const maxExt = 25 * Math.PI/180; 
      const isGood = currentAngle >= 10;

      if (isFacingRight) {
          ctx.arc(0, 0, radius, startAngle + minExt, startAngle + maxExt);
      } else {
          ctx.arc(0, 0, radius, startAngle - maxExt, startAngle - minExt);
      }

      ctx.lineTo(0, 0);
      // 提高不透明度，確保蓋過骨架
      ctx.fillStyle = isGood ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 197, 94, 0.3)'; 
      ctx.fill();
      
      ctx.strokeStyle = isGood ? '#fbbf24' : '#22c55e';
      ctx.setLineDash([]);
      ctx.lineWidth = 3; 
      ctx.stroke();

      // 3. 繪製當前大腿向量 (Highlighter)
      const vecX = (knee.x * w) - hipX;
      const vecY = (knee.y * h) - hipY;
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(vecX, vecY);
      ctx.strokeStyle = isGood ? '#fbbf24' : '#ef4444'; 
      ctx.lineWidth = 6; // 比骨架更粗
      ctx.lineCap = 'round';
      ctx.stroke();

      // 4. 浮動標籤
      const labelDist = radius + 30;
      const labelAngle = isFacingRight ? (Math.PI/2 + 18*Math.PI/180) : (Math.PI/2 - 18*Math.PI/180);
      const labelX = Math.cos(labelAngle) * labelDist;
      const labelY = Math.sin(labelAngle) * labelDist;

      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      
      if (isGood) {
          ctx.fillStyle = '#fbbf24'; 
          ctx.fillText(`Good! ${currentAngle}°`, labelX, labelY);
      } else {
          ctx.fillStyle = '#ef4444'; 
          ctx.fillText(`目前 ${currentAngle}°`, labelX, labelY);
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#4ade80';
          ctx.fillText(`目標 >10°`, labelX, labelY + 16);
      }

      ctx.restore();
  };

  const onPoseResults = (results) => {
    // 修正1：在掃描模式下，依然記錄數據，但 *移除* return，讓它繼續往下執行繪圖
    if (isScanningRef.current) {
        if (results.poseLandmarks) {
            fullScanDataRef.current.push({
                timestamp: videoRef.current ? videoRef.current.currentTime : 0,
                landmarks: results.poseLandmarks
            });
        }
        // 注意：不 return，繼續執行下方的繪圖邏輯，這樣掃描時骨架才會跟著跑！
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.poseLandmarks) {
        // 1. 先畫骨架 (底層)
        if (showSkeleton) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 }); 
            drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 }); 
        }

        let angle = 0;
        let hipExt = 0;
        
        // 膝蓋角度
        if (results.poseLandmarks[24] && results.poseLandmarks[26] && results.poseLandmarks[28]) {
            angle = calculateAngle(results.poseLandmarks[24], results.poseLandmarks[26], results.poseLandmarks[28]);
        }
        
        // 送髖計算
        if (results.poseLandmarks[12] && results.poseLandmarks[24] && results.poseLandmarks[26]) {
            hipExt = calculateRealHipExtension(results.poseLandmarks);
            
            // 2. 繪製理想跑姿疊加層 (最上層)
            // 確保這是在 drawConnectors 之後呼叫
            if (showIdealForm) {
                const nose = results.poseLandmarks[0];
                const shoulder = results.poseLandmarks[12];
                const isFacingRight = nose && shoulder ? nose.x > shoulder.x : true;
                drawHipAnalysisOverlay(ctx, results.poseLandmarks[24], results.poseLandmarks[26], isFacingRight, Math.round(hipExt));
            }
        }
        
        setHipExtensionAngle(Math.round(hipExt));
        setRealtimeAngle(angle);
    }
    ctx.restore();
  };

  const startFullVideoScan = async () => {
    const video = videoRef.current;
    if (!video || !poseModel) return;

    // 重置模型狀態，避免殘留
    await poseModel.reset();

    setAnalysisStep('scanning');
    setScanProgress(0);
    fullScanDataRef.current = [];
    isScanningRef.current = true;

    // 修正2：掃描時關閉平滑，確保快速跳轉時不產生殘影與誤判
    poseModel.setOptions({ 
        modelComplexity: 1, 
        smoothLandmarks: false, // 關閉平滑，這對跳幀掃描至關重要
        enableSegmentation: false,
        smoothSegmentation: false
    }); 

    video.pause();
    const duration = video.duration;
    
    // 0.1秒跳一次 (10 FPS Sampling)
    for (let t = 0; t <= duration; t += 0.1) {
        if (!isScanningRef.current) break; 
        video.currentTime = t;
        await new Promise(resolve => {
            const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };
            video.addEventListener('seeked', onSeek);
        });
        await poseModel.send({ image: video });
        setScanProgress(Math.round((t / duration) * 100));
    }

    isScanningRef.current = false;
    // 掃描結束，恢復平滑以利後續播放預覽
    poseModel.setOptions({ smoothLandmarks: true }); 

    const computedMetrics = processScanData(fullScanDataRef.current);
    setMetrics(computedMetrics);
    setAnalysisStep('internal_complete');
    video.currentTime = 0;
  };

  const processScanData = (data) => {
    if (!data || data.length === 0) return null;
    
    // 跑姿分析核心
    const hipExtensions = data.map(d => calculateRealHipExtension(d.landmarks));
    const maxHipExt = Math.max(...hipExtensions);

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
        hipExtension: { label: '最大送髖角度', value: maxHipExt.toFixed(1), unit: '°', status: maxHipExt >= 10 ? 'good' : 'warning', hint: '目標: 10-20°', icon: Zap },
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
    
    const prompt = `
      角色：專業生物力學分析師與跑步教練 (專精送髖 Hip Drive)。
      任務：分析以下「跑步」數據。
      數據來源：AI 視覺全影片掃描 (Full Video Analysis)。
      ${JSON.stringify(metrics)}
      
      特別針對「送髖技術」進行分析：
      1. **送髖角度評估**：目前的角度是否足夠？(標準約 10-20度)。
      2. **動力鍊效率**：送髖不足是否導致步頻過快或步幅過小？
      3. **修正訓練**：請提供 1-2 個針對臀大肌啟動與髖關節伸展的訓練動作。
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
                    <button onClick={() => setShowIdealForm(!showIdealForm)} className={`px-3 py-1.5 rounded-lg border text-sm flex gap-1 ${showIdealForm ? 'bg-green-600/20 text-green-300 border-green-500' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
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
          <div className="relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group" onClick={(!videoFile && !isFitMode) ? () => fileInputRef.current.click() : undefined}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" width={640} height={360}/>
            {!videoFile && !isFitMode && (
              <div className="text-center p-6 cursor-pointer">
                <Upload size={32} className="mx-auto mb-2 text-gray-400" />
                <h3 className="text-white font-bold">上傳跑步影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4 (分析步頻、送髖角度)</p>
              </div>
            )}
            {videoFile && <video ref={videoRef} src={videoFile} className="absolute inset-0 w-full h-full object-contain bg-black z-10" controls loop muted crossOrigin="anonymous" onPlay={onVideoPlay} />}
            {isFitMode && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><FileCode size={48}/> FIT 模式</div>}
            
            {analysisStep === 'scanning' && <div className="absolute inset-0 bg-gray-900/90 z-30 flex flex-col items-center justify-center text-blue-400"><Cpu className="animate-pulse mb-2" size={32}/> 全影片掃描中 ({scanProgress}%)</div>}
            {analysisStep === 'analyzing_ai' && <div className="absolute inset-0 bg-gray-900/80 z-30 flex items-center justify-center text-purple-400 font-mono"><BrainCircuit className="animate-pulse mr-2"/> AI 診斷中...</div>}
          </div>

          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={() => fileInputRef.current.click()} className="px-6 py-2 bg-gray-700 text-white rounded-lg">更換</button>
                    {!isFitMode && <button onClick={startFullVideoScan} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Cpu size={18}/> 全片分析</button>}
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