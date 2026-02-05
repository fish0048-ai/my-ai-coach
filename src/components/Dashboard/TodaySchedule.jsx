/**
 * 今日訓練課表區塊
 */
import React from 'react';
import { CalendarClock, TrendingUp, Dumbbell, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { useViewStore } from '../../store/viewStore';

export default function TodaySchedule({ workouts }) {
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700/50 p-4">
      <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
        <CalendarClock className="text-blue-400" size={18} />
        今日訓練課表
      </h3>
      {workouts?.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                workout.status === 'completed' ? 'bg-green-900/15 border-green-500/25' : 'bg-gray-800/50 border-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${workout.type === 'run' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {workout.type === 'run' ? <TrendingUp size={20} /> : <Dumbbell size={20} />}
                </div>
                <div>
                  <h4 className={`font-bold ${workout.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                    {workout.title}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {workout.type === 'run'
                      ? `目標: ${workout.runDistance || '?'} km / ${workout.runDuration || '?'} min`
                      : `目標: ${workout.exercises?.length || 0} 組動作`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {workout.status === 'completed' ? (
                  <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-900/30 px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={14} /> 已完成
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-gray-400 text-xs bg-gray-700/50 px-3 py-1.5 rounded-full border border-gray-600">
                    <Circle size={14} /> 待執行
                  </div>
                )}
              </div>
            </div>
          ))}
          {workouts.some((w) => w.status !== 'completed') && (
            <div className="text-right mt-2">
              <button
                onClick={() => setCurrentView('calendar')}
                className="text-xs text-blue-300 hover:text-blue-200 flex items-center justify-end gap-1 cursor-pointer hover:underline transition-colors"
              >
                前往行事曆打卡 <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-400 mb-2">今天尚無安排訓練計畫。</p>
          <p className="text-xs text-gray-500">休息是為了走更長遠的路，或是前往行事曆安排自主訓練？</p>
        </div>
      )}
    </div>
  );
}
