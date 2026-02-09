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
      return 'bg-game-coin/20 border-game-coin text-game-coin';
    case 'running':
      return 'bg-game-grass/20 border-game-grass text-game-grass';
    case 'strength':
      return 'bg-game-grass/20 border-game-outline text-game-grass';
    case 'special':
      return 'bg-game-coin/20 border-game-coin text-game-coin';
    default:
      return 'bg-game-outline/10 border-game-outline text-gray-900';
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
    <div className={`rounded-game border-2 ${colorClass} ${sizeClasses[size]} transition-all hover:scale-105 cursor-pointer`}>
      <div className="flex items-center gap-2">
        <div className="text-2xl">{achievement.icon || '🏆'}</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate text-gray-900">{achievement.name}</div>
          <div className="text-xs font-medium text-gray-800 truncate">{achievement.description}</div>
          {achievement.unlockedDate && (
            <div className="text-[10px] font-medium text-gray-700 mt-1">
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
