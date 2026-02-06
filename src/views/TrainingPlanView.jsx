import React, { useState } from 'react';
import { Calendar, Dumbbell, Activity, Sparkles, CheckCircle2, Clock, ArrowLeft, Map } from 'lucide-react';
import { generateTrainingPlan, PLAN_TYPES } from '../services/ai/workoutGenerator';
import { handleError } from '../services/core/errorService';
import { useViewStore } from '../store/viewStore';
import { createCalendarWorkout } from '../services/calendarService';
import { generateRaceStrategy } from '../utils/workoutCalculations';
import { downloadHalfMarathonPaceBandPDF } from '../utils/reportGenerator';

/**
 * 訓練計劃推薦頁面
 */
export default function TrainingPlanView() {
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  const [selectedPlanType, setSelectedPlanType] = useState(null);
  const [weeks, setWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [targetPB, setTargetPB] = useState('');
  const [targetRaceDate, setTargetRaceDate] = useState('');
  const [raceTargetTime, setRaceTargetTime] = useState('1:59:00');
  const [raceCourseType, setRaceCourseType] = useState('flat');
  const [raceStrategy, setRaceStrategy] = useState(null);
  const [raceDistance, setRaceDistance] = useState('half'); // '10k' | 'half' | 'full'

  const isPBPlan = selectedPlanType === 'running_half_marathon_pb' || selectedPlanType === 'running_full_marathon_pb';
  const canShowRaceStrategy =
    selectedPlanType === 'running_half_marathon_pb' ||
    selectedPlanType === 'running_half_marathon_finish' ||
    selectedPlanType === 'running_full_marathon_finish' ||
    selectedPlanType === 'running_full_marathon_pb' ||
    selectedPlanType === 'running_5k'; // 5K/10K 等可共用介面

  const handleGeneratePlan = async () => {
    if (!selectedPlanType) {
      handleError('請選擇一個訓練計劃類型', { context: 'TrainingPlanView', operation: 'handleGeneratePlan' });
      return;
    }

    if (isPBPlan && !targetPB) {
      handleError('請輸入目標 PB（例如：1:45:00）', { context: 'TrainingPlanView', operation: 'handleGeneratePlan' });
      return;
    }

    setLoading(true);
    try {
      const plan = await generateTrainingPlan({
        planType: selectedPlanType,
        weeks: weeks,
        targetPB: isPBPlan ? targetPB : null,
        targetRaceDate: isPBPlan ? targetRaceDate || null : null
      });
      setGeneratedPlan(plan);
    } catch (error) {
      // 錯誤已在 workoutGenerator 中處理
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRaceStrategy = () => {
    if (!raceTargetTime) {
      handleError('請先輸入目標完賽時間，例如 1:59:00', { context: 'TrainingPlanView', operation: 'handleGenerateRaceStrategy' });
      return;
    }
    const distanceKm =
      raceDistance === '10k' ? 10 :
      raceDistance === 'full' ? 42.2 :
      21.1;

    const strategy = generateRaceStrategy({
      distanceKm,
      targetTime: raceTargetTime,
      courseType: raceCourseType,
    });
    if (!strategy) {
      handleError('目標時間格式不正確，請確認為 HH:MM:SS 或 MM:SS', { context: 'TrainingPlanView', operation: 'handleGenerateRaceStrategy' });
      return;
    }
    setRaceStrategy(strategy);
  };

  const handleDownloadRacePaceBand = async () => {
    if (!raceStrategy) {
      handleError('請先生成比賽配速策略，再下載配速手環。', { context: 'TrainingPlanView', operation: 'handleDownloadRacePaceBand' });
      return;
    }

    try {
      await downloadHalfMarathonPaceBandPDF(raceStrategy, {
        raceName: '半馬比賽配速手環',
        targetTime: raceStrategy.targetTime,
      });
    } catch (error) {
      handleError('下載配速手環 PDF 失敗，請稍後再試。', { context: 'TrainingPlanView', operation: 'handleDownloadRacePaceBand' });
    }
  };

  const handleApplyToCalendar = async () => {
    if (!generatedPlan || !generatedPlan.workouts) return;

    // 確認是否要將計劃寫入行事曆
    const ok = window.confirm('確定要將此訓練計劃從下週一開始新增到行事曆嗎？');
    if (!ok) return;

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
          // 跑步相關欄位（若為跑步訓練）
          runDistance: workout.runDistance || '',
          runDuration: workout.runDuration || '',
          runPace: workout.runPace || '',
          runHeartRate: workout.runHeartRate || '',
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
        <button type="button" onClick={() => setCurrentView('dashboard')} className="btn-secondary p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="返回">
          <ArrowLeft className="text-gray-400" size={20} aria-hidden />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">訓練計劃推薦</h1>
          <p className="text-gray-400 text-sm">選擇適合你的訓練計劃，AI 將為你生成個人化方案</p>
        </div>
      </div>

      {/* 計劃類型選擇 */}
      {!generatedPlan && (
        <div className="card-base p-6 space-y-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="text-game-coin" size={20} aria-hidden />
            選擇訓練計劃類型
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(PLAN_TYPES).map(([key, plan]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedPlanType(key);
                  if (key !== 'running_half_marathon_pb' && key !== 'running_full_marathon_pb') {
                    setTargetPB('');
                    setTargetRaceDate('');
                  }
                }}
                className={`p-4 rounded-game border-2 transition-all text-left ${
                  selectedPlanType === key
                    ? 'border-game-grass bg-game-grass/20'
                    : 'border-game-outline/50 bg-surface-900/50 hover:border-game-outline'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {plan.focus === 'endurance' || plan.focus === 'speed' ? (
                    <Activity className="text-game-grass" size={20} aria-hidden />
                  ) : (
                    <Dumbbell className="text-game-grass" size={20} aria-hidden />
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

          {/* 週數選擇 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              計劃週數
            </label>
            <select
              value={weeks}
              onChange={(e) => setWeeks(parseInt(e.target.value))}
              className="input-base w-full md:w-48"
            >
              <option value={4}>4 周</option>
              <option value={6}>6 周</option>
              <option value={8}>8 周</option>
              <option value={12}>12 周</option>
            </select>
          </div>

          {/* 破 PB 類型專用設定 */}
          {isPBPlan && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  目標 PB（例如：1:45:00 或 3:30:00）
                </label>
                <input
                  type="text"
                  value={targetPB}
                  onChange={(e) => setTargetPB(e.target.value)}
                  placeholder="請輸入目標完賽時間"
                  className="input-base w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  目標賽事日期（可選）
                </label>
                <input
                  type="date"
                  value={targetRaceDate}
                  onChange={(e) => setTargetRaceDate(e.target.value)}
                  className="input-base w-full text-sm"
                />
              </div>
            </div>
          )}

          {/* 生成按鈕 */}
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={!selectedPlanType || loading}
            className="btn-primary w-full md:w-auto px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* 比賽配速策略區塊（半馬相關計畫時顯示，獨立於計劃生成狀態） */}
      {canShowRaceStrategy && (
        <div className="card-base p-6">
          <div className="flex items-center gap-2 mb-4">
            <Map className="text-game-grass" size={20} aria-hidden />
            <h2 className="text-lg font-bold text-white">比賽配速策略（半馬）</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            根據目標完賽時間與賽道類型，產生 Negative Split 配速與補給建議。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                目標完賽時間（例如：1:59:00）
              </label>
              <input
                type="text"
                value={raceTargetTime}
                onChange={(e) => setRaceTargetTime(e.target.value)}
                className="input-base w-full text-sm"
                placeholder="1:59:00"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                賽道類型
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRaceCourseType('flat')}
                  className={`px-4 py-2 rounded-game text-sm font-medium border-2 ${raceCourseType === 'flat' ? 'bg-game-grass border-game-grass text-game-outline' : 'bg-surface-900 border-game-outline/50 text-gray-300 hover:border-game-outline'}`}
                >
                  平路
                </button>
                <button
                  type="button"
                  onClick={() => setRaceCourseType('hilly')}
                  className={`px-4 py-2 rounded-game text-sm font-medium border-2 ${raceCourseType === 'hilly' ? 'bg-game-coin border-game-coin text-game-outline' : 'bg-surface-900 border-game-outline/50 text-gray-300 hover:border-game-outline'}`}
                >
                  起伏 / 坡道
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <button type="button" onClick={handleGenerateRaceStrategy} className="btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2">
              <Map size={16} aria-hidden />
              生成比賽配速策略
            </button>
            {raceStrategy && (
              <button type="button" onClick={handleDownloadRacePaceBand} className="btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-2">
                <Map size={14} />
                下載配速手環 PDF
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>比賽距離：</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRaceDistance('10k')}
                className={`px-3 py-1 rounded-full border ${
                  raceDistance === '10k'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                10K
              </button>
              <button
                type="button"
                onClick={() => setRaceDistance('half')}
                className={`px-3 py-1 rounded-full border ${
                  raceDistance === 'half'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                半馬 21.1K
              </button>
              <button
                type="button"
                onClick={() => setRaceDistance('full')}
                className={`px-3 py-1 rounded-full border ${
                  raceDistance === 'full'
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                全馬 42.2K
              </button>
            </div>
          </div>

          {raceStrategy && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">配速分段</h3>
                <p className="text-xs text-gray-400 mb-2">
                  目標時間：<span className="font-mono text-blue-300">{raceStrategy.targetTime}</span>，
                  平均配速：約 <span className="font-mono text-blue-300">{raceStrategy.averagePacePerKm}/km</span>
                </p>
                <div className="space-y-3">
                  {raceStrategy.segments.map((seg, idx) => (
                    <div key={idx} className="bg-gray-900 rounded-md border border-gray-700 px-3 py-2 text-xs text-gray-300">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-white">{seg.label}</span>
                        <span>{seg.startKm}–{seg.endKm} km</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>配速：{seg.pacePerKm}/km</span>
                        <span>區間時間：約 {seg.segmentTime}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-400">{seg.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">補給建議（能量膠）</h3>
                {raceStrategy.gels.length > 0 ? (
                  <ul className="space-y-1 text-xs text-gray-300">
                    {raceStrategy.gels.map((gel, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>時間：{gel.time}</span>
                        <span>約 {gel.approxKm} km</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">
                    比賽時間較短（少於 45 分鐘），可視情況選擇是否補給。
                  </p>
                )}
                <p className="mt-3 text-[11px] text-gray-500">
                  建議搭配你在「營養模組」設定的比賽日補給策略，一併規劃水站與能量膠品牌。
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 生成的計劃展示 */}
      {generatedPlan && (
        <div className="space-y-6">
          {/* 計劃概覽 */}
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

          {/* 訓練安排 */}
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
                            {ex.name} - {ex.sets}組 × {ex.reps}次
                            {ex.weight && ` (${ex.weight})`}
                            {ex.rest && ` · 休息 ${ex.rest}`}
                          </div>
                        ))}
                      </div>
                    )}
                    {workout.type === 'run' && (
                      <div className="mt-2 space-y-1 text-sm text-gray-300">
                        {workout.runDistance && <div>距離: {workout.runDistance} km</div>}
                        {workout.runDuration && <div>時間: {workout.runDuration} 分鐘</div>}
                        {workout.runPace && <div>配速: {workout.runPace}</div>}
                        {workout.runHeartRate && <div>心率: {workout.runHeartRate} bpm</div>}
                      </div>
                    )}
                    {workout.notes && (
                      <p className="text-xs text-gray-400 mt-2 italic">{workout.notes}</p>
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