/**
 * 行事曆月曆網格
 */
import React from 'react';
import { Clock } from 'lucide-react';
import { formatDate } from '../../utils/date';

export default function CalendarGrid({
  days,
  currentDate,
  workouts,
  selectedDate,
  dragOverDate,
  onDragStart,
  onDrop,
  onDateClick,
  onDragOver,
}) {
  const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
  const todayStr = formatDate(new Date());

  return (
    <>
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-800 font-bold">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 auto-rows-fr">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} className="bg-transparent aspect-square" />;
          const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = formatDate(cellDate);
          const dayWorkouts = workouts[dateStr] || [];
          const isSelected = formatDate(selectedDate) === dateStr;
          const isToday = todayStr === dateStr;
          const isDragOver = dragOverDate === dateStr;

          let bgClass = 'bg-[#fafaf8] border-[3px] border-game-outline';
          let textClass = 'text-gray-900';
          if (isDragOver) {
            bgClass = 'bg-game-grass/30 border-[3px] border-game-grass border-dashed scale-105 shadow-card';
            textClass = 'text-gray-900';
          } else if (isSelected) {
            bgClass = 'bg-game-grass/20 border-[3px] border-game-grass';
            textClass = 'text-gray-900';
          }

          return (
            <div
              key={idx}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOver(dateStr);
              }}
              onDrop={(e) => onDrop(e, dateStr)}
              onClick={() => onDateClick(cellDate)}
              className={`relative p-2 rounded-game border-[3px] transition-all cursor-pointer flex flex-col hover:opacity-90 aspect-square overflow-hidden ${bgClass} ${
                isToday ? 'ring-2 ring-game-grass ring-offset-2 ring-offset-[#fafaf8]' : ''
              }`}
            >
              <span className={`text-sm font-bold ${textClass}`}>{day}</span>
              <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                {dayWorkouts.map((workout, wIdx) => {
                  const isRun = workout.type === 'run';
                  let title = workout.title;
                  if (isRun && workout.runType === 'Interval' && workout.runIntervalSets) {
                    const pace = workout.runIntervalPace ? ` (${workout.runIntervalPace})` : '';
                    const duration = workout.runIntervalDuration ? ` × ${workout.runIntervalDuration}秒` : '';
                    const rest = workout.runIntervalRest ? ` / 休息${workout.runIntervalRest}秒` : '';
                    title += ` | ${workout.runIntervalSets}組${pace}${duration}${rest}`;
                  }
                  return (
                    <div
                      key={workout.id || wIdx}
                      draggable
                      onDragStart={(e) => onDragStart(e, workout)}
                      className={`text-xs font-bold px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity text-gray-900 ${
                        workout.status === 'planned'
                          ? 'border-2 border-game-grass/50 border-dashed bg-game-grass/10'
                          : isRun
                            ? 'bg-game-coin/20'
                            : 'bg-game-grass/20'
                      }`}
                      title={title}
                    >
                      {workout.status === 'planned' && <Clock size={8} className="text-gray-900" aria-hidden />}
                      {workout.title || (isRun ? '跑步' : '訓練')}
                      {isRun && workout.runType === 'Interval' && workout.runIntervalSets && (
                        <span className="text-[10px] font-bold text-gray-800">({workout.runIntervalSets}組)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
