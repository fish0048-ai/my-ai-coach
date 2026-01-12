import React, { useState, useRef } from 'react';
import { Camera, Activity, Play, RotateCcw, CheckCircle, Upload, Cpu, Sparkles, BrainCircuit, Save, Edit2, AlertCircle } from 'lucide-react';
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
        
        // 簡單的動態狀態判斷邏輯 (可根據需求擴充)
        if (key === 'cadence') {
            const val = parseInt(newValue);
            if (val >= 170) newMetrics[key].status = 'good';
            else newMetrics[key].status = 'warning';
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
    
    // 模擬電腦視覺運算 (實際上這裡是模擬數據，因此開放使用者修正)
    setTimeout(() => {
      const result = mode === 'bench' ? {
          trajectory: { label: '槓鈴軌跡', value: '垂直', unit: '', status: 'good' },
          velocity: { label: '離心速度', value: '2.5', unit: '秒', status: 'good' },
          elbowAngle: { label: '手肘角度', value: '78', unit: '度', status: 'warning', hint: '建議 45-75 度' },
          stability: { label: '推舉穩定度', value: '92', unit: '%', status: 'good' }
      } : {
          // 預設模擬值 (使用者可修改)
          cadence: { label: '步頻 (Cadence)', value: '165', unit: 'spm', status: 'warning', hint: '目標: 170+ spm' },
          verticalOscillation: { label: '垂直振幅', value: '8.5', unit: 'cm', status: 'good', hint: '越低越好' },
          groundTime: { label: '觸地時間', value: '240', unit: 'ms', status: 'good', hint: '優秀跑者 < 200ms' },
          lean: { label: '軀幹前傾', value: '5', unit: '度', status: 'good', hint: '建議 5-10 度' }
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
      角色：專業生物力學分析師與跑步教練。
      任務：分析以下「${mode === 'bench' ? '臥推' : '跑步'}」數據。
      注意：這些數據已經過使用者校正(例如手錶實測)。
      
      [數據]
      ${JSON.stringify(metrics)}
      
      請給出：
      1. 評分 (1-10)。
      2. 針對數據的具體優化建議 (例如：如果步頻 182 很棒，請給予肯定；如果垂直振幅過高，給予修正技巧)。
      3. 一個立即可用的訓練意象 (Cue)。
      
      回答限制：繁體中文，專業且精簡，200字內。
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
            title: mode === 'bench' ? '臥推 AI 分析報告' : '跑步 AI 分析報告',
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
        alert("分析報告已上傳！請前往儀表板查看綜合建議。");

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
            人機協作模式
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
                <p className="text-blue-400 font-mono">正在提取骨架節點...</p>
                <div className="w-48 h-1 bg-gray-700 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-progress"></div>
                </div>
              </div>
            )}

            {analysisStep === 'analyzing_ai' && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-20 backdrop-blur-sm">
                <BrainCircuit size={48} className="text-purple-500 animate-pulse mb-4" />
                <p className="text-purple-400 font-mono">AI 正在根據您的數據進行診斷...</p>
              </div>
            )}

            {!videoFile && (
              <div className="text-center p-6 transition-transform group-hover:scale-105">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700 group-hover:border-blue-500 group-hover:text-blue-500 text-gray-400 transition-colors">
                  <Upload size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">點擊上傳影片</h3>
                <p className="text-gray-500 text-sm">支援 MP4, MOV 格式</p>
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
                  第一階段：初步分析
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
                        儲存報告
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
                分析數據 (可點擊修正)
                </h3>
                {analysisStep === 'internal_complete' && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
                        <Edit2 size={10} /> 若不準請手動修改
                    </span>
                )}
            </div>
            
            {metrics ? (
              <div className="space-y-4">
                {Object.entries(metrics).map(([key, metric]) => (
                    <div key={key} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">{metric.label}</span>
                            <div className="flex items-center gap-1">
                                <input 
                                    type="text"
                                    value={metric.value}
                                    onChange={(e) => updateMetric(key, e.target.value)}
                                    className={`bg-transparent text-right font-bold w-16 outline-none border-b border-dashed border-gray-600 focus:border-blue-500 transition-colors ${
                                        metric.status === 'good' ? 'text-green-400' : 'text-yellow-400'
                                    }`}
                                />
                                <span className="text-xs text-gray-500">{metric.unit}</span>
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
                            <span className="text-[10px] text-gray-500 block">{metric.hint}</span>
                        )}
                    </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-gray-500 space-y-2 border-2 border-dashed border-gray-700 rounded-lg">
                <Cpu size={24} className="opacity-40" />
                <span className="text-xs">等待分析...</span>
              </div>
            )}
          </div>

          <div className={`bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl border border-purple-500/30 p-5 transition-all duration-500 ${aiFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {aiFeedback ? (
              <>
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Sparkles size={18} className="text-yellow-400" />
                  AI 教練診斷
                </h3>
                <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {aiFeedback}
                </div>
              </>
            ) : (
               metrics && analysisStep !== 'analyzing_ai' && (
                <div className="text-center py-4 bg-gray-800/30 rounded-lg">
                    <AlertCircle size={24} className="mx-auto text-purple-400 mb-2 opacity-50" />
                    <p className="text-purple-200 text-xs mb-1">確認上方數據無誤後</p>
                    <p className="text-gray-500 text-[10px]">點擊「第二階段」取得準確建議</p>
                </div>
               )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}