import React from 'react';
import { User, Flame, Percent, Activity } from 'lucide-react';
import { getTargetCalories } from '../../utils/nutritionCalculations';

/**
 * 個人檔案頭部組件
 * 顯示頭像、基本資訊、TDEE、體脂率等
 */
export default function ProfileHeader({ userData, profile, calculatedTDEE }) {
  const targetCalories = getTargetCalories(calculatedTDEE, profile.goal);

  return (
    <div>
      <div className="card-base p-6 flex flex-col items-center text-center">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-game-grass to-game-coin rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 ring-4 ring-game-outline shadow-xl overflow-hidden">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{userData?.name?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{userData?.name || '健身夥伴'}</h2>
        <p className="text-gray-700 text-sm font-medium mb-4">{userData?.email}</p>
        
        {calculatedTDEE > 0 && (
          <div className="w-full bg-[#fafaf8] rounded-game p-4 border-[3px] border-game-outline mt-2 shadow-card">
            <div className="text-xs text-gray-700 uppercase mb-1 font-medium">每日建議攝取</div>
            <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
              <Flame size={20} className="text-gray-800" aria-hidden />
              {targetCalories} <span className="text-sm text-gray-700 font-normal">kcal</span>
            </div>
            <div className="text-xs text-gray-700 mt-2 font-medium">
              基礎代謝 (BMR): {Math.round(calculatedTDEE / parseFloat(profile.activity))}
              {profile.bmr && <span className="text-gray-800 font-bold ml-1">(自訂)</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {profile.bodyFat && (
            <div className="bg-[#fafaf8] rounded-game p-3 border-[3px] border-game-outline shadow-card">
              <div className="text-xs text-gray-700 uppercase mb-1 font-medium">體脂率</div>
              <div className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1">
                <Percent size={14} className="text-gray-800" aria-hidden />
                {profile.bodyFat}<span className="text-xs font-normal text-gray-700">%</span>
              </div>
            </div>
          )}
          {profile.muscleRate && (
            <div className="bg-[#fafaf8] rounded-game p-3 border-[3px] border-game-outline shadow-card">
              <div className="text-xs text-gray-700 uppercase mb-1 font-medium">肌肉率</div>
              <div className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1">
                <Activity size={14} className="text-gray-800" aria-hidden />
                {profile.muscleRate}<span className="text-xs font-normal text-gray-700">%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
