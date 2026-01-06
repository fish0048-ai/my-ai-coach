import React, { useState } from 'react';
import { RefreshCcw, Info } from 'lucide-react';

// 顏色映射邏輯
const getHeatColor = (value) => {
  if (!value || value === 0) return '#374151'; // Gray-700 (未訓練)
  if (value <= 3) return '#22c55e'; // Green-500 (低強度)
  if (value <= 7) return '#eab308'; // Yellow-500 (中強度)
  return '#ef4444'; // Red-500 (高強度)
};

// 肌肉路徑數據 (SVG Paths)
// 為了保持程式碼整潔且精緻，這裡使用簡化的解剖風格路徑
const MUSCLE_PATHS = {
  front: {
    chest: {
      path: "M43 35 Q50 38 57 35 L57 45 Q50 50 43 45 Z M43 35 Q36 38 29 35 L29 45 Q36 50 43 45 Z",
      name: "胸肌"
    },
    shoulders: {
      path: "M29 35 Q25 35 22 40 L24 48 Q28 42 29 45 Z M57 35 Q61 35 64 40 L62 48 Q58 42 57 45 Z",
      name: "肩膀 (前束)"
    },
    arms: {
      path: "M22 40 L20 55 Q23 58 25 55 L26 48 Z M64 40 L66 55 Q63 58 61 55 L60 48 Z", // 二頭
      name: "手臂 (二頭)"
    },
    abs: {
      path: "M43 45 L35 48 L36 65 L43 68 L50 65 L49 48 Z",
      name: "腹肌/核心"
    },
    legs: {
      path: "M36 65 Q30 75 32 95 L41 95 Q40 75 43 68 Z M50 65 Q56 75 54 95 L45 95 Q46 75 43 68 Z", // 股四頭
      name: "腿部 (股四頭)"
    }
  },
  back: {
    traps: {
      path: "M43 30 L35 33 L43 40 L51 33 Z",
      name: "斜方肌"
    },
    back: {
      path: "M35 33 L28 40 L36 58 L43 55 L50 58 L58 40 L51 33 L43 40 Z", // 背闊與豎脊
      name: "背部肌群"
    },
    shoulders: {
      path: "M28 40 L22 42 L24 50 L29 45 Z M58 40 L64 42 L62 50 L57 45 Z", // 後束
      name: "肩膀 (後束)"
    },
    arms: {
      path: "M22 42 L20 55 Q23 58 25 55 L26 50 Z M64 42 L66 55 Q63 58 61 55 L60 50 Z", // 三頭
      name: "手臂 (三頭)"
    },
    glutes: {
      path: "M36 58 L32 70 Q43 75 54 70 L50 58 L43 65 Z",
      name: "臀部"
    },
    legs: {
      path: "M32 70 L34 95 L41 95 L42 72 Z M54 70 L52 95 L45 95 L44 72 Z", // 膕旁肌
      name: "腿部 (膕旁)"
    }
  }
};

const BodyShape = ({ view }) => (
  // 身體輪廓線 (底圖)
  <g className="text-gray-800 fill-current opacity-30 pointer-events-none">
    {view === 'front' ? (
      <>
        <circle cx="43" cy="25" r="5" /> {/* 頭 */}
        <path d="M43 30 L30 33 L20 40 L18 60 L20 65 L18 70 L30 100 L43 100 L56 100 L68 70 L66 65 L68 60 L66 40 L56 33 Z" /> {/* 軀幹與四肢輪廓 */}
      </>
    ) : (
      <>
        <circle cx="43" cy="25" r="5" /> {/* 頭 */}
        <path d="M43 30 L30 33 L20 40 L18 60 L20 65 L18 70 L30 100 L43 100 L56 100 L68 70 L66 65 L68 60 L66 40 L56 33 Z" />
      </>
    )}
  </g>
);

export default function BodyHeatmap({ data = {} }) {
  const [view, setView] = useState('front'); // 'front' | 'back'

  // 取得該部位的數值 (0-10)
  const getValue = (key) => data[key] || 0;

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 relative overflow-hidden border border-gray-800">
      
      {/* 頂部切換按鈕 */}
      <div className="flex justify-between items-center z-10 mb-2">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Info size={14} className="text-blue-500"/>
          肌群疲勞熱圖
        </h3>
        <button 
          onClick={() => setView(prev => prev === 'front' ? 'back' : 'front')}
          className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-full border border-gray-600 transition-colors"
        >
          <RefreshCcw size={12} />
          {view === 'front' ? '切換背面' : '切換正面'}
        </button>
      </div>

      {/* SVG 畫布 */}
      <div className="flex-1 flex items-center justify-center relative">
        <svg viewBox="0 0 86 110" className="h-full w-auto drop-shadow-2xl">
          {/* 1. 身體輪廓底圖 */}
          <BodyShape view={view} />

          {/* 2. 肌肉熱力區塊 */}
          {Object.entries(MUSCLE_PATHS[view]).map(([key, info]) => {
            const value = getValue(key);
            const fillColor = getHeatColor(value);
            
            return (
              <g key={key} className="group cursor-pointer transition-all hover:opacity-90">
                <path 
                  d={info.path} 
                  fill={fillColor} 
                  stroke="#1f2937" 
                  strokeWidth="0.5"
                  className="transition-colors duration-500"
                />
                <title>{`${info.name}: ${value}/10`}</title>
              </g>
            );
          })}
        </svg>

        {/* 懸浮數值標籤 (當滑鼠在 SVG 上時可以額外做的互動，這裡簡化使用 title) */}
      </div>

      {/* 底部圖例 */}
      <div className="mt-4 grid grid-cols-4 gap-1 text-[10px] text-gray-400">
        <div className="flex flex-col items-center">
          <div className="w-full h-1 bg-gray-700 rounded mb-1"></div>
          無訓練
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full h-1 bg-green-500 rounded mb-1"></div>
          低強度
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full h-1 bg-yellow-500 rounded mb-1"></div>
          中強度
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full h-1 bg-red-500 rounded mb-1"></div>
          高強度
        </div>
      </div>
    </div>
  );
}