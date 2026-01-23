import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Camera, Activity, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, Timer, Ruler, Scale, Eye, EyeOff, FileCode, Zap, Dumbbell, Trophy, Loader, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { findStrengthAnalysis, upsertStrengthAnalysis } from '../services/analysisService';
import { handleError } from '../services/errorService';
// 引入 Hook
import { usePoseDetection } from '../hooks/usePoseDetection';
import { analyzeFormDeviations, generateFormCorrection } from '../services/ai/formCorrection';
import { generateStrengthAnalysisFeedback } from '../services/ai/analysisService';
import { analyzePoseAngle } from '../services/analysis/poseAnalysis';
import { calculateStrengthScore } from '../services/analysis/metricsCalculator';
import { initDrawingUtils, createStrengthPoseCallback } from '../services/analysis/poseDrawing';

// --- 評分組件 ---
const ScoreGauge = ({ score }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  let color = 'text-red-500';
  if (score >= 70) color = 'text-yellow-500';
  if (score >= 85) color = 'text-green-500';
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

export default function StrengthAnalysisView() {
  const [mode, setMode] = useState('bench'); 
  const [videoFile, setVideoFile] = useState(null); 
  const [isFitMode, setIsFitMode] = useState(false); 
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null); 
  const requestRef = useRef(null);

  const [analysisStep, setAnalysisStep] = useState('idle');
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  const showSkeletonRef = useRef(true);
  const modeRef = useRef('bench');

  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
    modeRef.current = mode;
  }, [showSkeleton, mode]);

  const [metrics, setMetrics] = useState(null);
  const [score, setScore] = useState(0);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [realtimeAngle, setRealtimeAngle] = useState(0);
  const [formCorrection, setFormCorrection] = useState(null);
  const [loadingCorrection, setLoadingCorrection] = useState(false);
  const [deviationAnalysis, setDeviationAnalysis] = useState(null); 

  // 延遲加載 MediaPipe 繪圖工具
  const [drawingUtils, setDrawingUtils] = useState(null);
  const [poseConnections, setPoseConnections] = useState(null);

  // --- MediaPipe Callback ---
  // 使用新的繪圖服務建立回調（使用 useMemo 確保依賴正確）
  const onPoseResults = useMemo(() => {
    if (drawingUtils && poseConnections) {
      return createStrengthPoseCallback({
        canvasRef,
        setRealtimeAngle,
        showSkeletonRef,
        modeRef,
        drawingUtils,
        poseConnections,
        analyzePoseAngle
      });
    }
    return () => {}; // 如果繪圖工具未載入，使用空函數
  }, [drawingUtils, poseConnections, analyzePoseAngle]);

  // 使用 Hook（延遲加載 MediaPipe）
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

  const onVideoPlay = () => {
      const video = videoRef.current;
      const processFrame = async () => {
          if (video && !video.paused && !video.ended && poseModel) {
              try { await poseModel.send({image: video}); } catch(e) {}
              if (videoRef.current && !videoRef.current.paused) { 
                  requestRef.current = requestAnimationFrame(processFrame);
              }
          }
      };
      processFrame();
  };

  useEffect(() => {
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); }
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.fit')) {
        await handleFitAnalysis(file);
    } else {
        setVideoFile(URL.createObjectURL(file));
        setIsFitMode(false);
        setAnalysisStep('idle');
        setMetrics(null);
        setScore(0);
        setAiFeedback('');
    }
  };

  const handleFitAnalysis = async (file) => {
    setAnalysisStep('analyzing_internal');
    setIsFitMode(true);
    setVideoFile(null);
    
    try {
      // 使用新的 FIT 解析服務
      const { extractFITMetrics } = await import('../services/import/fitParser');
      const fitMetrics = await extractFITMetrics(file, 'strength');
      
      // 添加 icon 屬性
      const metricsWithIcons = {
        reps: { ...fitMetrics.reps, icon: Activity },
        weight: { ...fitMetrics.weight, icon: Scale }
      };
      
      setMetrics(metricsWithIcons);
      setScore(80);
      setAnalysisStep('internal_complete');
    } catch (error) {
      handleError(error.message || "FIT 解析失敗", { context: 'StrengthAnalysisView', operation: 'handleFitAnalysis' });
      setAnalysisStep('idle');
    }
  };

  const performInternalAnalysis = () => {
    if (!videoFile && !isFitMode) return;
    const capturedAngle = realtimeAngle;
    setAnalysisStep('analyzing_internal');
    
    setTimeout(() => {
      let m = {};
      if (mode === 'bench') {
          m = {
              elbowAngle: { label: '手肘角度', value: capturedAngle.toString(), unit: '°', status: 'good', icon: Ruler },
              barPath: { label: '軌跡偏移', value: '1.2', unit: 'cm', status: 'good', icon: Activity }, 
              eccentricTime: { label: '離心時間', value: '1.8', unit: 's', status: 'warning', icon: Timer },
              stability: { label: '核心穩定度', value: '92', unit: '%', status: 'good', icon: Scale }
          };
      } else {
          m = {
              kneeAngle: { label: '膝蓋角度', value: capturedAngle.toString(), unit: '°', status: 'good', icon: Ruler },
              hipDepth: { label: '髖關節深度', value: '低', unit: '', status: 'good', icon: Activity },
              concentricTime: { label: '向心時間', value: '0.8', unit: 's', status: 'good', icon: Timer },
          };
      }
      setMetrics(m);
      const calculatedScore = calculateStrengthScore(m, mode);
      setScore(calculatedScore);
      
      // 分析動作偏差
      const deviations = analyzeFormDeviations(m, mode);
      setDeviationAnalysis(deviations);
      
      setAnalysisStep('internal_complete');
    }, 1000);
  };

  const performAIAnalysis = async () => {
    if (!metrics) {
      handleError("請先完成動作分析", { context: 'StrengthAnalysisView', operation: 'performAIAnalysis' });
      return;
    }
    setAnalysisStep('analyzing_ai');
    try {
      const feedback = await generateStrengthAnalysisFeedback({ mode, score, metrics });
      setAiFeedback(feedback);
      setAnalysisStep('ai_complete');
    } catch (e) {
      setAiFeedback("連線錯誤，請稍後再試。");
      setAnalysisStep('internal_complete');
    }
  };

  const getFormCorrection = async () => {
    if (!metrics || !deviationAnalysis) {
      handleError("請先完成動作分析", { context: 'StrengthAnalysisView', operation: 'getFormCorrection' });
      return;
    }

    setLoadingCorrection(true);
    try {
      const correction = await generateFormCorrection({
        metrics,
        deviationAnalysis,
        mode,
        score
      });
      setFormCorrection(correction);
    } catch (error) {
      // 錯誤已在服務中處理
    } finally {
      setLoadingCorrection(false);
    }
  };

  const saveToCalendar = async () => {
    const user = getCurrentUser();
    if (!user) { 
      handleError("請先登入", { context: 'StrengthAnalysisView', operation: 'saveToCalendar' }); 
      return; 
    }
    setIsSaving(true);
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const title = `重訓分析 (${mode === 'bench' ? '臥推' : '深蹲'})`;

        const existing = await findStrengthAnalysis(dateStr, title);
        let shouldSave = true;
        let docId = null;

        if (existing) {
            if (confirm(`今天已有「${title}」。要覆蓋嗎？`)) {
                docId = existing.id;
            } else {
                shouldSave = false;
            }
        }

        if (shouldSave) {
            const analysisEntry = {
                date: dateStr,
                type: 'analysis',
                subType: 'strength_analysis',
                title: title,
                feedback: aiFeedback,
                metrics: metrics,     
                score: score, 
                status: 'completed',
                updatedAt: now.toISOString()
            };
            if (docId) await upsertStrengthAnalysis(docId, analysisEntry);
            else await upsertStrengthAnalysis(null, { ...analysisEntry, createdAt: now.toISOString() });
            // 成功訊息可選：使用 handleError 的 silent 模式或添加成功訊息機制
        }
    } catch (e) {
        handleError(e, { context: 'StrengthAnalysisView', operation: 'saveToCalendar' });
    } finally {
        setIsSaving(false);
    }
  };

  const updateMetric = (key, val) => {
      setMetrics(prev => {
          const newMetrics = {...prev, [key]: {...prev[key], value: val}};
          setScore(calculateStrengthScore(newMetrics, mode));
          return newMetrics;
      });
  };

  const clearAll = () => { setAnalysisStep('idle'); setMetrics(null); setScore(0); setAiFeedback(''); setVideoFile(null); setIsFitMode(false); };

  return (
    <div className="space-y-6 animate-fadeIn">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*, .fit" className="hidden" />
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="text-blue-500" /> 重訓 AI 分析
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
                <p className="text-gray-500 text-sm">支援 .mp4 (分析關節角度與軌跡)</p>
              </div>
            )}
            {videoFile && <video ref={videoRef} src={videoFile} className="absolute inset-0 w-full h-full object-contain bg-black z-10" controls loop muted playsInline crossOrigin="anonymous" onPlay={onVideoPlay} />}
            {isFitMode && <div className="absolute inset-0 flex items-center justify-center text-gray-500"><FileCode size={48}/> FIT 模式</div>}
            {(analysisStep === 'analyzing_internal' || analysisStep === 'analyzing_ai') && <div className="absolute inset-0 bg-gray-900/80 z-30 flex items-center justify-center text-purple-400 font-mono"><BrainCircuit className="animate-pulse mr-2"/> AI 分析中...</div>}
          </div>

          {/* 隱私保護宣告 */}
          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">隱私保護</p>
                <p>您的動作分析影片僅在本地運算，不會儲存於雲端。MediaPipe 分析在您的裝置上完成，影片不會上傳至任何伺服器。</p>
                <p className="mt-2 text-xs text-blue-300">僅當使用 AI 深度分析時，會上傳截圖至 Gemini API（可選功能）。</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
             {(videoFile || isFitMode) && analysisStep === 'idle' && (
                 <>
                    <button onClick={() => fileInputRef.current.click()} className="px-6 py-2 bg-gray-700 text-white rounded-lg">更換</button>
                    {!isFitMode && <button onClick={performInternalAnalysis} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"><Camera size={18}/> 擷取資料</button>}
                 </>
             )}
             {(analysisStep === 'internal_complete' || analysisStep === 'ai_complete') && (
                 <>
                    <button onClick={clearAll} className="px-6 py-2 bg-gray-700 text-white rounded-lg">重置</button>
                    {analysisStep !== 'ai_complete' && <button onClick={performAIAnalysis} className="px-6 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2"><Sparkles size={18}/> AI 建議</button>}
                    {analysisStep === 'ai_complete' && <button onClick={saveToCalendar} disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><Save size={18}/> 儲存</button>}
                 </>
             )}
          </div>
        </div>

        <div className="space-y-4">
           {metrics && (
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                  <div>
                      <h3 className="text-white font-bold flex items-center gap-2"><Trophy className="text-yellow-400"/> 動作評分</h3>
                  </div>
                  <ScoreGauge score={score} />
              </div>
           )}

           {videoFile && !metrics && (
             <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 text-center">
                 <div className="text-4xl font-bold text-white font-mono">{realtimeAngle}°</div>
                 <div className="text-sm text-gray-400">即時關節角度</div>
             </div>
           )}

           {metrics && (
             <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-3">
               <div className="flex justify-between items-center mb-2"><h3 className="text-white font-bold">動作資料</h3> <span className="text-xs text-yellow-500"><Edit2 size={10} className="inline"/> 可修正</span></div>
               {Object.entries(metrics).map(([k, m]) => (
                   <div key={k} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
                       <span className="text-gray-400 text-sm flex items-center gap-2">
                            {m.icon && <m.icon size={14}/>} {m.label}
                       </span>
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

           {/* 動作偏差分析 */}
           {deviationAnalysis && deviationAnalysis.hasIssues && (
             <div className="bg-yellow-900/20 p-5 rounded-xl border border-yellow-700/50">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-white font-bold flex items-center gap-2">
                   <AlertCircle className="text-yellow-400"/> 動作偏差檢測
                 </h3>
                 <span className={`text-xs px-2 py-1 rounded ${
                   deviationAnalysis.overallSeverity === 'severe' ? 'bg-red-900/50 text-red-400' :
                   deviationAnalysis.overallSeverity === 'moderate' ? 'bg-yellow-900/50 text-yellow-400' :
                   'bg-blue-900/50 text-blue-400'
                 }`}>
                   {deviationAnalysis.overallSeverity === 'severe' ? '嚴重' :
                    deviationAnalysis.overallSeverity === 'moderate' ? '中等' : '輕微'}
                 </span>
               </div>
               <div className="space-y-2 mb-3">
                 {Object.entries(deviationAnalysis.deviations).map(([key, dev]) => {
                   if (!dev || dev.severity === 'none') return null;
                   return (
                     <div key={key} className="bg-gray-900/50 p-2 rounded border border-gray-700">
                       <div className="flex justify-between items-center">
                         <span className="text-xs text-gray-400">{metrics[key]?.label || key}</span>
                         <span className={`text-xs ${
                           dev.severity === 'severe' ? 'text-red-400' :
                           dev.severity === 'moderate' ? 'text-yellow-400' : 'text-blue-400'
                         }`}>
                           偏差 {dev.deviation.toFixed(1)}{key.includes('Angle') ? '°' : key.includes('Time') ? '秒' : 'cm'}
                         </span>
                       </div>
                     </div>
                   );
                 })}
               </div>
               <button
                 onClick={getFormCorrection}
                 disabled={loadingCorrection}
                 className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
               >
                 {loadingCorrection ? (
                   <>
                     <Loader size={16} className="animate-spin"/>
                     <span>分析中...</span>
                   </>
                 ) : (
                   <>
                     <Zap size={16}/>
                     <span>獲取糾正建議</span>
                   </>
                 )}
               </button>
             </div>
           )}

           {/* 動作糾正建議 */}
           {formCorrection && (
             <div className="bg-blue-900/20 p-5 rounded-xl border border-blue-700/50 space-y-4">
               <h3 className="text-white font-bold flex items-center gap-2">
                 <Zap className="text-blue-400"/> 動作糾正建議
               </h3>

               {/* 具體糾正建議 */}
               {formCorrection.corrections && formCorrection.corrections.length > 0 && (
                 <div>
                   <p className="text-xs text-gray-400 mb-2">糾正要點</p>
                   <ul className="space-y-1">
                     {formCorrection.corrections.map((correction, idx) => (
                       <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                         <span className="text-blue-400 mt-1">•</span>
                         <span>{correction}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}

               {/* 糾正訓練動作 */}
               {formCorrection.correctiveExercises && formCorrection.correctiveExercises.length > 0 && (
                 <div>
                   <p className="text-xs text-gray-400 mb-2">推薦糾正訓練</p>
                   <div className="space-y-2">
                     {formCorrection.correctiveExercises.map((exercise, idx) => (
                       <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                         <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-semibold text-white">{exercise.name}</p>
                           <span className="text-xs text-blue-400">{exercise.sets}組 × {exercise.reps}次</span>
                         </div>
                         <p className="text-xs text-gray-400 mb-1">{exercise.description}</p>
                         <p className="text-xs text-yellow-400">重點：{exercise.focus}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* 訓練計劃建議 */}
               {formCorrection.trainingPlan && (
                 <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                   <p className="text-xs text-gray-400 mb-1">訓練計劃建議</p>
                   <p className="text-sm text-gray-300">{formCorrection.trainingPlan}</p>
                 </div>
               )}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}