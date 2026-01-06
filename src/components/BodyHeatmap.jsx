import React, { useState } from 'react';
import { RefreshCcw, Info, ZoomIn } from 'lucide-react';

// --- 1. 顏色映射邏輯 (熱力圖核心) ---
const getHeatColor = (value) => {
  if (!value || value === 0) return '#374151'; // Gray-700 (未訓練/休息)
  if (value <= 3) return '#22c55e'; // Green-500 (恢復/熱身)
  if (value <= 7) return '#eab308'; // Yellow-500 (訓練/成長)
  return '#ef4444'; // Red-500 (力竭/高強度)
};

// --- 2. 數據兼容性映射 (Mapping) ---
// 將舊的廣泛分類 (如 legs) 映射到新的精細肌群 (如 quads, glutes)
const mapDataToMuscle = (data, muscleKey, view) => {
  // 1. 如果有精確的數據 (例如 data.quads)，直接使用
  if (data[muscleKey] !== undefined) return data[muscleKey];

  // 2. 如果沒有，則尋找舊版的大分類數據
  // 正面映射
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
  // 背面映射
  if (view === 'back') {
    if (muscleKey === 'traps') return data.back || data.shoulders || 0; // 斜方肌常被歸類在背或肩
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

// --- 3. 精緻肌肉路徑數據 (SVG Paths) ---
// 使用 200x400 的 viewBox 坐標系
const MUSCLE_PATHS = {
  front: {
    head: { path: "M90,20 Q100,10 110,20 Q115,35 110,50 Q100,60 90,50 Q85,35 90,20", name: "頭部", isMuscle: false },
    neck: { path: "M90,50 Q100,55 110,50 L115,60 Q100,65 85,60 Z", name: "頸部", isMuscle: false },
    traps: { path: "M85,60 L65,70 L75,55 Z M115,60 L135,70 L125,55 Z", name: "斜方肌 (上)", isMuscle: true },
    pecs: { 
      path: "M100,65 L100,95 Q125,95 130,75 L115,65 Z M100,65 L100,95 Q75,95 70,75 L85,65 Z", 
      name: "胸大肌" 
    },
    delts: { 
      path: "M65,70 Q55,80 60,95 L70,75 Z M135,70 Q145,80 140,95 L130,75 Z", 
      name: "三角肌 (前/中束)" 
    },
    biceps: { 
      path: "M60,95 Q55,110 60,120 L70,115 L68,95 Z M140,95 Q145,110 140,120 L130,115 L132,95 Z", 
      name: "肱二頭肌" 
    },
    forearms: { 
      path: "M60,120 L55,145 Q60,150 65,145 L70,120 Z M140,120 L145,145 Q140,150 135,145 L130,120 Z", 
      name: "前臂肌群" 
    },
    abs: { 
      path: "M90,95 L85,130 L100,135 L115,130 L110,95 Z", 
      name: "腹直肌" 
    },
    obliques: { 
      path: "M85,95 L75,125 L85,130 Z M115,95 L125,125 L115,130 Z", 
      name: "腹外斜肌" 
    },
    quads: { 
      path: "M85,135 Q70,180 80,210 L95,200 L98,145 Z M115,135 Q130,180 120,210 L105,200 L102,145 Z", 
      name: "股四頭肌" 
    },
    calves: { 
      path: "M80,215 Q75,240 80,260 L90,255 L88,215 Z M120,215 Q125,240 120,260 L110,255 L112,215 Z", 
      name: "脛骨前肌/小腿" 
    },
  },
  back: {
    head: { path: "M90,20 Q100,10 110,20 Q115,35 110,50 Q100,60 90,50 Q85,35 90,20", name: "頭部", isMuscle: false },
    neck: { path: "M90,50 Q100,55 110,50 L115,60 Q100,65 85,60 Z", name: "頸部", isMuscle: false },
    traps: { 
      path: "M100,50 L85,60 L95,90 L100,80 L105,90 L115,60 Z", 
      name: "斜方肌 (中/下)" 
    },
    rear_delts: { 
      path: "M65,70 Q55,80 60,90 L75,75 Z M135,70 Q145,80 140,90 L125,75 Z", 
      name: "三角肌 (後束)" 
    },
    triceps: { 
      path: "M60,90 Q55,105 60,120 L70,115 L68,90 Z M140,90 Q145,105 140,120 L130,115 L132,90 Z", 
      name: "肱三頭肌" 
    },
    forearms: { 
        path: "M60,120 L55,145 Q60,150 65,145 L70,120 Z M140,120 L145,145 Q140,150 135,145 L130,120 Z", 
        name: "前臂 (後側)" 
    },
    lats: { 
      path: "M95,90 L75,80 L80,115 L95,125 Z M105,90 L125,80 L120,115 L105,125 Z", 
      name: "背闊肌" 
    },
    lower_back: { 
      path: "M95,125 L90,140 L110,140 L105,125 Z", 
      name: "豎脊肌 (下背)" 
    },
    glutes: { 
      path: "M90,140 Q75,160 80,175 L100,175 L100,140 Z M110,140 Q125,160 120,175 L100,175 L100,140 Z", 
      name: "臀大肌" 
    },
    hamstrings: { 
      path: "M80,180 Q75,200 85,215 L95,210 L95,180 Z M120,180 Q125,200 115,215 L105,210 L105,180 Z", 
      name: "膕旁肌" 
    },
    calves: { 
      path: "M85,220 Q75,235 85,260 L92,250 Z M115,220 Q125,235 115,260 L108,250 Z", 
      name: "小腿肌 (腓腸肌)" 
    },
  }
};

export default function BodyHeatmap({ data = {} }) {
  const [view, setView] = useState('front'); // 'front' | 'back'
  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 relative overflow-hidden border border-gray-800 shadow-xl">
      
      {/* 頂部切換與資訊列 */}
      <div className="flex justify-between items-center z-10 mb-4">
        <div className="flex flex-col">
           <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Info size={14} className="text-blue-500"/>
            {view === 'front' ? '正面肌群 (Anterior)' : '背面肌群 (Posterior)'}
           </h3>
           <span className="text-xs text-gray-500 h-4 transition-all duration-300">
             {hoveredMuscle ? `${hoveredMuscle.name}: ${hoveredMuscle.value}/10` : '移動游標查看詳情'}
           </span>
        </div>

        <button 
          onClick={() => setView(prev => prev === 'front' ? 'back' : 'front')}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-lg border border-gray-600 transition-all active:scale-95 shadow-lg"
        >
          <RefreshCcw size={12} className={`transition-transform duration-500 ${view === 'back' ? 'rotate-180' : ''}`} />
          {view === 'front' ? '切換背面' : '切換正面'}
        </button>
      </div>

      {/* SVG 畫布 */}
      <div className="flex-1 flex items-center justify-center relative py-2">
        <svg 
            viewBox="50 0 100 280" 
            className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3))' }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 渲染肌肉區塊 */}
          {Object.entries(MUSCLE_PATHS[view]).map(([key, info]) => {
            // 使用映射函數來獲取數值
            const value = info.isMuscle ? mapDataToMuscle(data, key, view) : 0;
            const fillColor = info.isMuscle ? getHeatColor(value) : '#4b5563';
            const isHovered = hoveredMuscle?.key === key;
            
            return (
              <g 
                key={key} 
                className={`transition-all duration-300 ${info.isMuscle ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => info.isMuscle && setHoveredMuscle({ key, name: info.name, value })}
                onMouseLeave={() => setHoveredMuscle(null)}
                style={{ opacity: isHovered ? 1 : 0.9 }}
              >
                <path 
                  d={info.path} 
                  fill={fillColor} 
                  stroke={isHovered ? '#fff' : '#111827'} // 懸停時白色描邊
                  strokeWidth={isHovered ? "1" : "0.5"}
                  filter={value > 7 ? "url(#glow)" : ""} // 高強度訓練發光效果
                  className="transition-all duration-300 ease-in-out"
                />
              </g>
            );
          })}
        </svg>

        {/* 懸浮提示框 (跟隨滑鼠或是固定位置，這裡使用固定位置顯示在上方標題區，避免SVG遮擋) */}
      </div>

      {/* 底部圖例 */}
      <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-4 gap-2 text-[10px] text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-gray-700 rounded-full"></div>
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