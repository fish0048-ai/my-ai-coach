import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Dumbbell, Activity, Calendar, Award } from 'lucide-react';
import { getAllPRs } from '../../services/calendarService';
import { handleError } from '../../services/errorService';

/**
 * PR (Personal Record) 追踪组件
 * 显示用户的最佳训练记录
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

  // 获取最近更新的 PR（按日期排序）
  const getRecentPRs = () => {
    const recent = [];
    
    // 力量训练 PR
    Object.entries(prs.strengthPRs || {}).forEach(([exerciseName, pr]) => {
      if (pr.max1RMDate) {
        recent.push({
          type: 'strength',
          name: exerciseName,
          label: `最大 1RM`,
          value: `${pr.max1RM} kg`,
          date: pr.max1RMDate,
          icon: Dumbbell,
          color: 'text-blue-400'
        });
      }
      if (pr.maxVolumeDate && (!pr.max1RMDate || pr.maxVolumeDate !== pr.max1RMDate)) {
        recent.push({
          type: 'strength',
          name: exerciseName,
          label: `最大训练量`,
          value: `${Math.round(pr.maxVolume)} kg`,
          date: pr.maxVolumeDate,
          icon: TrendingUp,
          color: 'text-purple-400'
        });
      }
    });

    // 跑步 PR
    if (prs.runPRs?.maxDistanceDate) {
      recent.push({
        type: 'run',
        name: '跑步',
        label: '最长距离',
        value: `${prs.runPRs.maxDistance.toFixed(1)} km`,
        date: prs.runPRs.maxDistanceDate,
        icon: Activity,
        color: 'text-green-400'
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
        color: 'text-yellow-400'
      });
    }

    // 按日期排序（最新的在前）
    return recent.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    }).slice(0, 6); // 最多显示 6 个
  };

  const recentPRs = getRecentPRs();
  const strengthPRCount = Object.keys(prs.strengthPRs || {}).length;
  const hasRunPR = prs.runPRs?.maxDistance || prs.runPRs?.fastestPace;

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (recentPRs.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-yellow-400" size={24} />
          <h3 className="text-xl font-bold text-white">PR 追踪</h3>
        </div>
        <p className="text-gray-400 text-sm">
          还没有记录任何 PR。完成训练后，系统会自动识别并记录你的最佳表现！
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-yellow-400" size={24} />
          <div>
            <h3 className="text-xl font-bold text-white">PR 追踪</h3>
            <p className="text-sm text-gray-400">
              {strengthPRCount > 0 && `${strengthPRCount} 个动作`}
              {strengthPRCount > 0 && hasRunPR && ' · '}
              {hasRunPR && '跑步记录'}
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
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Icon className={`${pr.color} flex-shrink-0`} size={20} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{pr.name}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-400">{pr.label}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-yellow-400">{pr.value}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
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
        <p className="text-xs text-gray-500 mt-4 text-center">
          显示最近 6 个 PR，查看更多请前往训练仪表板
        </p>
      )}
    </div>
  );
}