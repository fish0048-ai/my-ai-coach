import React, { useState, useRef } from 'react';
import { Camera, Activity, Play, RotateCcw, CheckCircle, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle, MoveVertical, Timer, Ruler, Scale } from 'lucide-react';
import { runGemini } from '../utils/gemini';
import { doc, getDoc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebase';

export default function AnalysisView() {
  const [mode, setMode] = useState('bench'); // 'bench' | 'run'
  const [videoFile, setVideoFile] = useState(null);
  const fileInputRef = useRef(null);

  // 狀態機：idle -> analyzing_internal -> internal_complete -> analyzing_ai -> ai_complete
  const [analysisStep, setAnalysisStep] = useState('idle');
  
  // 儲存數據 (改為可編輯狀態)
  const [metrics, setMetrics] = useState(null);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
        
        // 動態狀態判斷邏輯 (根據業界標準)
        if (key === 'cadence') {
            const val = parseInt(newValue);
            newMetrics[key].status = val >= 170 ? 'good' : 'warning';
        }
        if (key === 'verticalRatio') {
            const val = parseFloat(newValue);
            newMetrics[key].status = val <= 8.0 ? 'good' : 'warning'; // 優秀跑者通常 < 8%
        }
        if (key === 'balance') {
            // 檢查是否接近 50/50
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
    
    // 模擬電腦視覺運算 (提供初步估算值，鼓勵使用者根據穿戴裝置修正)
    setTimeout(() => {
      const result = mode === 'bench' ? {
          trajectory: { label: '槓鈴軌跡', value: '垂直', unit: '', status: 'good', icon: Activity },
          velocity: { label: '離心速度', value: '2.5', unit: '秒', status: 'good', icon: Timer },
          elbowAngle: { label: '手肘角度', value: '78', unit: '°', status: 'warning', hint: '建議收至 45-75°', icon: Ruler },
          stability: { label: '推舉穩定度', value: '92', unit: '%', status: 'good', icon: Scale }
      } : {
          // 跑步進階指標 (Garmin/Coros 標準)
          cadence: { label: '步頻 (Cadence)', value: '165', unit: 'spm', status: 'warning', hint: '目標: 170+ spm', icon: Activity },
          strideLength: { label: '步幅 (Stride)', value: '1.10', unit: 'm', status: 'good', hint: '依身高而定', icon: Ruler },
          verticalOscillation: { label: '垂直振幅', value: '9.8', unit: 'cm', status: 'warning', hint: '越低越省力', icon: MoveVertical },
          verticalRatio: { label: '移動參數', value: '8.9', unit: '%', status: 'warning', hint: '目標: < 8.0%', icon: Activity },
          groundTime: { label: '觸地時間', value: '255', unit: 'ms', status: 'good', hint: '菁英 < 210ms', icon: Timer },
          balance: { label: '觸地平衡 (左/右)', value: '49.5/50.5', unit: '%', status: 'good', hint: '差距需 < 2%', icon: Scale }
      };
      
      setMetrics(result);
      setAnalysisStep('internal_complete');
    }, 2000);
  };

  const performAIAnalysis = async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert("請先在右下角的 AI 教練聊天室中設定您的 API Key！");
        return;
    }
    
    setAnalysisStep('analyzing_ai');

    // 傳送給 AI 的是「修正後」的 metrics
    const prompt = `
      角色：專業生物力學分析師與跑步教練 (Garmin Running Dynamics 專家)。
      任務：分析以下「${mode === 'bench' ? '臥推' : '跑步'}」數據。
      注意：這些數據已經過使用者校正 (Data Validated)。
      
      [生物力學數據]
      ${JSON.stringify(metrics)}
      
      請提供專業診斷：
      1. **總體評分** (1-10分，請嚴格給分)。
      2. **關鍵問題**：針對 "warning" 的項目 (如移動參數、垂直振幅)，解釋其物理意義與影響 (例如：垂直振幅過高代表推蹬過度，浪費能量)。
      3. **修正訓練**：給出一個具體的 Drill (例如：A字跳、高步頻小碎步) 來改善上述問題。
      4. **受傷風險評估**：根據觸地平衡與觸地時間，評估潛在風險。
      
      回答限制：繁體中文，專業術語請保留英文 (如 Vertical Ratio)，250字內。
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
            title: mode === 'bench' ? '臥推 AI 分析報告' : '跑步跑姿分析 (Running Dynamics)',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：影片預覽 */}
        <div className="lg:col-span-2 space-y-4">
          <div 
            className={`relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group ${!videoFile && 'cursor-pointer hover:border-blue-500 hover:bg-gray-800'}`}
            onClick={!videoFile ? handleUploadClick : undefined}
          >
            {analysisStep === 'analyzing_internal' && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <Cpu size={48} className="text-blue-500 animate-pulse mb-4" />
                <p className="text-blue-400 font-mono">正在計算動態參數 (Vertical Ratio)...</p>
                <div className="w-48 h-1 bg-gray-700 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-progress"></div>
                </div>
              </div>
            )}

            {analysisStep === 'analyzing_ai' && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
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
                            {/* 狀態條 */}
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