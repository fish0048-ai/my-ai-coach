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
 * 熱力疊加用路徑：直接對應底圖半身座標 (viewBox 0 0 203.5 354.43411)
 * 路徑依 OpenStax/Kebert 肌肉圖輪廓繪製，邊緣貼合底圖
 */
const MUSCLE_PATHS = {
  front: {
    traps: {
      path: 'M78,28 C76,38 70,48 75,58 L88,54 L92,42 L86,28 Z M125,28 C127,38 133,48 128,58 L115,54 L111,42 L117,28 Z',
      name: '斜方肌 (上)',
    },
    pecs: {
      path: 'M101,58 C95,62 78,68 72,88 C68,102 74,118 88,125 L98,126 L98,60 Z M102,58 C108,62 125,68 131,88 C135,102 129,118 115,125 L105,126 L105,60 Z',
      name: '胸大肌',
    },
    delts: {
      path: 'M72,55 C62,62 58,78 64,92 L78,88 L82,68 C78,58 74,56 72,55 Z M131,55 C141,62 145,78 139,92 L125,88 L121,68 C125,58 129,56 131,55 Z',
      name: '三角肌',
    },
    biceps: {
      path: 'M64,92 C58,118 56,155 62,188 L76,184 L78,94 Z M139,92 C145,118 147,155 141,188 L127,184 L125,94 Z',
      name: '肱二頭肌',
    },
    forearms: {
      path: 'M62,188 C56,228 60,268 68,288 L76,252 L78,192 Z M141,188 C147,228 143,268 135,288 L127,252 L125,192 Z',
      name: '前臂',
    },
    abs: {
      path: 'M88,124 C86,158 87,192 88,228 C89,258 92,278 101,282 C110,278 113,258 114,228 C115,192 116,158 114,124 C112,100 98,98 101,124 Z',
      name: '腹直肌',
    },
    obliques: {
      path: 'M72,124 C62,168 58,210 70,258 L84,235 L86,168 Z M131,124 C141,168 145,210 133,258 L119,235 L117,168 Z',
      name: '腹外斜肌',
    },
    quads: {
      path: 'M90,278 C82,295 78,318 80,338 L88,350 L96,348 L98,282 Z M113,278 C121,295 125,318 123,338 L115,350 L107,348 L105,282 Z',
      name: '股四頭肌',
    },
    calves: {
      path: 'M80,332 C76,342 78,350 84,354 L90,352 L92,346 L88,334 Z M123,332 C127,342 125,350 119,354 L113,352 L111,346 L115,334 Z',
      name: '小腿',
    },
  },
  back: {
    traps: {
      path: 'M92,28 C78,55 82,95 90,118 L100,112 L108,118 C116,95 120,55 106,28 Z',
      name: '斜方肌',
    },
    rear_delts: {
      path: 'M70,55 C60,65 58,82 66,90 L80,86 L84,62 Z M133,55 C143,65 145,82 137,90 L123,86 L119,62 Z',
      name: '三角肌後束',
    },
    triceps: {
      path: 'M66,92 C58,122 60,162 68,192 L80,188 L82,95 Z M137,92 C145,122 143,162 135,192 L123,188 L121,95 Z',
      name: '肱三頭肌',
    },
    forearms: {
      path: 'M68,192 C62,232 66,268 74,286 L80,250 L82,196 Z M135,192 C141,232 137,268 129,286 L123,250 L121,196 Z',
      name: '前臂',
    },
    lats: {
      path: 'M78,115 C58,148 55,200 72,228 L94,208 L96,155 Z M125,115 C145,148 148,200 131,228 L109,208 L107,155 Z',
      name: '背闊肌',
    },
    lower_back: {
      path: 'M88,225 C84,255 90,272 100,268 C110,272 116,255 112,225 C108,205 98,208 100,225 Z',
      name: '豎脊肌',
    },
    glutes: {
      path: 'M82,268 C88,278 94,282 100,284 C106,282 112,278 118,268 C124,282 122,298 110,302 C98,298 76,282 82,268 Z',
      name: '臀大肌',
    },
    hamstrings: {
      path: 'M92,298 C86,318 88,338 L96,348 L100,346 L104,348 L112,338 C114,318 108,298 100,296 L92,298 Z',
      name: '膕旁肌',
    },
    calves: {
      path: 'M82,332 C78,342 80,350 86,354 L92,352 L96,346 L94,334 Z M121,332 C125,342 123,350 117,354 L111,352 L107,346 L109,334 Z',
      name: '小腿',
    },
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

      {/* 精準肌肉解剖圖（OpenStax / Kebert）＋ 熱力疊加 */}
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
        {/* 熱力疊加：viewBox 與底圖半身 203.5×354.43 一致，路徑座標直接對應底圖 */}
        <svg
          viewBox="0 0 203.5 354.43411"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          <g>
            {Object.entries(MUSCLE_PATHS[view]).map(([key, info]) => {
              const value = mapDataToMuscle(data, key, view);
              const fillColor = getHeatColor(value);
              const isHovered = hoveredMuscle?.key === key;
              return (
                <g
                  key={key}
                  onMouseEnter={() => setHoveredMuscle({ key, name: info.name, value })}
                  onMouseLeave={() => setHoveredMuscle(null)}
                  style={{ opacity: isHovered ? 1 : 0.92 }}
                >
                  <path
                    d={info.path}
                    fill={fillColor}
                    fillOpacity="0.58"
                    stroke={isHovered ? '#fff' : 'transparent'}
                    strokeWidth={isHovered ? 1.5 : 0}
                    className="transition-all duration-200 cursor-pointer"
                  />
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
