/**
 * 本週跑步統計區
 */
import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function RunningStatsSection({ stats }) {
  return (
    <section className="bg-gray-800/60 rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/50">
        <TrendingUp className="text-green-400" size={18} />
        <h3 className="text-base font-bold text-white">本週跑步</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        <div className="p-4 text-center md:border-r border-gray-700/40">
          <p className="text-xs text-gray-500 mb-0.5">週跑量</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats?.weeklyDistance ?? 0} <span className="text-sm font-medium text-gray-500">km</span></p>
        </div>
        <div className="p-4 text-center md:border-r border-gray-700/40">
          <p className="text-xs text-gray-500 mb-0.5">週次數</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats?.weeklyRuns ?? 0} <span className="text-sm font-medium text-gray-500">次</span></p>
        </div>
        <div className="p-4 text-center md:border-r border-gray-700/40">
          <p className="text-xs text-gray-500 mb-0.5">最長距離</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats?.longestRun ?? 0} <span className="text-sm font-medium text-gray-500">km</span></p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-gray-500 mb-0.5">Zone 2 佔比</p>
          <p className="text-xl font-bold text-green-400 tabular-nums">{stats?.zone2Percent ?? 0} <span className="text-sm font-medium text-gray-500">%</span></p>
        </div>
      </div>
    </section>
  );
}
