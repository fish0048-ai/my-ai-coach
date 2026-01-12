import React, { useState, useRef, useEffect } from 'react';
import { Camera, Activity, Play, RotateCcw, CheckCircle, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale, Eye, EyeOff } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase';

export default function AnalysisView() {
  const [mode, setMode] = useState('bench'); // 'bench' | 'run'
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null); // 新增：Canvas 參照

  // 狀態機：idle -> analyzing_internal -> internal_complete -> analyzing_ai -> ai_complete
  const [analysisStep, setAnalysisStep] = useState('idle');
  const [showSkeleton, setShowSkeleton] = useState(true); // 新增：控制是否顯示骨架
  
  // 儲存數據 (改為可編輯狀態)
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- 骨架繪製邏輯 ---
  useEffect(() => {
    let animationFrameId;
    
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas || !showSkeleton || !videoFile) return;
      
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const time = Date.now() / 1000; // 用於動畫的時間參數

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 定義繪製節點的輔助函式
      const drawPoint = (x, y, color = '#3b82f6') => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      };

      const drawBone = (x1, y1, x2, y2, color = 'rgba(59, 130, 246, 0.8)') => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.stroke();
      };

      // 根據模式產生骨架座標 (模擬)
      let joints = {};

      if (mode === 'bench') {
        // 臥推姿勢 (側面/斜側面)
        // 模擬推舉動作：手臂位置隨時間上下移動
        const liftPhase = Math.sin(time * 2); // -1 to 1
        const armY = 150 + liftPhase * 30; 

        joints = {
            head: { x: width * 0.3, y: height * 0.4 },
            neck: { x: width * 0.35, y: height * 0.45 },
            shoulder: { x: width * 0.4, y: height * 0.5 },
            elbow: { x: width * 0.5, y: armY }, // 手肘動態
            wrist: { x: width * 0.55, y: armY - 40 }, // 手腕跟隨
            hip: { x: width * 0.5, y: height * 0.6 },
            knee: { x: width * 0.7, y: height * 0.55 },
            ankle: { x: width * 0.8, y: height * 0.7 }
        };
      } else {
        // 跑步姿勢 (側面)
        // 模擬跑步擺動
        const legPhase = Math.sin(time * 5);
        
        joints = {
            head: { x: width * 0.5, y: height * 0.2 },
            neck: { x: width * 0.5, y: height * 0.25 },
            shoulder: { x: width * 0.5, y: height * 0.3 },
            elbow: { x: width * 0.55 + legPhase * 10, y: height * 0.45 }, // 手臂擺動
            wrist: { x: width * 0.6 + legPhase * 20, y: height * 0.4 },
            hip: { x: width * 0.5, y: height * 0.5 },
            // 左腳 (支撐/擺盪)
            kneeL: { x: width * 0.5 + legPhase * 20, y: height * 0.7 },
            ankleL: { x: width * 0.5 + legPhase * 40, y: height * 0.9 },
            // 右腳 (反向)
            kneeR: { x: width * 0.5 - legPhase * 20, y: height * 0.65 },
            ankleR: { x: width * 0.45 - legPhase * 30, y: height * 0.85 }
        };
      }

      // 繪製骨骼連線
      if (mode === 'bench') {
          drawBone(joints.head.x, joints.head.y, joints.neck.x, joints.neck.y);
          drawBone(joints.neck.x, joints.neck.y, joints.shoulder.x, joints.shoulder.y);
          drawBone(joints.shoulder.x, joints.shoulder.y, joints.elbow.x, joints.elbow.y);
          drawBone(joints.elbow.x, joints.elbow.y, joints.wrist.x, joints.wrist.y);
          drawBone(joints.neck.x, joints.neck.y, joints.hip.x, joints.hip.y);
          drawBone(joints.hip.x, joints.hip.y, joints.knee.x, joints.knee.y);
          drawBone(joints.knee.x, joints.knee.y, joints.ankle.x, joints.ankle.y);
      } else {
          drawBone(joints.head.x, joints.head.y, joints.neck.x, joints.neck.y);
          drawBone(joints.neck.x, joints.neck.y, joints.shoulder.x, joints.shoulder.y);
          drawBone(joints.shoulder.x, joints.shoulder.y, joints.elbow.x, joints.elbow.y);
          drawBone(joints.elbow.x, joints.elbow.y, joints.wrist.x, joints.wrist.y);
          drawBone(joints.neck.x, joints.neck.y, joints.hip.x, joints.hip.y);
          // Left Leg
          drawBone(joints.hip.x, joints.hip.y, joints.kneeL.x, joints.kneeL.y, '#3b82f6');
          drawBone(joints.kneeL.x, joints.kneeL.y, joints.ankleL.x, joints.ankleL.y, '#3b82f6');
          // Right Leg
          drawBone(joints.hip.x, joints.hip.y, joints.kneeR.x, joints.kneeR.y, '#10b981'); // 綠色區分右腳
          drawBone(joints.kneeR.x, joints.kneeR.y, joints.ankleR.x, joints.ankleR.y, '#10b981');
      }

      // 繪製節點 (最後畫，蓋在線上)
      Object.values(joints).forEach(j => drawPoint(j.x, j.y, analysisStep === 'analyzing_internal' ? '#fbbf24' : '#ef4444'));

      animationFrameId = requestAnimationFrame(draw);
    };

    if (showSkeleton && videoFile) {
        draw();
    } else {
        // 清空 Canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [showSkeleton, videoFile, mode, analysisStep]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file));
      resetAnalysis();
    }
  };

  // 輔助：更新特定指標數值
  const updateMetric = (key, newValue) => {
    setMetrics(prev => {
        const newMetrics = { ...prev };
        newMetrics[key] = { ...newMetrics[key], value: newValue };
        
        if (key === 'cadence') {
            const val = parseInt(newValue);
            newMetrics[key].status = val >= 170 ? 'good' : 'warning';
        }
        if (key === 'verticalRatio') {
            const val = parseFloat(newValue);
            newMetrics[key].status = val <= 8.0 ? 'good' : 'warning';
        }
        if (key === 'balance') {
            const left = parseFloat(newValue.split('/')[0]) || 50;
            const diff = Math.abs(left - 50);
            newMetrics[key].status = diff <= 1.5 ? 'good' : 'warning';
        }
        
        return newMetrics;
    });
  };

  const performInternalAnalysis = () => {
    if (!videoFile) {
        alert("請先上傳影片！");
        return;
    }
    setAnalysisStep('analyzing_internal');
    
    // 模擬電腦視覺運算
    setTimeout(() => {
      const result = mode === 'bench' ? {
          trajectory: { label: '槓鈴軌跡', value: '垂直', unit: '', status: 'good', icon: Activity },
          velocity: { label: '離心速度', value: '2.5', unit: '秒', status: 'good', icon: Timer },
          elbowAngle: { label: '手肘角度', value: '78', unit: '°', status: 'warning', hint: '建議收至 45-75°', icon: Ruler },
          stability: { label: '推舉穩定度', value: '92', unit: '%', status: 'good', icon: Scale }
      } : {
          cadence: { label: '步頻 (Cadence)', value: '165', unit: 'spm', status: 'warning', hint: '目標: 170+ spm', icon: Activity },
          strideLength: { label: '步幅 (Stride)', value: '1.10', unit: 'm', status: 'good', hint: '依身高而定', icon: Ruler },
          verticalOscillation: { label: '垂直振幅', value: '9.8', unit: 'cm', status: 'warning', hint: '越低越省力', icon: MoveVertical },
          verticalRatio: { label: '移動參數', value: '8.9', unit: '%', status: 'warning', hint: '目標: < 8.0%', icon: Activity },
          groundTime: { label: '觸地時間', value: '255', unit: 'ms', status: 'good', hint: '菁英 < 210ms', icon: Timer },
          balance: { label: '觸地平衡 (左/右)', value: '49.5/50.5', unit: '%', status: 'good', hint: '差距需 < 2%', icon: Scale }
      };
      
      setMetrics(result);
      setAnalysisStep('internal_complete');
    }, 2500); // 稍微延長時間讓使用者看到骨架掃描效果
  };

  const performAIAnalysis = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("請先在右下角的 AI 教練聊天室中設定您的 API Key！");
        return;
    }
    
    setAnalysisStep('analyzing_ai');

    const prompt = `
      角色：專業生物力學分析師與跑步教練。
      任務：分析以下「${mode === 'bench' ? '臥推' : '跑步'}」數據。
      注意：這些數據已經過使用者校正 (Data Validated)。
      
      [生物力學數據]
      ${JSON.stringify(metrics)}
      
      請提供專業診斷：
      1. **總體評分** (1-10分，請嚴格給分)。
      2. **關鍵問題**：針對 "warning" 的項目，解釋其物理意義與影響。
      3. **修正訓練**：給出一個具體的 Drill 來改善上述問題。
      4. **受傷風險評估**：根據數據評估潛在風險。
      
      回答限制：繁體中文，專業術語請保留英文，250字內。
    `;

    try {
        const response = await runGemini(prompt, apiKey);
        setAiFeedback(response);
        setAnalysisStep('ai_complete');
    } catch (error) {
        console.error(error);
        setAiFeedback("連線逾時或 API Key 無效，無法取得 AI 建議。");
        setAnalysisStep('internal_complete');
    }
  };

  const saveToCalendar = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("請先登入");
        return;
    }

    setIsSaving(true);
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        const analysisEntry = {
            id: Date.now().toString(),
            type: 'analysis',
            title: mode === 'bench' ? '臥推 AI 分析報告' : '跑步跑姿分析',
            feedback: aiFeedback,
            metrics: metrics,     
            score: '已分析', 
            createdAt: now.toISOString()
        };

        const docRef = doc(db, 'users', user.uid, 'calendar', dateStr);
        const docSnap = await getDoc(docRef);

        let newData;
        if (docSnap.exists()) {
            const existingData = docSnap.data();
            const currentExercises = existingData.exercises || [];
            newData = {
                ...existingData,
                exercises: [...currentExercises, analysisEntry],
                updatedAt: now.toISOString()
            };
        } else {
            newData = {
                date: dateStr,
                status: 'completed',
                type: 'strength', 
                title: '今日訓練與分析',
                exercises: [analysisEntry],
                updatedAt: now.toISOString()
            };
        }

        await setDoc(docRef, newData);
        alert("專業分析報告已上傳！");

    } catch (error) {
        console.error("儲存失敗:", error);
        alert("儲存失敗，請稍後再試。");
    } finally {
        setIsSaving(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisStep('idle');
    setMetrics(null);
    setAiFeedback('');
  };

  const clearAll = () => {
    resetAnalysis();
    setVideoFile(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        accept="video/*" 
        className="hidden" 
      />

      {/* 頂部標題與切換 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Camera className="text-blue-500" />
          動作分析校正
          <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">
            人機協作 (Running Dynamics)
          </span>
        </h1>
        
        <div className="flex items-center gap-4">
            {/* 骨架顯示開關 */}
            {videoFile && (
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
        {/* 左側：影片預覽 */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            className={`relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group ${!videoFile && 'cursor-pointer hover:border-blue-500 hover:bg-gray-800'}`}
            onClick={!videoFile ? handleUploadClick : undefined}
          >
            {/* 骨架 Canvas 層 (絕對定位覆蓋在影片上) */}
            <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                width={800} // 設定渲染解析度
                height={450}
            />

            {/* 分析中的遮罩 (改為半透明，讓使用者看到骨架) */}
            {analysisStep === 'analyzing_internal' && (
              <div className="absolute top-4 left-0 right-0 flex justify-center z-20 pointer-events-none">
                  <div className="bg-gray-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-blue-500/50 flex items-center gap-2 shadow-xl animate-bounce">
                    <Cpu size={16} className="text-blue-400 animate-spin" />
                    <span className="text-blue-200 text-xs font-mono">正在提取關鍵點...</span>
                  </div>
              </div>
            )}

            {analysisStep === 'analyzing_ai' && (
               <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <BrainCircuit size={48} className="text-purple-500 animate-pulse mb-4" />
                <p className="text-purple-400 font-mono">AI 正在進行力學診斷...</p>
              </div>
            )}

            {!videoFile && (
              <div className="text-center p-6 transition-transform group-hover:scale-105">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700 group-hover:border-blue-500 group-hover:text-blue-500 text-gray-400 transition-colors">
                  <Upload size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">上傳訓練影片</h3>
                <p className="text-gray-500 text-sm">支援 .mp4, .mov (建議包含側面視角)</p>
              </div>
            )}

            {videoFile && (
                <video 
                    src={videoFile} 
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    controls={analysisStep === 'idle' || analysisStep.includes('complete')}
                    loop
                    muted 
                    autoPlay 
                />
            )}
          </div>

          {/* 控制按鈕區 */}
          <div className="flex flex-wrap justify-center gap-4 min-h-[50px]">
            {videoFile && analysisStep === 'idle' && (
              <>
                <button onClick={handleUploadClick} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all">
                  更換影片
                </button>
                <button 
                  onClick={performInternalAnalysis}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-105"
                >
                  <Cpu size={20} />
                  第一階段：影像分析
                </button>
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
                        儲存分析報告
                    </button>
                 )}
               </div>
            )}
          </div>
        </div>

        {/* 右側：數據面板 (可編輯) */}
        <div className="space-y-4">
          <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 transition-all duration-500 ${metrics ? 'opacity-100 translate-x-0' : 'opacity-50 translate-x-4'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                <Activity size={18} className="text-blue-400" />
                動態數據 (點擊數值修正)
                </h3>
                {analysisStep === 'internal_complete' && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1 animate-pulse">
                        <Edit2 size={10} /> 與手錶不符請修改
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
              <div className="h-48 flex flex-col items-center justify-center text-gray-500 space-y-2 border-2 border-dashed border-gray-700 rounded-lg">
                <Cpu size={32} className="opacity-30" />
                <span className="text-sm">等待影像分析...</span>
              </div>
            )}
          </div>

          <div className={`bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl border border-purple-500/30 p-5 transition-all duration-500 ${aiFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {aiFeedback ? (
              <>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  AI 跑姿教練診斷
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