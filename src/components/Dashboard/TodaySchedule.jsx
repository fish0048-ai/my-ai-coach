/**
 * 今日訓練課表區塊
 */
import React from 'react';
import { CalendarClock, TrendingUp, Dumbbell, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useViewStore } from '../../store/viewStore';

export default function TodaySchedule({ workouts }) {
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  return (
    <div className="card-base p-4">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <CalendarClock className="text-game-grass" size={18} aria-hidden />
        今日訓練課表
      </h3>
      {workouts?.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className={`flex items-center justify-between p-3 rounded-game border-2 transition-all ${
                workout.status === 'completed' ? 'bg-game-grass/15 border-game-grass/40' : 'bg-game-outline/10 border-game-outline/40'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-game border border-game-outline/50 ${workout.type === 'run' ? 'bg-game-coin/20 text-game-coin' : 'bg-game-grass/20 text-game-grass'}`}>
                  {workout.type === 'run' ? <TrendingUp size={20} aria-hidden /> : <Dumbbell size={20} aria-hidden />}
                </div>
                <div>
                  <h4 className={`font-bold ${workout.status === 'completed' ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                    {workout.title}
                  </h4>
                  <p className="text-xs text-gray-700">
                    {workout.type === 'run'
                      ? `目標: ${workout.runDistance || '?'} km / ${workout.runDuration || '?'} min`
                      : `目標: ${workout.exercises?.length || 0} 組動作`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {workout.status === 'completed' ? (
                  <div className="flex items-center gap-1 text-game-grass text-xs font-bold bg-game-grass/25 px-3 py-1.5 rounded-game border border-game-outline/50">
                    <CheckCircle2 size={14} aria-hidden /> 已完成
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-800 text-xs font-medium bg-game-outline/10 px-3 py-1.5 rounded-game border-2 border-game-outline/50">
                    <Circle size={14} aria-hidden /> 待執行
                  </div>
                )}
              </div>
            </div>
          ))}
          {workouts.some((w) => w.status !== 'completed') && (
            <div className="text-right mt-2">
              <button
                onClick={() => setCurrentView('calendar')}
                className="text-xs text-game-grass hover:text-game-grass/90 flex items-center justify-end gap-1 cursor-pointer hover:underline transition-colors"
              >
                前往行事曆打卡 <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-700 mb-2 font-medium">今天尚無安排訓練計畫。</p>
          <p className="text-sm text-gray-700">休息是為了走更長遠的路，或是前往行事曆安排自主訓練？</p>
        </div>
      )}
    </div>
  );
}
