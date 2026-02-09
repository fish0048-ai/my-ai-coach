import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * 訓練習慣設定組件
 * 包含預計訓練日和偏好時段設定
 */
export default function TrainingScheduleSection({ profile, isEditing, onDayToggle, onTrainingTimeChange }) {
  return (
    <div className="card-base rounded-game border-[3px] border-game-outline p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="text-game-grass" />
        <h3 className="font-bold text-gray-900">一般訓練習慣</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-700 uppercase font-semibold mb-2 block">預計訓練日</label>
          <div className="grid grid-cols-4 gap-2">
            {weekDays.map(day => (
              <button
                key={day}
                onClick={() => onDayToggle(day)}
                disabled={!isEditing}
                className={`py-2 rounded-game text-xs font-bold min-h-[44px] border-[3px] transition-colors ${
                  profile.trainingDays.includes(day)
                    ? 'bg-game-grass text-game-outline border-game-grass'
                    : 'bg-[#fafaf8] text-gray-800 border-game-outline hover:bg-game-grass/10'
                } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-700 uppercase font-semibold mb-2 block flex items-center gap-1">
            <Clock size={12} className="text-game-grass"/> 偏好時段
          </label>
          <input 
            type="time" 
            value={profile.trainingTime}
            disabled={!isEditing}
            onChange={(e) => onTrainingTimeChange(e.target.value)}
            className="input-base w-full disabled:opacity-50 appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
