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
      className="card-base p-4 rounded-game cursor-pointer flex justify-between items-center group hover:border-game-grass transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-game border-2 border-game-outline/50 ${isRun ? 'bg-game-coin/20 text-gray-900' : 'bg-game-grass/20 text-gray-900'}`}>
          {isRun ? <Activity size={24} aria-hidden /> : <Dumbbell size={24} aria-hidden />}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{workout.title || (isRun ? '跑步' : '訓練')}</h3>
          <p className="text-xs font-medium text-gray-700">{subtitle}</p>
          {usedGear && (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-800">
              <ShoppingBag size={10} aria-hidden /> {usedGear.brand} {usedGear.model}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Edit3 size={18} className="text-gray-700 group-hover:text-gray-900" aria-hidden />
        <button
          onClick={(e) => onStatusToggle(e, workout)}
          className={`p-2 rounded-game border-2 transition-colors ${workout.status === 'completed' ? 'text-gray-900 bg-game-grass/20 border-game-grass/50' : 'text-gray-700 hover:text-gray-900 border-game-outline/50'}`}
          aria-label={workout.status === 'completed' ? '標記為未完成' : '標記為已完成'}
        >
          <CheckCircle2 size={24} fill={workout.status === 'completed' ? 'currentColor' : 'none'} aria-hidden />
        </button>
      </div>
    </div>
  );
}
