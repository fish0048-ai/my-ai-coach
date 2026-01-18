import React from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * 訓練習慣設定組件
 * 包含預計訓練日和偏好時段設定
 */
export default function TrainingScheduleSection({ profile, isEditing, onDayToggle, onTrainingTimeChange }) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarIcon className="text-blue-500" />
        <h3 className="font-bold text-white">一般訓練習慣</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase font-semibold mb-2 block">預計訓練日</label>
          <div className="grid grid-cols-4 gap-2">
            {weekDays.map(day => (
              <button
                key={day}
                onClick={() => onDayToggle(day)}
                disabled={!isEditing}
                className={`py-1.5 rounded text-xs font-medium transition-colors ${
                  profile.trainingDays.includes(day)
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                    : 'bg-gray-900 text-gray-500 hover:bg-gray-700'
                } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-500 uppercase font-semibold mb-2 block flex items-center gap-1">
            <Clock size={12}/> 偏好時段
          </label>
          <input 
            type="time" 
            value={profile.trainingTime}
            disabled={!isEditing}
            onChange={(e) => onTrainingTimeChange(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
          />
        </div>
      </div>
    </div>
  );
}
