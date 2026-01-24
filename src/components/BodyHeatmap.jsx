import React, { useState } from 'react';
import { RefreshCcw, Activity } from 'lucide-react';

// 底圖：OpenStax + Tomáš Kebert / umimeto.org，CC BY-SA 4.0
// https://commons.wikimedia.org/wiki/File:Muscles_front_and_back.svg
const MUSCLE_IMAGE_URL = '/muscles_front_back.svg';

const getHeatColor = (value) => {
  if (!value || value === 0) return '#374151';
  if (value <= 3) return '#22c55e';
  if (value <= 7) return '#eab308';
  return '#ef4444';
};

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
 * 肌群標記點：viewBox 0 0 203.5 354.43411，每肌群以圓點標示負荷
 */
const DOT_R = 7;

const MUSCLE_POINTS = {
  front: {
    traps: { points: [{ x: 85, y: 42 }, { x: 118, y: 42 }], name: '斜方肌 (上)' },
    pecs: { points: [{ x: 85, y: 92 }, { x: 118, y: 92 }], name: '胸大肌' },
    delts: { points: [{ x: 75, y: 72 }, { x: 128, y: 72 }], name: '三角肌' },
    biceps: { points: [{ x: 70, y: 138 }, { x: 133, y: 138 }], name: '肱二頭肌' },
    forearms: { points: [{ x: 68, y: 238 }, { x: 135, y: 238 }], name: '前臂' },
    abs: { points: [{ x: 101, y: 165 }, { x: 101, y: 218 }], name: '腹直肌' },
    obliques: { points: [{ x: 78, y: 190 }, { x: 125, y: 190 }], name: '腹外斜肌' },
    quads: { points: [{ x: 88, y: 308 }, { x: 115, y: 308 }], name: '股四頭肌' },
    calves: { points: [{ x: 86, y: 342 }, { x: 117, y: 342 }], name: '小腿' },
  },
  back: {
    traps: { points: [{ x: 100, y: 70 }], name: '斜方肌' },
    rear_delts: { points: [{ x: 75, y: 72 }, { x: 128, y: 72 }], name: '三角肌後束' },
    triceps: { points: [{ x: 72, y: 138 }, { x: 131, y: 138 }], name: '肱三頭肌' },
    forearms: { points: [{ x: 70, y: 238 }, { x: 133, y: 238 }], name: '前臂' },
    lats: { points: [{ x: 82, y: 168 }, { x: 121, y: 168 }], name: '背闊肌' },
    lower_back: { points: [{ x: 100, y: 248 }], name: '豎脊肌' },
    glutes: { points: [{ x: 100, y: 285 }], name: '臀大肌' },
    hamstrings: { points: [{ x: 100, y: 320 }], name: '膕旁肌' },
    calves: { points: [{ x: 86, y: 342 }, { x: 117, y: 342 }], name: '小腿' },
  },
};

export default function BodyHeatmap({ data = {} }) {
  const [view, setView] = useState('front');
  const [hoveredMuscle, setHoveredMuscle] = useState(null);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg p-4 relative overflow-hidden border border-gray-800 shadow-xl">
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
          onClick={() => setView((v) => (v === 'front' ? 'back' : 'front'))}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs text-white rounded-lg border border-gray-600 transition-all active:scale-95 shadow-lg"
        >
          <RefreshCcw size={12} className={`transition-transform duration-500 ${view === 'back' ? 'rotate-180' : ''}`} />
          {view === 'front' ? '轉背面' : '轉正面'}
        </button>
      </div>

      {/* 肌肉解剖圖（OpenStax / Kebert）＋ 肌群負荷標記點 */}
      <div
        className="flex-1 flex items-center justify-center relative py-2 overflow-hidden bg-white rounded-lg min-h-[280px]"
        style={{ aspectRatio: '203.5/354' }}
      >
        {/* 底圖：正/背各半，object-position 切換左半（正面）或右半（背面） */}
        <img
          src={MUSCLE_IMAGE_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none select-none"
          style={{ objectPosition: view === 'front' ? '0 0' : '100% 0' }}
        />
        {/* 肌群負荷標記點：viewBox 與底圖半身 203.5×354.43 一致 */}
        <svg
          viewBox="0 0 203.5 354.43411"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          <g>
            {Object.entries(MUSCLE_POINTS[view]).map(([key, info]) => {
              const value = mapDataToMuscle(data, key, view);
              const fillColor = getHeatColor(value);
              const isHovered = hoveredMuscle?.key === key;
              const r = isHovered ? DOT_R + 2 : DOT_R;
              return (
                <g
                  key={key}
                  onMouseEnter={() => setHoveredMuscle({ key, name: info.name, value })}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  className="cursor-pointer"
                >
                  {info.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill={fillColor}
                      fillOpacity="0.9"
                      stroke={isHovered ? '#fff' : 'rgba(0,0,0,0.25)'}
                      strokeWidth={isHovered ? 2 : 1}
                      className="transition-all duration-200"
                    />
                  ))}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-800 grid grid-cols-4 gap-2 text-[10px] text-gray-400">
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-gray-700 rounded-full" />
          無紀錄
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-green-500 rounded-full" />
          恢復
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-yellow-500 rounded-full" />
          成長
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-full h-1.5 bg-red-500 rounded-full" />
          力竭
        </div>
      </div>

      <p className="mt-1.5 text-[10px] text-gray-600 text-center">
        肌肉圖：<a href="https://commons.wikimedia.org/wiki/File:Muscles_front_and_back.svg" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">OpenStax, Tomáš Kebert / umimeto.org</a>
        {' '}<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh_TW" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-500">CC BY-SA 4.0</a>
      </p>
    </div>
  );
}
