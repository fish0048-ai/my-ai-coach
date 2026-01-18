/**
 * 成就徽章組件
 * 顯示單個成就徽章
 */

import React from 'react';
import { Trophy, Award, Medal, Star } from 'lucide-react';

/**
 * 根據成就類別獲取圖示
 */
const getCategoryIcon = (category) => {
  switch (category) {
    case 'streak':
      return Trophy;
    case 'running':
      return Award;
    case 'strength':
      return Medal;
    case 'special':
      return Star;
    default:
      return Trophy;
  }
};

/**
 * 根據成就類別獲取顏色
 */
const getCategoryColor = (category) => {
  switch (category) {
    case 'streak':
      return 'bg-orange-500/20 border-orange-500 text-orange-400';
    case 'running':
      return 'bg-green-500/20 border-green-500 text-green-400';
    case 'strength':
      return 'bg-blue-500/20 border-blue-500 text-blue-400';
    case 'special':
      return 'bg-purple-500/20 border-purple-500 text-purple-400';
    default:
      return 'bg-gray-500/20 border-gray-500 text-gray-400';
  }
};

export default function AchievementBadge({ achievement, size = 'md' }) {
  if (!achievement) return null;

  const Icon = getCategoryIcon(achievement.category);
  const colorClass = getCategoryColor(achievement.category);
  
  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base'
  };

  return (
    <div className={`rounded-lg border-2 ${colorClass} ${sizeClasses[size]} transition-all hover:scale-105 cursor-pointer`}>
      <div className="flex items-center gap-2">
        <div className="text-2xl">{achievement.icon || '🏆'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{achievement.name}</div>
          <div className="text-xs opacity-80 truncate">{achievement.description}</div>
          {achievement.unlockedDate && (
            <div className="text-[10px] opacity-60 mt-1">
              {new Date(achievement.unlockedDate).toLocaleDateString('zh-TW', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
