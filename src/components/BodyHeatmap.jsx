import React, { useState } from 'react';
import { RefreshCcw, Activity } from 'lucide-react';

// --- 1. 顏色映射邏輯 ---
const getHeatColor = (value) => {
  if (!value || value === 0) return '#374151'; // Gray-700 (無紀錄)
  if (value <= 3) return '#22c55e'; // Green-500 (恢復)
  if (value <= 7) return '#eab308'; // Yellow-500 (成長)
  return '#ef4444'; // Red-500 (力竭)
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

/**
 * 肌肉路徑：人體解剖比例 (viewBox 0 0 200 360)，以平滑曲線繪製
 * 參考：頭約 1/7 身長、肩寬約 2 頭、四肢對稱、肌群邊界清楚
 */
const MUSCLE_PATHS = {
  front: {
    head: { path: 'M100,6 C76,6 56,22 56,42 C56,62 76,78 100,78 C124,78 144,62 144,42 C144,22 124,6 100,6 Z', name: '頭部', isMuscle: false },
    neck: { path: 'M84,78 L80,98 L100,102 L120,98 L116,78 Z', name: '頸部', isMuscle: false },
    traps: { path: 'M80,98 L56,108 L64,92 L84,78 Z M120,98 L144,108 L136,92 L116,78 Z', name: '斜方肌 (上)', isMuscle: true },
    pecs: { path: 'M100,98 L100,130 Q100,134 96,134 L70,122 L60,104 L80,98 Z M100,98 L100,130 Q100,134 104,134 L130,122 L140,104 L120,98 Z', name: '胸大肌', isMuscle: true },
    delts: { path: 'M56,108 Q44,114 42,128 L56,132 L70,116 Z M144,108 Q156,114 158,128 L144,132 L130,116 Z', name: '三角肌', isMuscle: true },
    biceps: { path: 'M56,132 L46,158 Q44,180 50,198 L64,194 L62,132 Z M144,132 L154,158 Q156,180 150,198 L136,194 L138,132 Z', name: '肱二頭肌', isMuscle: true },
    forearms: { path: 'M50,198 L44,236 Q48,248 56,246 L62,202 Z M150,198 L156,236 Q152,248 144,246 L138,202 Z', name: '前臂', isMuscle: true },
    abs: { path: 'M86,134 L82,164 L84,194 L86,224 L88,252 L96,256 L104,252 L106,224 L108,194 L110,164 L106,134 Z', name: '腹直肌', isMuscle: true },
    obliques: { path: 'M70,134 L54,176 L58,212 L76,250 L86,224 L82,164 Z M130,134 L146,176 L142,212 L124,250 L114,224 L118,164 Z', name: '腹外斜肌', isMuscle: true },
    quads: { path: 'M96,252 L82,252 Q76,278 78,306 L82,348 L92,354 L96,252 Z M104,252 L118,252 Q124,278 122,306 L118,348 L108,354 L104,252 Z', name: '股四頭肌', isMuscle: true },
    calves: { path: 'M82,348 Q78,362 82,376 L90,380 L94,376 L92,348 Z M118,348 Q122,362 118,376 L110,380 L106,376 L108,348 Z', name: '小腿', isMuscle: true },
  },
  back: {
    head: { path: 'M100,6 C76,6 56,22 56,42 C56,62 76,78 100,78 C124,78 144,62 144,42 C144,22 124,6 100,6 Z', name: '頭部', isMuscle: false },
    neck: { path: 'M84,78 L80,98 L100,102 L120,98 L116,78 Z', name: '頸部', isMuscle: false },
    traps: { path: 'M100,48 L78,90 L90,126 L100,118 L110,126 L122,90 Z', name: '斜方肌', isMuscle: true },
    rear_delts: { path: 'M56,108 Q44,114 44,128 L58,132 L72,110 Z M144,108 Q156,114 156,128 L142,132 L128,110 Z', name: '三角肌後束', isMuscle: true },
    triceps: { path: 'M58,132 L48,160 Q46,182 52,200 L64,196 L62,132 Z M142,132 L152,160 Q154,182 148,200 L136,196 L138,132 Z', name: '肱三頭肌', isMuscle: true },
    forearms: { path: 'M52,200 L46,238 Q50,250 58,248 L64,204 Z M148,200 L154,238 Q150,250 142,248 L136,204 Z', name: '前臂', isMuscle: true },
    lats: { path: 'M78,126 L52,156 L54,204 L76,222 L98,204 L96,156 Z M122,126 L148,156 L146,204 L124,222 L102,204 L104,156 Z', name: '背闊肌', isMuscle: true },
    lower_back: { path: 'M88,222 L82,250 L94,254 L100,250 L106,254 L118,250 L112,222 Z', name: '豎脊肌', isMuscle: true },
    glutes: { path: 'M82,252 L94,256 L106,256 L118,252 Q126,270 122,288 L110,292 L100,290 L90,292 L78,288 Q74,270 82,252 Z', name: '臀大肌', isMuscle: true },
    hamstrings: { path: 'M90,292 Q84,318 88,342 L96,346 L100,344 L104,346 L112,342 Q116,318 110,292 L100,290 Z', name: '膕旁肌', isMuscle: true },
    calves: { path: 'M84,346 Q80,358 84,370 L92,374 L96,370 L94,346 Z M116,346 Q120,358 116,370 L108,374 L104,370 L106,346 Z', name: '小腿', isMuscle: true },
  },
};

export default function BodyHeatmap({ data = {} }) {
  const [view, setView] = useState('front');
  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 relative overflow-hidden border border-gray-800 shadow-xl">
      {/* 頂部控制列 */}
      <div className="flex justify-between items-center z-10 mb-4">
        <div className="flex flex-col">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <Activity size={14} className="text-blue-500" />
            {view === 'front' ? '正面 (Anterior)' : '背面 (Posterior)'}
          </h3>
          <span className="text-xs text-gray-500 h-4 transition-all duration-300">
            {hoveredMuscle ? `${hoveredMuscle.name}: ${hoveredMuscle.value}/10` : '移動游標查看肌群負荷'}
          </span>
        </div>

        <button
          onClick={() => setView((prev) => (prev === 'front' ? 'back' : 'front'))}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-lg border border-gray-600 transition-all active:scale-95 shadow-lg"
        >
          <RefreshCcw size={12} className={`transition-transform duration-500 ${view === 'back' ? 'rotate-180' : ''}`} />
          {view === 'front' ? '轉背面' : '轉正面'}
        </button>
      </div>

      {/* 熱力圖 SVG */}
      <div className="flex-1 flex items-center justify-center relative py-2 overflow-hidden bg-gray-800/30 rounded-lg">
        <svg
          viewBox="0 0 200 360"
          className="h-full w-auto drop-shadow-[0_0_15px_rgba(0,0,0,0.5)] animate-fadeIn"
          style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.3))' }}
        >
          <defs>
            <filter id="heatmap-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {Object.entries(MUSCLE_PATHS[view]).map(([key, info]) => {
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
                  stroke={isHovered ? '#fff' : '#111827'}
                  strokeWidth={isHovered ? '1.2' : '0.6'}
                  filter={value > 7 ? 'url(#heatmap-glow)' : ''}
                  className="transition-all duration-300 ease-in-out"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* 圖例 */}
      <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-4 gap-2 text-[10px] text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-gray-700 rounded-full" />
          無紀錄
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_rgba(34,197,94,0.3)]" />
          恢復
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.3)]" />
          成長
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          力竭
        </div>
      </div>
    </div>
  );
}
