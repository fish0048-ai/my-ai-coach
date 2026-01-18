import React from 'react';
import { Heart } from 'lucide-react';
import { calculateHeartRateZones } from '../../utils/heartRateCalculations';

/**
 * 心率區間顯示組件
 */
export default function HeartRateZones({ activeMaxHR, hasManualMaxHR, age }) {
  const zones = calculateHeartRateZones(activeMaxHR);

  return (
    <div className="mt-6 pt-6 border-t border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1">
          <Heart size={12} className="text-red-500" /> 心率區間 (最大心率: {activeMaxHR || '--'} bpm {hasManualMaxHR ? '(自訂)' : '(估算)'})
        </label>
      </div>
      
      {!activeMaxHR ? (
        <div className="text-sm text-gray-500 text-center py-2">請輸入「年齡」或「最大心率」以計算區間</div>
      ) : (
        <div className="space-y-2">
          {zones.map((z, idx) => (
            <div key={idx} className={`flex justify-between items-center p-2 rounded ${z.bg}`}>
              <span className={`text-xs font-bold ${z.color}`}>{z.label}</span>
              <span className="text-xs text-white font-mono">{z.range} bpm</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
