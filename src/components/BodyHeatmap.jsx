import React, { useState, useEffect } from 'react';
import { RefreshCcw, Info, Settings, Move, Plus, Minus, RotateCcw, Image as ImageIcon } from 'lucide-react';

// --- 1. 顏色映射邏輯 ---
const getHeatColor = (value) => {
  if (!value || value === 0) return '#374151'; // Gray-700
  if (value <= 3) return '#22c55e'; // Green-500
  if (value <= 7) return '#eab308'; // Yellow-500
  return '#ef4444'; // Red-500
};

// --- 2. 數據兼容性映射 ---
const mapDataToMuscle = (data, muscleKey, view) => {
  if (data[muscleKey] !== undefined) return data[muscleKey];

  if (view === 'front') {
    if (muscleKey === 'pecs') return data.chest || 0;
    if (muscleKey === 'delts') return data.shoulders || 0;
    if (muscleKey === 'biceps') return data.arms || 0;
    if (muscleKey === 'forearms') return data.arms || 0;
    if (muscleKey === 'abs') return data.abs || 0;
    if (muscleKey === 'obliques') return data.abs || 0;
    if (muscleKey === 'quads') return data.legs || 0;
    if (muscleKey === 'calves') return data.legs || 0;
  }
  if (view === 'back') {
    if (muscleKey === 'traps') return data.back || data.shoulders || 0;
    if (muscleKey === 'lats') return data.back || 0;
    if (muscleKey === 'lower_back') return data.back || data.core || 0;
    if (muscleKey === 'rear_delts') return data.shoulders || 0;
    if (muscleKey === 'triceps') return data.arms || 0;
    if (muscleKey === 'forearms') return data.arms || 0;
    if (muscleKey === 'glutes') return data.legs || 0;
    if (muscleKey === 'hamstrings') return data.legs || 0;
    if (muscleKey === 'calves') return data.legs || 0;
  }
  return 0;
};

// --- 3. 精緻肌肉路徑數據 ---
const MUSCLE_PATHS = {
  front: {
    head: { path: "M90,20 Q100,10 110,20 Q115,35 110,50 Q100,60 90,50 Q85,35 90,20", name: "頭部", isMuscle: false },
    neck: { path: "M90,50 Q100,55 110,50 L115,60 Q100,65 85,60 Z", name: "頸部", isMuscle: false },
    traps: { path: "M85,60 L65,70 L75,55 Z M115,60 L135,70 L125,55 Z", name: "斜方肌 (上)", isMuscle: true },
    pecs: { path: "M100,65 L100,95 Q125,95 130,75 L115,65 Z M100,65 L100,95 Q75,95 70,75 L85,65 Z", name: "胸大肌", isMuscle: true },
    delts: { path: "M65,70 Q55,80 60,95 L70,75 Z M135,70 Q145,80 140,95 L130,75 Z", name: "三角肌", isMuscle: true },
    biceps: { path: "M60,95 Q55,110 60,120 L70,115 L68,95 Z M140,95 Q145,110 140,120 L130,115 L132,95 Z", name: "肱二頭肌", isMuscle: true },
    forearms: { path: "M60,120 L55,145 Q60,150 65,145 L70,120 Z M140,120 L145,145 Q140,150 135,145 L130,120 Z", name: "前臂", isMuscle: true },
    abs: { path: "M90,95 L85,130 L100,135 L115,130 L110,95 Z", name: "腹直肌", isMuscle: true },
    obliques: { path: "M85,95 L75,125 L85,130 Z M115,95 L125,125 L115,130 Z", name: "腹外斜肌", isMuscle: true },
    quads: { path: "M85,135 Q70,180 80,210 L95,200 L98,145 Z M115,135 Q130,180 120,210 L105,200 L102,145 Z", name: "股四頭肌", isMuscle: true },
    calves: { path: "M80,215 Q75,240 80,260 L90,255 L88,215 Z M120,215 Q125,240 120,260 L110,255 L112,215 Z", name: "小腿", isMuscle: true },
  },
  back: {
    head: { path: "M90,20 Q100,10 110,20 Q115,35 110,50 Q100,60 90,50 Q85,35 90,20", name: "頭部", isMuscle: false },
    neck: { path: "M90,50 Q100,55 110,50 L115,60 Q100,65 85,60 Z", name: "頸部", isMuscle: false },
    traps: { path: "M100,50 L85,60 L95,90 L100,80 L105,90 L115,60 Z", name: "斜方肌", isMuscle: true },
    rear_delts: { path: "M65,70 Q55,80 60,90 L75,75 Z M135,70 Q145,80 140,90 L125,75 Z", name: "三角肌後束", isMuscle: true },
    triceps: { path: "M60,90 Q55,105 60,120 L70,115 L68,90 Z M140,90 Q145,105 140,120 L130,115 L132,90 Z", name: "肱三頭肌", isMuscle: true },
    forearms: { path: "M60,120 L55,145 Q60,150 65,145 L70,120 Z M140,120 L145,145 Q140,150 135,145 L130,120 Z", name: "前臂", isMuscle: true },
    lats: { path: "M95,90 L75,80 L80,115 L95,125 Z M105,90 L125,80 L120,115 L105,125 Z", name: "背闊肌", isMuscle: true },
    lower_back: { path: "M95,125 L90,140 L110,140 L105,125 Z", name: "豎脊肌", isMuscle: true },
    glutes: { path: "M90,140 Q75,160 80,175 L100,175 L100,140 Z M110,140 Q125,160 120,175 L100,175 L100,140 Z", name: "臀大肌", isMuscle: true },
    hamstrings: { path: "M80,180 Q75,200 85,215 L95,210 L95,180 Z M120,180 Q125,200 115,215 L105,210 L105,180 Z", name: "膕旁肌", isMuscle: true },
    calves: { path: "M85,220 Q75,235 85,260 L92,250 Z M115,220 Q125,235 115,260 L108,250 Z", name: "小腿", isMuscle: true },
  }
};

