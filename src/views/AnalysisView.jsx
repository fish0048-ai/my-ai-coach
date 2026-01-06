import React, { useState } from 'react';
import { Camera, Activity, Play, Pause, RotateCcw, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

export default function AnalysisView() {
  const [mode, setMode] = useState('bench'); // 'bench' | 'run'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // 模擬分析過程
  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setShowResult(false);
    
    // 模擬 3 秒後的分析結果
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResult(true);
    }, 3000);
  };

  const resetAnalysis = () => {
    setShowResult(false);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 頂部標題與切換 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Camera className="text-blue-500" />
          AI 動作分析
        </h1>
        
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
          <button 
            onClick={() => setMode('bench')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'bench' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            臥推分析
          </button>
          <button 
            onClick={() => setMode('run')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'run' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            跑步姿勢
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：相機/影片區 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group">
            
            {/* 模擬相機畫面或分析動畫 */}
            {isAnalyzing ? (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-10">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-400 font-mono animate-pulse">正在分析骨架節點...</p>
                {/* 掃描線動畫 */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-8 w-full animate-scan"></div>
              </div>
            ) : showResult ? (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle size={48} className="text-green-500 mx-auto mb-2" />
                  <p className="text-white font-bold">分析完成</p>
                  <p className="text-sm text-gray-400">影片已處理完畢</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-700 transition-colors cursor-pointer">
                  <Camera size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-300 font-medium mb-1">開啟相機 或 上傳影片</p>
                <p className="text-gray-500 text-sm">支援格式: MP4, MOV (Max 50MB)</p>
              </div>
            )}
            
            {/* 骨架示意圖 (僅裝飾) */}
            {!isAnalyzing && !showResult && (
               <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://cdn-icons-png.flaticon.com/512/2554/2554037.png')] bg-center bg-no-repeat bg-contain transform scale-50"></div>
            )}
          </div>

          {/* 控制按鈕 */}
          <div className="flex justify-center gap-4">
            {!isAnalyzing && !showResult && (
              <button 
                onClick={handleStartAnalysis}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all transform hover:scale-105"
              >
                <Play size={20} fill="currentColor" />
                開始分析
              </button>
            )}
            {showResult && (
              <button 
                onClick={resetAnalysis}
                className="flex items-center gap-2 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
              >
                <RotateCcw size={20} />
                重新分析
              </button>
            )}
          </div>
        </div>

        {/* 右側：分析結果數據 */}
        <div className="space-y-4">
          {/* 即時數據卡片 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Activity size={18} className="text-purple-500" />
              關鍵指標 ({mode === 'bench' ? '臥推' : '跑步'})
            </h3>
            
            {showResult ? (
              <div className="space-y-4 animate-fadeIn">
                {mode === 'bench' ? (
                  <>
                    <MetricItem label="槓鈴軌跡" value="垂直 (Vertical)" status="good" />
                    <MetricItem label="離心速度" value="2.5 秒" status="good" />
                    <MetricItem label="手肘角度" value="75°" status="warning" hint="建議收緊至 45-60° 以保護肩膀" />
                    <MetricItem label="推舉穩定度" value="92%" status="good" />
                  </>
                ) : (
                  <>
                    <MetricItem label="步頻 (Cadence)" value="165 spm" status="warning" hint="目標: 170-180 spm" />
                    <MetricItem label="垂直振幅" value="8.5 cm" status="good" />
                    <MetricItem label="觸地時間" value="240 ms" status="good" />
                    <MetricItem label="軀幹前傾" value="5°" status="good" />
                  </>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm italic">
                等待分析結果...
              </div>
            )}
          </div>

          {/* AI 建議卡片 */}
          {showResult && (
            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 rounded-xl border border-blue-500/30 p-5 animate-fadeIn">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <CheckCircle size={18} className="text-blue-400" />
                AI 教練總結
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                {mode === 'bench' 
                  ? "整體動作流暢，但離心階段手肘略微外開（75度），這可能會增加肩關節壓力。試著將手肘稍微內收，想像要『折斷槓鈴』的感覺來啟動背肌。"
                  : "你的跑姿很輕盈，垂直振幅控制得很好。不過步頻稍慢（165 spm），建議透過節拍器訓練將步頻提升至 170 以上，有助於減少膝蓋衝擊。"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 小組件：顯示單個數據指標
const MetricItem = ({ label, value, status, hint }) => (
  <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
    <div className="flex justify-between items-center mb-1">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-bold ${status === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>
        {value}
      </span>
    </div>
    {/* 進度條示意 */}
    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-1">
      <div 
        className={`h-full rounded-full ${status === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`} 
        style={{ width: status === 'good' ? '90%' : '70%' }}
      ></div>
    </div>
    {hint && (
      <div className="flex items-start gap-1 mt-1">
        <AlertTriangle size={12} className="text-yellow-500 mt-0.5 flex-shrink-0" />
        <span className="text-[10px] text-gray-500">{hint}</span>
      </div>
    )}
  </div>
);