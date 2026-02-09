import React from 'react';
import { Timer, Heart } from 'lucide-react';
import HeartRateZones from './HeartRateZones';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * 跑步訓練安排組件
 * 包含長距離日、間歇跑、輕鬆跑設定和心率區間顯示
 */
export default function RunningScheduleSection({ profile, isEditing, activeMaxHR, hasManualMaxHR, age, onLongRunDayChange, onIntervalDayChange, onEasyRunDayToggle }) {
  return (
    <div className="card-base rounded-game border-[3px] border-game-outline p-6">
      <div className="flex items-center gap-2 mb-4">
        <Timer className="text-game-grass" />
        <h3 className="font-bold text-gray-900">跑步訓練安排</h3>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-700 uppercase font-semibold">🐢 長距離日 (LSD)</label>
            <select 
              value={profile.longRunDay}
              disabled={!isEditing}
              onChange={(e) => onLongRunDayChange(e.target.value)}
              className="input-base w-full disabled:opacity-50 appearance-none"
            >
              <option value="">選擇星期...</option>
              {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-700 uppercase font-semibold">🐇 間歇跑 (Interval)</label>
            <select 
              value={profile.intervalDay}
              disabled={!isEditing}
              onChange={(e) => onIntervalDayChange(e.target.value)}
              className="input-base w-full disabled:opacity-50 appearance-none"
            >
              <option value="">選擇星期...</option>
              {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">👟 輕鬆跑 (Easy Run)</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day}
                onClick={() => onEasyRunDayToggle(day)}
                disabled={!isEditing}
                className={`py-2 rounded-game text-xs font-bold min-h-[44px] border-[3px] transition-colors ${
                  profile.easyRunDays.includes(day)
                    ? 'bg-game-grass text-game-outline border-game-grass'
                    : 'bg-[#fafaf8] text-gray-800 border-game-outline hover:bg-game-grass/10'
                } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* 心率區間自動計算 */}
        <HeartRateZones 
          activeMaxHR={activeMaxHR}
          hasManualMaxHR={hasManualMaxHR}
          age={age}
        />
      </div>
    </div>
  );
}
