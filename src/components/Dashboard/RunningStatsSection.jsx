/**
 * 本週跑步統計區
 */
import React from 'react';
import { TrendingUp } from 'lucide-react';

export default function RunningStatsSection({ stats }) {
  return (
    <section className="card-base overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-game-outline bg-game-grass/15">
        <TrendingUp className="text-game-grass" size={18} aria-hidden />
        <h3 className="text-base font-bold text-gray-900">本週跑步</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        <div className="p-4 text-center md:border-r border-game-outline/40">
          <p className="text-xs font-medium text-gray-700 mb-0.5">週跑量</p>
          <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.weeklyDistance ?? 0} <span className="text-sm font-medium text-gray-700">km</span></p>
        </div>
        <div className="p-4 text-center md:border-r border-game-outline/40">
          <p className="text-xs font-medium text-gray-700 mb-0.5">週次數</p>
          <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.weeklyRuns ?? 0} <span className="text-sm font-medium text-gray-700">次</span></p>
        </div>
        <div className="p-4 text-center md:border-r border-game-outline/40">
          <p className="text-xs font-medium text-gray-700 mb-0.5">最長距離</p>
          <p className="text-xl font-bold text-gray-900 tabular-nums">{stats?.longestRun ?? 0} <span className="text-sm font-medium text-gray-700">km</span></p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs font-medium text-gray-700 mb-0.5">Zone 2 佔比</p>
          <p className="text-xl font-bold text-game-grass tabular-nums">{stats?.zone2Percent ?? 0} <span className="text-sm font-medium text-gray-700">%</span></p>
        </div>
      </div>
    </section>
  );
}
