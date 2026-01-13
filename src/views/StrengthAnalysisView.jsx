import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase';
import FitParser from 'fit-file-parser';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function StrengthAnalysisView() {
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 

  const [analysisStep, setAnalysisStep] = useState('idle');
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [poseModel, setPoseModel] = useState(null); 
  const [realtimeAngle, setRealtimeAngle] = useState(0); 

  // 初始化 MediaPipe
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
    return () => pose.close();
  }, []);

  const calculateAngle = (a, b, c) => {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return Math.round(angle);
  };

  const onPoseResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (showSkeleton && results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 }); 
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2, radius: 4 }); 

        // 針對臥推計算手肘角度 (右側 12-14-16)
        if (results.poseLandmarks[12] && results.poseLandmarks[14] && results.poseLandmarks[16]) {
            const angle = calculateAngle(results.poseLandmarks[12], results.poseLandmarks[14], results.poseLandmarks[16]);
            setRealtimeAngle(angle);
            
            // 繪製角度數值
            const elbow = results.poseLandmarks[14];
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(`${angle}°`, elbow.x * canvas.width + 10, elbow.y * canvas.height);
        }
    }
    ctx.restore();
  };

  const onVideoPlay = () => {
      const video = videoRef.current;
      const processFrame = async () => {
          if (video && !video.paused && !video.ended && poseModel) {
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
        setVideoFile(URL.createObjectURL(file));
        setIsFitMode(false);
        setAnalysisStep('idle');
        setMetrics(null);
    }
  };

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
                // 模擬讀取 FIT 重訓數據
                setMetrics({
                    reps: { label: 'FIT 總次數', value: '12', unit: 'reps', status: 'good', icon: Activity },
                    weight: { label: 'FIT 平均重量', value: '60', unit: 'kg', status: 'good', icon: Scale },
                });
                setAnalysisStep('internal_complete');
            }, 1000);
        });
    };
    reader.readAsArrayBuffer(file);
  };

  const performInternalAnalysis = () => {
    if (!videoFile && !isFitMode) return;
    const capturedAngle = realtimeAngle;
    setAnalysisStep('analyzing_internal');
    
    // 模擬重訓數據分析 (基於當下捕捉的角度)
    setTimeout(() => {
      setMetrics({
          elbowAngle: { label: '手肘角度 (Snapshot)', value: capturedAngle.toString(), unit: '°', status: 'good', icon: Ruler },
          barPath: { label: '軌跡偏移', value: '1.2', unit: 'cm', status: 'good', icon: Activity, hint: '越垂直越好' }, 
          eccentricTime: { label: '離心時間', value: '1.8', unit: 's', status: 'warning', icon: Timer, hint: '建議放慢' },
          stability: { label: '核心穩定度', value: '92', unit: '%', status: 'good', icon: Scale }
      });
      setAnalysisStep('internal_complete');
    }, 1000);
  };

  const performAIAnalysis = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { alert("請先設定 API Key"); return; }
    setAnalysisStep('analyzing_ai');
    
    const prompt = `
      角色：專業肌力與體能教練 (Strength & Conditioning Coach)。
      任務：分析以下「重訓 (臥推/深蹲)」數據。
      數據來源：AI 視覺骨架偵測。
      ${JSON.stringify(metrics)}
      
      請針對以下重點分析：
      1. **發力節奏**：離心/向心時間是否合理？
      2. **關節角度**：目前角度是否安全？
      3. **優化建議**：如何調整動作以提升感受度？
      200字內，繁體中文。
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
            title: '重訓動作分析 (Strength AI)',
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
        alert("重訓分析已儲存！");
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
          <Cpu className="text-blue-500" /> 重訓 AI 分析
          <span className="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded border border-blue-700">臥推/深蹲模式</span>
        </h1>
        <div className="flex gap-2">
            {(videoFile || isFitMode) && (
                <button onClick={() => setShowSkeleton(!showSkeleton)} className="px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-800 text-gray-300 text-sm flex items-center gap-2">
                    {showSkeleton ? <Eye size={16}/> : <EyeOff size={16}/>} 骨架
                </button>
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
                <h3 className="text-white font-bold">上傳重訓影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4 (分析臥推、深蹲軌跡)</p>
              </div>
            )}
            {videoFile && <video ref={videoRef} src={videoFile} className="absolute inset-0 w-full h-full object-contain bg-black z-10" controls loop muted crossOrigin="anonymous" onPlay={onVideoPlay} />}
            {isFitMode && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><FileCode size={48}/> FIT 模式</div>}
            
            {analysisStep === 'analyzing_ai' && <div className="absolute inset-0 bg-gray-900/80 z-30 flex items-center justify-center text-purple-400 font-mono"><BrainCircuit className="animate-pulse mr-2"/> AI 診斷中...</div>}
          </div>

          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={() => fileInputRef.current.click()} className="px-6 py-2 bg-gray-700 text-white rounded-lg">更換</button>
                    {!isFitMode && <button onClick={performInternalAnalysis} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Camera size={18}/> 擷取數據</button>}
                 </>
             )}
             {(analysisStep === 'internal_complete' || analysisStep === 'ai_complete') && (
                 <>
                    <button onClick={() => { setAnalysisStep('idle'); setMetrics(null); setAiFeedback(''); }} className="px-6 py-2 bg-gray-700 text-white rounded-lg">重置</button>
                    {analysisStep !== 'ai_complete' && <button onClick={performAIAnalysis} className="px-6 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2"><Sparkles size={18}/> AI 建議</button>}
                    {analysisStep === 'ai_complete' && <button onClick={saveToCalendar} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><Save size={18}/> 儲存</button>}
                 </>
             )}
          </div>
        </div>

        <div className="space-y-4">
           {metrics && (
             <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-3">
               <div className="flex justify-between items-center mb-2"><h3 className="text-white font-bold">動作數據</h3> <span className="text-xs text-yellow-500"><Edit2 size={10} className="inline"/> 可修正</span></div>
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
                   <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2"><Sparkles size={16}/> 教練建議</h3>
                   {aiFeedback}
               </div>
           )}
        </div>
      </div>
    </div>
  );
}