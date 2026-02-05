/**
 * 訓練卡片元件（行事曆當日清單用）
 * 可重用於 modal 清單檢視
 */
import React from 'react';
import { Activity, Dumbbell, Edit3, CheckCircle2, ShoppingBag } from 'lucide-react';

export default function WorkoutCard({ workout, gears, onEdit, onStatusToggle }) {
  const usedGear = gears?.find((g) => g.id === workout.gearId);
  const isRun = workout.type === 'run';

  const subtitle =
    isRun
      ? `${workout.runDistance || ''}km${
          (workout.runType === 'Interval' || workout.runType === '10-20-30') && workout.runIntervalSets
            ? ` | ${workout.runIntervalSets}${workout.runType === '10-20-30' ? '組區塊' : '組'}${workout.runIntervalPace ? ` (${workout.runIntervalPace})` : ''}${workout.runIntervalPower ? ` [${workout.runIntervalPower}W]` : ''}${workout.runIntervalDuration ? ` × ${workout.runIntervalDuration}秒` : ''}${workout.runIntervalRest ? ` / 休息${workout.runIntervalRest}秒` : ''}`
            : ''
        }`
      : `${workout.exercises?.length || 0}動作`;

  return (
    <div
      onClick={() => onEdit(workout)}
      className="bg-surface-800 p-4 rounded-xl border border-gray-800 cursor-pointer flex justify-between items-center group hover:border-primary-500 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-lg ${isRun ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}
        >
          {isRun ? <Activity size={24} /> : <Dumbbell size={24} />}
        </div>
        <div>
          <h3 className="font-bold text-white">{workout.title || (isRun ? '跑步' : '訓練')}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
          {usedGear && (
            <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-300">
              <ShoppingBag size={10} /> {usedGear.brand} {usedGear.model}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Edit3 size={18} className="text-gray-600 group-hover:text-white" />
        <button
          onClick={(e) => onStatusToggle(e, workout)}
          className={`p-2 rounded-full transition-colors ${workout.status === 'completed' ? 'text-green-500 bg-green-900/20' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <CheckCircle2 size={24} fill={workout.status === 'completed' ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}
