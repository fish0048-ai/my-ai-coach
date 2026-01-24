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
 * 肌肉路徑：依解剖學比例繪製，viewBox 0 0 200 400
 * 正面：胸大肌、三角肌、肱二頭、前臂、腹直肌、腹外斜、股四頭、小腿
 * 背面：斜方肌、三角肌後束、肱三頭、前臂、背闊肌、豎脊肌、臀大肌、膕旁肌、小腿
 */
const MUSCLE_PATHS = {
  front: {
    head: { path: 'M100,8 C85,8 72,22 72,40 C72,58 85,72 100,72 C115,72 128,58 128,40 C128,22 115,8 100,8 Z', name: '頭部', isMuscle: false },
    neck: { path: 'M92,72 L88,92 L100,96 L112,92 L108,72 Z', name: '頸部', isMuscle: false },
    // 斜方肌上段（正面可見鎖骨上緣）
    traps: { path: 'M88,92 L62,102 L68,92 Z M112,92 L138,102 L132,92 Z', name: '斜方肌 (上)', isMuscle: true },
    // 胸大肌：從胸骨與鎖骨內側到肱骨，扇形
    pecs: { path: 'M100,96 L100,138 Q100,142 96,142 L72,130 L64,108 L78,96 Z M100,96 L100,138 Q100,142 104,142 L128,130 L136,108 L122,96 Z', name: '胸大肌', isMuscle: true },
    // 三角肌：肩蓋外側，前中束
    delts: { path: 'M62,102 Q48,108 44,124 L58,128 L70,112 Z M138,102 Q152,108 156,124 L142,128 L130,112 Z', name: '三角肌', isMuscle: true },
    // 肱二頭肌：上臂前側
    biceps: { path: 'M58,128 L48,148 Q46,168 52,188 L66,184 L64,128 Z M142,128 L152,148 Q154,168 148,188 L134,184 L136,128 Z', name: '肱二頭肌', isMuscle: true },
    // 前臂：橈側與屈肌群
    forearms: { path: 'M52,188 L46,228 Q50,240 58,238 L66,192 Z M148,188 L154,228 Q150,240 142,238 L134,192 Z', name: '前臂', isMuscle: true },
    // 腹直肌：胸骨劍突到恥骨，節狀
    abs: { path: 'M86,142 L82,168 L84,194 L86,220 L88,248 L96,252 L104,248 L106,220 L108,194 L110,168 L106,142 Z', name: '腹直肌', isMuscle: true },
    // 腹外斜肌：腰側
    obliques: { path: 'M72,142 L58,180 L62,218 L80,248 L86,220 L82,168 Z M128,142 L142,180 L138,218 L120,248 L114,220 L118,168 Z', name: '腹外斜肌', isMuscle: true },
    // 股四頭肌：大腿前側，股直肌與内外側
    quads: { path: 'M82,252 Q76,280 78,308 L82,352 L92,358 L100,356 L108,358 L118,352 L122,308 Q124,280 118,252 L106,248 L94,248 Z', name: '股四頭肌', isMuscle: true },
    // 小腿前外側（脛前與腓腸肌外緣，正面可見）
    calves: { path: 'M82,358 Q78,372 82,388 L90,392 L94,388 L92,358 Z M118,358 Q122,372 118,388 L110,392 L106,388 L108,358 Z', name: '小腿', isMuscle: true },
  },
  back: {
    head: { path: 'M100,8 C85,8 72,22 72,40 C72,58 85,72 100,72 C115,72 128,58 128,40 C128,22 115,8 100,8 Z', name: '頭部', isMuscle: false },
    neck: { path: 'M92,72 L88,92 L100,96 L112,92 L108,72 Z', name: '頸部', isMuscle: false },
    // 斜方肌：枕部到肩峰、胸椎，菱形
    traps: { path: 'M100,50 L78,92 L88,130 L100,120 L112,130 L122,92 Z', name: '斜方肌', isMuscle: true },
    // 三角肌後束
    rear_delts: { path: 'M62,102 Q48,110 46,124 L60,128 L76,108 Z M138,102 Q152,110 154,124 L140,128 L124,108 Z', name: '三角肌後束', isMuscle: true },
    // 肱三頭肌：上臂後側
    triceps: { path: 'M60,128 L50,150 Q48,172 54,192 L66,188 L64,128 Z M140,128 L150,150 Q152,172 146,192 L134,188 L136,128 Z', name: '肱三頭肌', isMuscle: true },
    // 前臂背側
    forearms: { path: 'M54,192 L48,232 Q52,244 60,242 L66,196 Z M146,192 L152,232 Q148,244 140,242 L134,196 Z', name: '前臂', isMuscle: true },
    // 背闊肌：從胸腰筋膜、髂嵴到肱骨，V 型
    lats: { path: 'M78,130 L56,150 L58,200 L78,218 L96,200 L94,150 Z M122,130 L144,150 L142,200 L122,218 L104,200 L106,150 Z', name: '背闊肌', isMuscle: true },
    // 豎脊肌（下背）
    lower_back: { path: 'M88,218 L82,258 L94,262 L100,258 L106,262 L118,258 L112,218 Z', name: '豎脊肌', isMuscle: true },
    // 臀大肌
    glutes: { path: 'M82,258 Q72,278 76,298 L88,302 L100,300 L112,302 L124,298 Q128,278 118,258 L106,262 L94,262 Z', name: '臀大肌', isMuscle: true },
    // 膕旁肌：大腿後側
    hamstrings: { path: 'M88,302 Q82,330 86,358 L94,362 L100,360 L106,362 L114,358 Q118,330 112,302 L106,300 L94,300 Z', name: '膕旁肌', isMuscle: true },
    // 腓腸肌（小腿後側）
    calves: { path: 'M86,362 Q82,376 86,392 L94,396 L100,394 L106,396 L114,392 Q118,376 114,362 L106,360 L94,360 Z', name: '小腿', isMuscle: true },
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
          viewBox="0 0 200 400"
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
