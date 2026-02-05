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
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-gray-400 font-bold">
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

          let bgClass = 'bg-surface-900 border-gray-800';
          let textClass = 'text-gray-300';
          if (isDragOver) {
            bgClass = 'bg-primary-900/40 border-primary-400 border-dashed scale-105 shadow-xl';
          } else if (isSelected) {
            bgClass = 'bg-primary-900/20 border-primary-500';
            textClass = 'text-primary-400';
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
              className={`relative p-2 rounded-card border transition-all cursor-pointer flex flex-col hover:bg-surface-700 aspect-square overflow-hidden ${bgClass} ${
                isToday ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-surface-900' : ''
              }`}
            >
              <span className={`text-sm font-bold ${textClass}`}>{day}</span>
              <div className="mt-1 flex flex-col gap-1 w-full overflow-hidden">
                {dayWorkouts.map((workout, wIdx) => {
                  const isRun = workout.type === 'run';
                  const title =
                    workout.title +
                    (isRun &&
                    workout.runType === 'Interval' &&
                    workout.runIntervalSets
                      ? ` | ${workout.runIntervalSets}組${workout.runIntervalPace ? ` (${workout.runIntervalPace})` : ''}${workout.runIntervalDuration ? ` × ${workout.runIntervalDuration}秒` : ''}${workout.runIntervalRest ? ` / 休息${workout.runIntervalRest}秒` : ''}`
                      : '';
                  return (
                    <div
                      key={workout.id || wIdx}
                      draggable
                      onDragStart={(e) => onDragStart(e, workout)}
                      className={`text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity ${
                        workout.status === 'planned'
                          ? 'border border-primary-500/50 text-primary-300 border-dashed'
                          : isRun
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-accent-500/20 text-accent-400'
                      }`}
                      title={title}
                    >
                      {workout.status === 'planned' && <Clock size={8} />}
                      {workout.title || (isRun ? '跑步' : '訓練')}
                      {isRun && workout.runType === 'Interval' && workout.runIntervalSets && (
                        <span className="text-[9px] opacity-75">({workout.runIntervalSets}組)</span>
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
