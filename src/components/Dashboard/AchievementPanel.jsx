/**
 * 成就面板組件
 * 顯示用戶的所有成就
 */

import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { getUserAchievements, checkAndUnlockAchievements } from '../../services/achievementService';
import AchievementBadge from './AchievementBadge';
import { handleError } from '../../services/core/errorService';

export default function AchievementPanel() {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);

  useEffect(() => {
    loadAchievements();
    // 檢查並解鎖新成就
    checkNewAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const unlocked = await getUserAchievements();
      setAchievements(unlocked);
    } catch (error) {
      handleError(error, { context: 'AchievementPanel', operation: 'loadAchievements' });
    } finally {
      setLoading(false);
    }
  };

  const checkNewAchievements = async () => {
    try {
      const newOnes = await checkAndUnlockAchievements();
      if (newOnes.length > 0) {
        setNewlyUnlocked(newOnes);
        // 重新載入成就列表
        await loadAchievements();
        // 3 秒後清除新解鎖提示
        setTimeout(() => setNewlyUnlocked([]), 3000);
      }
    } catch (error) {
      handleError(error, { context: 'AchievementPanel', operation: 'checkNewAchievements', silent: true });
    }
  };

  if (loading) {
    return (
      <div className="card-base p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-game-coin" size={24} aria-hidden />
          <h3 className="text-xl font-bold text-gray-900">訓練成就</h3>
        </div>
        <p className="text-gray-600 text-sm">載入中...</p>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="card-base p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="text-game-coin" size={24} aria-hidden />
          <h3 className="text-xl font-bold text-gray-900">訓練成就</h3>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          還沒有解鎖任何成就。完成訓練後，系統會自動識別並解鎖成就！
        </p>
        <button
          onClick={checkNewAchievements}
          className="btn-primary px-4 py-2 text-sm"
        >
          <Sparkles size={16} aria-hidden />
          檢查成就
        </button>
      </div>
    );
  }

  // 按類別分組
  const grouped = achievements.reduce((acc, achievement) => {
    const category = achievement.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {});

  const categoryNames = {
    streak: '連續訓練',
    running: '跑步',
    strength: '力量訓練',
    total: '總訓練',
    special: '特殊成就'
  };

  return (
    <div className="card-base p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-game-coin" size={24} aria-hidden />
          <div>
            <h3 className="text-xl font-bold text-gray-900">訓練成就</h3>
            <p className="text-xs text-gray-600">
              已解鎖 {achievements.length} 個成就
            </p>
          </div>
        </div>
        {newlyUnlocked.length > 0 && (
          <div className="flex items-center gap-1 text-game-grass text-sm animate-pulse">
            <Sparkles size={16} aria-hidden />
            <span>新解鎖 {newlyUnlocked.length} 個成就！</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
              {categoryNames[category] || category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  size="sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={checkNewAchievements}
        className="btn-secondary mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm"
      >
        <Sparkles size={16} aria-hidden />
        檢查新成就
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
