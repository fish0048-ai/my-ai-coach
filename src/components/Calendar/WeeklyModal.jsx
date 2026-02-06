import React from 'react';
import { X, Sparkles, Loader, CheckCircle2, CalendarDays } from 'lucide-react';
import { getWeekDates } from '../../utils/date';

/**
 * 週課表模態框組件
 * @param {Object} props - 組件屬性
 * @param {boolean} props.isOpen - 是否開啟
 * @param {Date} props.currentDate - 當前日期
 * @param {Object} props.workouts - 所有訓練紀錄，格式：{ 'YYYY-MM-DD': [workout1, workout2] }
 * @param {Object} props.weeklyPrefs - 每日期望偏好，格式：{ 'YYYY-MM-DD': ['strength', 'run_easy'] }
 * @param {Function} props.toggleWeeklyPref - 切換偏好的函數
 * @param {Function} props.onClose - 關閉模態框的函數
 * @param {Function} props.onGenerate - 生成週課表的函數
 * @param {boolean} props.loading - 是否正在生成
 */
export default function WeeklyModal({
  isOpen,
  currentDate,
  workouts,
  weeklyPrefs,
  toggleWeeklyPref,
  onClose,
  onGenerate,
  loading
}) {
  if (!isOpen) return null;

  const weekDateList = getWeekDates(currentDate);
  
  // 選項定義（與 CalendarView 保持一致）
  const PREF_OPTIONS = [
    { key: 'strength', label: '🏋️ 重訓', color: 'bg-blue-600' },
    { key: 'run_lsd', label: '🐢 LSD', color: 'bg-orange-600' },
    { key: 'run_interval', label: '🐇 間歇', color: 'bg-red-600' },
    { key: 'run_10_20_30', label: '⏱️ 10-20-30', color: 'bg-pink-600' },
    { key: 'run_easy', label: '👟 輕鬆', color: 'bg-green-600' },
    { key: 'run_mp', label: '🔥 MP', color: 'bg-yellow-600' },
    { key: 'rest', label: '💤 休息', color: 'bg-gray-700' },
    { key: 'auto', label: '✨ 自動', color: 'bg-purple-600' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="card-base bg-surface-900 w-full max-w-3xl rounded-game shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarDays className="text-game-coin" aria-hidden /> 本週總教練排程 (多選模式)
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="關閉"><X size={24} aria-hidden /></button>
        </div>
        
        <div className="bg-game-coin/20 p-4 rounded-game border-2 border-game-coin/40 mb-6 text-sm text-game-outline">
          <p>請設定本週剩餘日期的訓練重點。您可以為同一天選擇多個項目 (例如：重訓 + 輕鬆跑)，AI 將為您生成多筆課表。</p>
        </div>

        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          {weekDateList.map(date => {
            const dayWorkouts = workouts[date] || [];
            const hasCompleted = dayWorkouts.some(w => w.status === 'completed');
            const dayName = new Date(date).toLocaleDateString('zh-TW', { weekday: 'long' });
            const currentPrefs = weeklyPrefs[date] || [];
            
            return (
              <div key={date} className={`p-4 rounded-game border-2 ${hasCompleted ? 'bg-surface-800/60 border-game-outline/40' : 'bg-surface-800 border-game-outline/50'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-gray-400 font-mono text-sm">{date}</span>
                  <span className="text-white font-bold">{dayName}</span>
                  {hasCompleted ?
                    <span className="text-xs bg-game-grass/20 text-game-grass px-2 py-0.5 rounded-game border border-game-outline/50">已完成 (跳過)</span> :
                    <span className="text-xs text-gray-500">請選擇今日訓練 (可複選)</span>
                  }
                </div>
                
                {!hasCompleted && (
                  <div className="flex flex-wrap gap-2">
                    {PREF_OPTIONS.map(opt => {
                      const isSelected = currentPrefs.includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          onClick={() => toggleWeeklyPref(date, opt.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            isSelected 
                              ? `${opt.color} text-white border-transparent shadow-lg scale-105` 
                              : 'bg-gray-900 text-gray-400 border-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {opt.label} {isSelected && <CheckCircle2 size={10} className="inline ml-1"/>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-game-outline/50">
          <button type="button" onClick={onGenerate} disabled={loading} className="btn-primary w-full py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            生成本週複合課表
          </button>
        </div>
      </div>
    </div>
  );
}
