/**
 * 動作/動態資料面板（重訓/跑步分析共用）
 */
import React from 'react';
import { Edit2, Activity } from 'lucide-react';

export default function MetricsPanel({ metrics, title, onUpdateMetric }) {
  if (!metrics) return null;

  return (
    <div className="card-base p-5 rounded-game border-[3px] border-game-outline space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-gray-900 font-bold">{title}</h3>
        <span className="text-xs font-medium text-game-coin"><Edit2 size={10} className="inline" /> 可修正</span>
      </div>
      {Object.entries(metrics).map(([k, m]) => (
        <div key={k} className="flex justify-between items-center bg-white/60 p-3 rounded-game border-2 border-game-outline/50">
          <span className="text-gray-800 text-sm font-medium flex items-center gap-2">
            {m.icon ? <m.icon size={14} className="text-game-grass" /> : <Activity size={14} className="text-game-grass" />} {m.label}
          </span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={m.value}
              onChange={(e) => onUpdateMetric?.(k, e.target.value)}
              className={`input-base text-right font-bold w-16 min-h-[36px] ${m.status === 'good' ? 'text-game-grass' : 'text-game-coin'}`}
            />
            <span className="text-xs font-medium text-gray-700">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
