/**
 * 綜合訓練建議區（肌群平衡、跑步、動作優化）
 */
import React from 'react';
import { Dumbbell, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

export default function TrainingAdviceSection({ stats, z2Lower, z2Upper }) {
  const weeklyDist = parseFloat(stats?.weeklyDistance) || 0;
  const muscleEntries = Object.entries(stats?.muscleFatigue || {});
  const topMuscle = muscleEntries.sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="space-y-3 flex-1">
      <div className="p-3 rounded-game bg-surface-900/60 border-2 border-game-outline/50">
        <div className="flex items-center gap-2 mb-1.5">
          <Dumbbell className="text-game-grass" size={14} aria-hidden />
          <h4 className="font-semibold text-white text-sm">重訓：肌群平衡</h4>
        </div>
        {muscleEntries.length > 0 ? (
          <p className="text-sm text-gray-400 leading-relaxed">
            數據顯示
            <span className="text-game-grass font-bold mx-1">{topMuscle}</span>
            是您最近最強化的部位。建議這幾天可以安排拮抗肌群或核心訓練來平衡身體發展。
          </p>
        ) : (
          <p className="text-sm text-gray-400">開始紀錄您的第一次重訓，AI 將為您分析肌群分佈。</p>
        )}
      </div>

      <div className="p-3 rounded-game bg-surface-900/60 border-2 border-game-outline/50">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="text-game-coin" size={14} aria-hidden />
          <h4 className="font-semibold text-white text-sm">跑步：進度管理</h4>
        </div>
        {weeklyDist > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 leading-relaxed">
              本週跑量 <span className="text-white font-bold">{stats.weeklyDistance} km</span>。
              為預防受傷，下週總里程建議控制在 <span className="text-game-coin font-bold">{(weeklyDist * 1.1).toFixed(1)} km</span> 以內 (10%原則)。
            </p>
            <div className="text-xs text-gray-500 bg-surface-800/40 px-2 py-1.5 rounded-game border border-game-outline/40 flex justify-between items-center mt-2">
              <span>Zone 2 目標心率</span>
              <span className="font-mono text-game-grass font-semibold">{z2Lower}–{z2Upper} bpm</span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-400 leading-relaxed">
              本週尚未有跑步紀錄。建議安排一次輕鬆跑，將心率維持在 <span className="text-game-grass font-semibold">Zone 2</span> 以建立有氧底層。
            </p>
            <div className="text-xs text-gray-500 bg-surface-800/40 px-2 py-1.5 rounded-game border border-game-outline/40 flex justify-between items-center mt-2">
              <span>Zone 2 目標心率</span>
              <span className="font-mono text-game-grass font-semibold">{z2Lower}–{z2Upper} bpm</span>
            </div>
          </div>
        )}
      </div>

      <div className={`p-3 rounded-game border-2 transition-colors ${stats?.latestAnalysis ? 'bg-game-coin/15 border-game-coin/40' : 'bg-surface-900/60 border-game-outline/50'}`}>
        <h4 className="font-semibold text-game-coin mb-1.5 text-sm flex items-center gap-2">
          {stats?.latestAnalysis ? <Sparkles size={14} aria-hidden /> : <AlertCircle size={14} aria-hidden />}
          動作優化建議
        </h4>
        {stats?.latestAnalysis ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-mono mb-1">來源: {stats.latestAnalysis.title}</p>
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-6">{stats.latestAnalysis.feedback}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            尚無動作分析紀錄。請前往「動作分析」功能上傳影片，獲取專業姿勢建議。
          </p>
        )}
      </div>
    </div>
  );
}
