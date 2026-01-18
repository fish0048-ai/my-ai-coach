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
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col items-center text-center">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 ring-4 ring-gray-800 shadow-xl overflow-hidden">
            {userData?.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{userData?.name?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
        </div>
        <h2 className="text-xl font-bold text-white">{userData?.name || '健身夥伴'}</h2>
        <p className="text-gray-400 text-sm mb-4">{userData?.email}</p>
        
        {calculatedTDEE > 0 && (
          <div className="w-full bg-gray-900/50 rounded-lg p-4 border border-gray-700 mt-2">
            <div className="text-xs text-gray-500 uppercase mb-1">每日建議攝取</div>
            <div className="text-2xl font-bold text-green-400 flex items-center justify-center gap-1">
              <Flame size={20} fill="currentColor" />
              {targetCalories} <span className="text-sm text-gray-400 font-normal">kcal</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              基礎代謝 (BMR): {Math.round(calculatedTDEE / parseFloat(profile.activity))}
              {profile.bmr && <span className="text-blue-400 ml-1">(自訂)</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 w-full mt-2">
          {profile.bodyFat && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase mb-1">體脂率</div>
              <div className="text-lg font-bold text-orange-400 flex items-center justify-center gap-1">
                <Percent size={14} />
                {profile.bodyFat}<span className="text-xs font-normal">%</span>
              </div>
            </div>
          )}
          {profile.muscleRate && (
            <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase mb-1">肌肉率</div>
              <div className="text-lg font-bold text-blue-400 flex items-center justify-center gap-1">
                <Activity size={14} />
                {profile.muscleRate}<span className="text-xs font-normal">%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
