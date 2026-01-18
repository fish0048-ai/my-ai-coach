import React, { useState } from 'react';
import { Calendar, Dumbbell, Activity, Sparkles, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { generateTrainingPlan, PLAN_TYPES } from '../services/ai/workoutGenerator';
import { handleError } from '../services/errorService';
import { useViewStore } from '../store/viewStore';
import { createCalendarWorkout } from '../services/calendarService';

/**
 * 訓練計劃推薦頁面
 */
export default function TrainingPlanView() {
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  const [selectedPlanType, setSelectedPlanType] = useState(null);
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleGeneratePlan = async () => {
    if (!selectedPlanType) {
      handleError('請選擇一個訓練計劃類型', { context: 'TrainingPlanView', operation: 'handleGeneratePlan' });
      return;
    }

    setLoading(true);
    try {
      const plan = await generateTrainingPlan({
        planType: selectedPlanType,
        weeks: weeks
      });
      setGeneratedPlan(plan);
    } catch (error) {
      // 錯誤已在 workoutGenerator 中處理
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToCalendar = async () => {
    if (!generatedPlan || !generatedPlan.workouts) return;

    setLoading(true);
    try {
      // 將計劃應用到行事曆
      const promises = generatedPlan.workouts.map(async (workout) => {
        // 計算實際日期（簡化版：從下週一開始）
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() + daysUntilMonday);
        
        const weekOffset = (workout.week - 1) * 7;
        const dayOffset = workout.day - 1;
        const workoutDate = new Date(startDate);
        workoutDate.setDate(startDate.getDate() + weekOffset + dayOffset);
        
        const dateStr = workoutDate.toISOString().split('T')[0];

        await createCalendarWorkout({
          date: dateStr,
          status: 'planned',
          type: workout.type || 'strength',
          title: workout.title || '訓練計劃',
          exercises: workout.exercises || [],
          notes: workout.notes || '',
          updatedAt: new Date().toISOString()
        });
      });

      await Promise.all(promises);
      handleError('訓練計劃已成功新增到行事曆！', { context: 'TrainingPlanView', operation: 'handleApplyToCalendar' });
      setCurrentView('calendar');
    } catch (error) {
      handleError(error, { context: 'TrainingPlanView', operation: 'handleApplyToCalendar' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="text-gray-400" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">訓練計劃推薦</h1>
          <p className="text-gray-400 text-sm">選擇適合你的訓練計劃，AI 將為你生成個人化方案</p>
        </div>
      </div>

      {/* 计划类型选择 */}
      {!generatedPlan && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} />
            選擇訓練計劃類型
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(PLAN_TYPES).map(([key, plan]) => (
              <button
                key={key}
                onClick={() => setSelectedPlanType(key)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedPlanType === key
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {plan.focus === 'endurance' || plan.focus === 'speed' ? (
                    <Activity className="text-green-400" size={20} />
                  ) : (
                    <Dumbbell className="text-blue-400" size={20} />
                  )}
                  <h3 className="font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-2">{plan.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {plan.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    每周 {plan.frequency} 次
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* 周数选择 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              計劃週數
            </label>
            <select
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value))}
              className="w-full md:w-48 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value={4}>4 周</option>
              <option value={6}>6 周</option>
              <option value={8}>8 周</option>
              <option value={12}>12 周</option>
            </select>
          </div>

          {/* 生成按钮 */}
          <button
            onClick={handleGeneratePlan}
            disabled={!selectedPlanType || loading}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>生成訓練計劃</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 生成的计划展示 */}
      {generatedPlan && (
        <div className="space-y-6">
          {/* 计划概览 */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{generatedPlan.name}</h2>
                <p className="text-gray-400">{generatedPlan.description}</p>
              </div>
              <button
                onClick={() => setGeneratedPlan(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                重新選擇
              </button>
            </div>

            {generatedPlan.tips && generatedPlan.tips.length > 0 && (
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">訓練建議</h3>
                <ul className="space-y-1">
                  {generatedPlan.tips.map((tip, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <CheckCircle2 className="text-blue-400 mt-0.5 flex-shrink-0" size={14} />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 训练安排 */}
          {generatedPlan.workouts && generatedPlan.workouts.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h3 className="text-lg font-bold text-white mb-4">訓練安排</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generatedPlan.workouts.map((workout, idx) => (
                  <div key={idx} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-400 bg-gray-800 px-2 py-1 rounded">
                        第 {workout.week} 週 · 第 {workout.day} 天
                      </span>
                      <span className="text-sm font-bold text-white">{workout.title}</span>
                    </div>
                    {workout.exercises && workout.exercises.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {workout.exercises.map((ex, exIdx) => (
                          <div key={exIdx} className="text-sm text-gray-300">
                            {ex.name} - {ex.sets}组 × {ex.reps}次
                            {ex.weight && ` (${ex.weight})`}
                            {ex.rest && ` · 休息 ${ex.rest}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {workout.notes && (
                      <p className="text-xs text-gray-500 mt-2">{workout.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 应用到日历按钮 */}
          <button
            onClick={handleApplyToCalendar}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>新增中...</span>
              </>
            ) : (
              <>
                <Calendar size={20} />
                <span>應用到行事曆</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}