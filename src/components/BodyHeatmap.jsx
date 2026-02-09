import React from 'react';
import { Activity } from 'lucide-react';

const getLoadColor = (value) => {
  if (!value || value === 0) return '#6b7280';
  if (value <= 3) return '#22c55e';
  if (value <= 7) return '#eab308';
  return '#ef4444';
};

const getLoadLabel = (value) => {
  if (!value || value === 0) return '無紀錄';
  if (value <= 3) return '恢復';
  if (value <= 7) return '成長';
  return '力竭';
};

/** 從 data 取得該肌群的負荷值，支援 chest/shoulders/arms 等彙總 key 的對應 */
const getValue = (data, key) => {
  if (data[key] !== undefined && data[key] !== null) return data[key];
  const fallbacks = {
    pecs: ['chest'],
    delts: ['shoulders'],
    traps: ['back', 'shoulders'],
    biceps: ['arms'],
    forearms: ['arms'],
    abs: ['abs'],
    obliques: ['abs'],
    quads: ['legs'],
    calves: ['legs'],
    rear_delts: ['shoulders'],
    triceps: ['arms'],
    lats: ['back'],
    lower_back: ['back', 'core'],
    glutes: ['legs'],
    hamstrings: ['legs'],
  };
  for (const k of fallbacks[key] || []) {
    if (data[k] !== undefined && data[k] !== null) return data[k];
  }
  return 0;
};

const MUSCLE_LIST = [
  { key: 'traps', name: '斜方肌' },
  { key: 'pecs', name: '胸大肌' },
  { key: 'delts', name: '三角肌' },
  { key: 'rear_delts', name: '三角肌後束' },
  { key: 'biceps', name: '肱二頭肌' },
  { key: 'triceps', name: '肱三頭肌' },
  { key: 'forearms', name: '前臂' },
  { key: 'abs', name: '腹直肌' },
  { key: 'obliques', name: '腹外斜肌' },
  { key: 'lats', name: '背闊肌' },
  { key: 'lower_back', name: '豎脊肌' },
  { key: 'glutes', name: '臀大肌' },
  { key: 'quads', name: '股四頭肌' },
  { key: 'hamstrings', name: '膕旁肌' },
  { key: 'calves', name: '小腿' },
];

export default function BodyHeatmap({ data = {} }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#fafaf8] rounded-game p-4 border-[3px] border-game-outline shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={14} className="text-game-grass shrink-0" aria-hidden />
        <h3 className="text-gray-900 font-bold text-sm">肌群負荷</h3>
      </div>

      <ul className="space-y-2 overflow-y-auto flex-1 min-h-0">
        {MUSCLE_LIST.map(({ key, name }) => {
          const value = getValue(data, key);
          const color = getLoadColor(value);
          const label = getLoadLabel(value);
          return (
            <li
              key={key}
              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-game bg-white/70 border-2 border-game-outline/50"
            >
              <span className="text-gray-900 text-sm font-bold">{name}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-800 text-xs tabular-nums font-bold">{value}/10</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-game-outline/50"
                  style={{ backgroundColor: color }}
                  title={label}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 pt-3 border-t-2 border-game-outline/50 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-bold text-gray-800">
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 align-middle mr-1" aria-hidden />無紀錄</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle mr-1" aria-hidden />恢復</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 align-middle mr-1" aria-hidden />成長</span>
        <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 align-middle mr-1" aria-hidden />力竭</span>
      </div>
    </div>
  );
}