export default function BodyHeatmap({ data = {}, frontImage, backImage }) {
  const [view, setView] = useState('front'); // 'front' | 'back'
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  
  // 校準數據: X位移, Y位移, 縮放比例
  const [calibration, setCalibration] = useState({
    front: { x: 0, y: 0, scale: 1 },
    back: { x: 0, y: 0, scale: 1 }
  });

  // 初始化時讀取 LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('heatmap_calibration');
    if (saved) {
      try {
        setCalibration(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load calibration", e);
      }
    }
  }, []);

  // 儲存校準數據
  const updateCalibration = (key, delta) => {
    setCalibration(prev => {
      const currentVal = prev[view][key];
      const newVal = {
        ...prev,
        [view]: {
          ...prev[view],
          [key]: parseFloat((currentVal + delta).toFixed(2))
        }
      };
      localStorage.setItem('heatmap_calibration', JSON.stringify(newVal));
      return newVal;
    });
  };

  const resetCalibration = () => {
    setCalibration(prev => {
      const newVal = { ...prev, [view]: { x: 0, y: 0, scale: 1 } };
      localStorage.setItem('heatmap_calibration', JSON.stringify(newVal));
      return newVal;
    });
  };

  const currentImage = view === 'front' ? frontImage : backImage;
  const { x, y, scale } = calibration[view];

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 relative overflow-hidden border border-gray-800 shadow-xl">
      
      {/* 頂部控制列 */}
      <div className="flex justify-between items-center z-10 mb-4">
        <div className="flex flex-col">
           <h3 className="text-white font-bold text-sm flex items-center gap-2">
            {currentImage ? <ImageIcon size={14} className="text-purple-400"/> : <Info size={14} className="text-blue-500"/>}
            {view === 'front' ? '正面' : '背面'}
            {isCalibrating && <span className="text-xs text-yellow-500 font-normal border border-yellow-500/50 px-1 rounded animate-pulse">校準模式</span>}
           </h3>
           <span className="text-xs text-gray-500 h-4">
             {hoveredMuscle ? `${hoveredMuscle.name}: ${hoveredMuscle.value}/10` : (isCalibrating ? '請使用下方按鈕調整熱點位置' : '移動游標查看詳情')}
           </span>
        </div>

        <div className="flex gap-2">
          {/* 校準模式開關 */}
          <button 
            onClick={() => setIsCalibrating(!isCalibrating)}
            className={`p-1.5 rounded-lg border transition-all ${isCalibrating ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-800 text-gray-400 border-gray-600 hover:text-white'}`}
            title="調整熱點位置"
          >
            <Settings size={14} />
          </button>
          
          <button 
            onClick={() => setView(prev => prev === 'front' ? 'back' : 'front')}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-lg border border-gray-600 transition-all active:scale-95 shadow-lg"
          >
            <RefreshCcw size={12} className={`transition-transform duration-500 ${view === 'back' ? 'rotate-180' : ''}`} />
            {view === 'front' ? '背面' : '正面'}
          </button>
        </div>
      </div>

      {/* 校準控制面板 (僅在校準模式顯示) */}
      {isCalibrating && (
        <div className="absolute top-16 right-4 z-20 bg-gray-900/90 backdrop-blur border border-gray-700 p-3 rounded-xl shadow-2xl flex flex-col gap-3 w-32 animate-fadeIn">
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><Move size={10}/> 位移 (X/Y)</span>
            <div className="grid grid-cols-3 gap-1">
              <div></div>
              <button onClick={() => updateCalibration('y', -5)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-1 flex justify-center"><Minus size={12} className="rotate-90"/></button>
              <div></div>
              <button onClick={() => updateCalibration('x', -5)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-1 flex justify-center"><Minus size={12}/></button>
              <button onClick={resetCalibration} className="bg-red-900/50 hover:bg-red-900 text-red-400 rounded p-1 flex justify-center" title="重置"><RotateCcw size={12}/></button>
              <button onClick={() => updateCalibration('x', 5)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-1 flex justify-center"><Plus size={12}/></button>
              <div></div>
              <button onClick={() => updateCalibration('y', 5)} className="bg-gray-800 hover:bg-gray-700 text-white rounded p-1 flex justify-center"><Plus size={12} className="rotate-90"/></button>
              <div></div>
            </div>
          </div>
          
          <div className="space-y-1 pt-2 border-t border-gray-700">
            <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1"><ZoomIn size={10}/> 縮放 ({scale.toFixed(2)})</span>
            <div className="flex gap-1">
              <button onClick={() => updateCalibration('scale', -0.05)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded py-1 flex justify-center"><Minus size={14}/></button>
              <button onClick={() => updateCalibration('scale', 0.05)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded py-1 flex justify-center"><Plus size={14}/></button>
            </div>
          </div>
        </div>
      )}

      {/* 畫布區域 */}
      <div className="flex-1 flex items-center justify-center relative py-2 overflow-hidden">
        <svg 
            viewBox="50 0 100 280" 
            className="h-full w-auto"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3))' }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* A. 背景圖片層 (不隨校準移動，固定不動) */}
          {currentImage && (
            <image 
              href={currentImage} 
              x="50" 
              y="0" 
              width="100" 
              height="280" 
              preserveAspectRatio="xMidYMid slice" 
              opacity="0.6" 
            />
          )}

          {/* B. 肌肉熱力圖層 (套用校準變形) */}
          {/* transform-origin 設定為中心點 (100, 140) 以確保縮放時居中 */}
          <g 
            transform={`translate(${x}, ${y}) scale(${scale})`} 
            style={{ transformOrigin: '100px 140px' }}
          >
            {Object.entries(MUSCLE_PATHS[view]).map(([key, info]) => {
              const value = info.isMuscle ? mapDataToMuscle(data, key, view) : 0;
              const baseColor = currentImage ? 'transparent' : '#374151';
              const fillColor = value > 0 ? getHeatColor(value) : baseColor;
              const isHovered = hoveredMuscle?.key === key;
              
              return (
                <g 
                  key={key} 
                  className={`transition-all duration-300 ${info.isMuscle ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => info.isMuscle && setHoveredMuscle({ key, name: info.name, value })}
                  onMouseLeave={() => setHoveredMuscle(null)}
                >
                  <path 
                    d={info.path} 
                    fill={fillColor} 
                    stroke={isHovered ? '#fff' : (currentImage ? 'rgba(255,255,255,0.15)' : '#111827')} 
                    strokeWidth={isHovered ? "1.5" : (isCalibrating ? "0.8" : "0.5")}
                    strokeDasharray={isCalibrating ? "2,2" : "0"} // 校準模式下顯示虛線邊框方便對齊
                    fillOpacity={value > 0 ? 0.8 : (currentImage ? (isCalibrating ? 0.1 : 0) : 1)}
                    filter={value > 7 ? "url(#glow)" : ""}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 底部圖例 */}
      <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-4 gap-2 text-[10px] text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-gray-700/50 rounded-full border border-gray-600"></div>
          無紀錄
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.3)]"></div>
          恢復
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.3)]"></div>
          成長
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
          力竭
        </div>
      </div>
    </div>
  );
}