import React, { useState, useRef } from 'react';
import { Camera, Activity, Play, Pause, RotateCcw, CheckCircle, AlertTriangle, ChevronRight, Upload } from 'lucide-react';

export default function AnalysisView() {
  const [mode, setMode] = useState('bench'); // 'bench' | 'run'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [videoFile, setVideoFile] = useState(null); // 新增：儲存選到的影片
  const fileInputRef = useRef(null); // 新增：用來控制隱藏的 input

  // 觸發檔案選擇視窗
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 處理檔案選擇
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(URL.createObjectURL(file)); // 建立預覽網址
      // 重置狀態，準備開始分析
      setShowResult(false);
      setIsAnalyzing(false);
    }
  };

  // 模擬分析過程
  const handleStartAnalysis = () => {
    if (!videoFile) {
        alert("請先上傳影片！");
        return;
    }
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
    setVideoFile(null); // 清除影片
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 隱藏的檔案輸入框 */}
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
          AI 動作分析
        </h1>
        
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
          <button 
            onClick={() => { setMode('bench'); resetAnalysis(); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'bench' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
            }`}
          >
            臥推分析
          </button>
          <button 
            onClick={() => { setMode('run'); resetAnalysis(); }}
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
          <div 
            className={`relative aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center overflow-hidden group ${!videoFile && 'cursor-pointer hover:border-blue-500 hover:bg-gray-800'}`}
            onClick={!videoFile ? handleUploadClick : undefined}
          >
            
            {/* 狀態 1: 正在分析 */}
            {isAnalyzing ? (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-blue-400 font-mono animate-pulse">AI 正在計算骨架節點...</p>
                {/* 掃描線動畫 */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-8 w-full animate-scan top-0"></div>
              </div>
            ) : showResult ? (
              /* 狀態 2: 顯示結果 (覆蓋在影片上) */
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
                <div className="text-center animate-bounceIn">
                  <CheckCircle size={56} className="text-green-500 mx-auto mb-3" />
                  <h3 className="text-2xl font-bold text-white mb-1">分析完成！</h3>
                  <p className="text-gray-300">已生成優化建議報告</p>
                </div>
              </div>
            ) : !videoFile ? (
              /* 狀態 3: 尚未上傳 (初始畫面) */
              <div className="text-center p-6 transition-transform group-hover:scale-105">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700 group-hover:border-blue-500 group-hover:text-blue-500 text-gray-400 transition-colors">
                  <Upload size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">點擊上傳影片</h3>
                <p className="text-gray-500 text-sm">支援 MP4, MOV 格式 (Max 50MB)</p>
              </div>
            ) : null}

            {/* 影片播放器 (如果有檔案) */}
            {videoFile && (
                <video 
                    src={videoFile} 
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    controls={!isAnalyzing && !showResult}
                    loop
                    muted // 自動播放通常需要靜音
                    autoPlay // 選完直接播
                />
            )}
            
            {/* 骨架裝飾背景 (僅在無影片時顯示) */}
            {!videoFile && !isAnalyzing && (
               <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://cdn-icons-png.flaticon.com/512/2554/2554037.png')] bg-center bg-no-repeat bg-contain transform scale-50"></div>
            )}
          </div>

          {/* 控制按鈕區 */}
          <div className="flex justify-center gap-4">
            {/* 情境 A: 有影片但還沒開始分析 -> 顯示「開始分析」與「重選影片」 */}
            {videoFile && !isAnalyzing && !showResult && (
              <>
                 <button 
                    onClick={handleUploadClick}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
                  >
                    重新上傳
                  </button>
                  <button 
                    onClick={handleStartAnalysis}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all transform hover:scale-105"
                  >
                    <Play size={20} fill="currentColor" />
                    開始分析
                  </button>
              </>
            )}

            {/* 情境 B: 分析完成 -> 顯示「重新分析」 */}
            {showResult && (
              <button 
                onClick={resetAnalysis}
                className="flex items-center gap-2 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
              >
                <RotateCcw size={20} />
                重新開始
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
              <div className="h-48 flex flex-col items-center justify-center text-gray-500 space-y-2">
                <Activity size={32} className="opacity-20" />
                <span className="text-sm italic">
                  {videoFile ? "準備就緒，請點擊分析" : "等待影片上傳..."}
                </span>
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