/**
 * 動作/動態資料面板（重訓/跑步分析共用）
 */
import React from 'react';
import { Edit2, Activity } from 'lucide-react';

export default function MetricsPanel({ metrics, title, onUpdateMetric }) {
  if (!metrics) return null;

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 space-y-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-bold">{title}</h3>
        <span className="text-xs text-yellow-500"><Edit2 size={10} className="inline" /> 可修正</span>
      </div>
      {Object.entries(metrics).map(([k, m]) => (
        <div key={k} className="flex justify-between items-center bg-gray-900/50 p-2 rounded border border-gray-700">
          <span className="text-gray-400 text-sm flex items-center gap-2">
            {m.icon ? <m.icon size={14} /> : <Activity size={14} />} {m.label}
          </span>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={m.value}
              onChange={(e) => onUpdateMetric?.(k, e.target.value)}
              className={`bg-transparent text-right font-bold w-16 outline-none ${m.status === 'good' ? 'text-green-400' : 'text-yellow-400'}`}
            />
            <span className="text-xs text-gray-500">{m.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
