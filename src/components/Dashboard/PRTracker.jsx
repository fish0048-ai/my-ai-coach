import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Dumbbell, Activity, Calendar, Award } from 'lucide-react';
import { getAllPRs } from '../../services/workout/prService';
import { handleError } from '../../services/core/errorService';

/**
 * PR (Personal Record) 追蹤組件
 * 顯示用戶的最佳訓練記錄
 */
export default function PRTracker() {
  const [prs, setPRs] = useState({ strengthPRs: {}, runPRs: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPRs();
  }, []);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const data = await getAllPRs();
      setPRs(data);
    } catch (error) {
      handleError(error, { context: 'PRTracker', operation: 'fetchPRs' });
    } finally {
      setLoading(false);
    }
  };

  // 獲取最近更新的 PR（按日期排序）
  const getRecentPRs = () => {
    const recent = [];
    
    // 力量訓練 PR
    Object.entries(prs.strengthPRs || {}).forEach(([exerciseName, pr]) => {
      if (pr.max1RMDate) {
        recent.push({
          type: 'strength',
          name: exerciseName,
          label: `最大 1RM`,
          value: `${pr.max1RM} kg`,
          date: pr.max1RMDate,
          icon: Dumbbell,
          color: 'text-game-grass'
        });
      }
      if (pr.maxVolumeDate && (!pr.max1RMDate || pr.maxVolumeDate !== pr.max1RMDate)) {
        recent.push({
          type: 'strength',
          name: exerciseName,
          label: `最大訓練量`,
          value: `${Math.round(pr.maxVolume)} kg`,
          date: pr.maxVolumeDate,
          icon: TrendingUp,
          color: 'text-game-coin'
        });
      }
    });

    // 跑步 PR
    if (prs.runPRs?.maxDistanceDate) {
      recent.push({
        type: 'run',
        name: '跑步',
        label: '最長距離',
        value: `${prs.runPRs.maxDistance.toFixed(1)} km`,
        date: prs.runPRs.maxDistanceDate,
        icon: Activity,
        color: 'text-game-grass'
      });
    }
    if (prs.runPRs?.fastestPaceDate) {
      const paceMin = Math.floor(prs.runPRs.fastestPace);
      const paceSec = Math.round((prs.runPRs.fastestPace - paceMin) * 60);
      recent.push({
        type: 'run',
        name: '跑步',
        label: '最快配速',
        value: `${paceMin}'${paceSec.toString().padStart(2, '0')}"`,
        date: prs.runPRs.fastestPaceDate,
        icon: Award,
        color: 'text-game-coin'
      });
    }

    // 按日期排序（最新的在前）
    return recent.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    }).slice(0, 6); // 最多顯示 6 個
  };

  const recentPRs = getRecentPRs();
  const strengthPRCount = Object.keys(prs.strengthPRs || {}).length;
  const hasRunPR = prs.runPRs?.maxDistance || prs.runPRs?.fastestPace;

  if (loading) {
    return (
      <div className="card-base p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-game-outline/20 rounded-game w-1/3" aria-hidden />
          <div className="h-4 bg-game-outline/20 rounded-game w-2/3" aria-hidden />
          <div className="h-4 bg-game-outline/20 rounded-game w-1/2" aria-hidden />
        </div>
      </div>
    );
  }

  if (recentPRs.length === 0) {
    return (
      <div className="card-base p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-game-coin" size={24} aria-hidden />
          <h3 className="text-xl font-bold text-gray-900">PR 追蹤</h3>
        </div>
        <p className="text-gray-800 text-sm font-medium">
          還沒有記錄任何 PR。完成訓練後，系統會自動識別並記錄你的最佳表現！
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-game-coin" size={24} aria-hidden />
          <div>
            <h3 className="text-xl font-bold text-gray-900">PR 追蹤</h3>
            <p className="text-sm text-gray-700 font-medium">
              {strengthPRCount > 0 && `${strengthPRCount} 個動作`}
              {strengthPRCount > 0 && hasRunPR && ' · '}
              {hasRunPR && '跑步記錄'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {recentPRs.map((pr, idx) => {
          const Icon = pr.icon;
          const date = new Date(pr.date);
          const dateStr = date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric'
          });

          return (
            <div
              key={`${pr.type}-${pr.name}-${pr.label}-${idx}`}
              className="flex items-center justify-between p-3 bg-white/80 rounded-game border-2 border-game-outline/50 hover:border-game-grass/60 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className={`${pr.color} flex-shrink-0`} size={20} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{pr.name}</span>
                    <span className="text-xs text-gray-600">·</span>
                    <span className="text-xs font-medium text-gray-700">{pr.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-game-coin">{pr.value}</span>
                    <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Calendar size={12} aria-hidden />
                      {dateStr}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recentPRs.length >= 6 && (
        <p className="text-xs font-medium text-gray-700 mt-4 text-center">
          顯示最近 6 個 PR，查看更多請前往訓練儀表板
        </p>
      )}
    </div>
  );
}