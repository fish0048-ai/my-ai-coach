/**
 * 行事曆日期詳情 Modal
 * 任務 3-1：從 CalendarView 抽離
 */

import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import WorkoutForm from './WorkoutForm';
import WorkoutCard from './WorkoutCard';

const EMPTY_FORM = {
  status: 'completed', type: 'strength', title: '', exercises: [],
  runDistance: '', runDuration: '', runPace: '', runPower: '', runHeartRate: '', runRPE: '', notes: '', calories: '', gearId: '',
  runType: '', runIntervalSets: '', runIntervalRest: '', runIntervalPace: '', runIntervalDuration: '', runIntervalPower: '',
};

export function getEmptyEditForm(dateStr, todayStr) {
  const isFuture = dateStr > todayStr;
  return { ...EMPTY_FORM, status: isFuture ? 'planned' : 'completed' };
}

export function workoutToEditForm(workout) {
  return {
    status: workout.status || 'completed',
    type: workout.type || 'strength',
    title: workout.title || '',
    exercises: workout.exercises || [],
    runDistance: workout.runDistance || '',
    runDuration: workout.runDuration || '',
    runPace: workout.runPace || '',
    runPower: workout.runPower || '',
    runHeartRate: workout.runHeartRate || '',
    runRPE: workout.runRPE || '',
    notes: workout.notes || '',
    calories: workout.calories || '',
    gearId: workout.gearId || '',
    runType: workout.runType || '',
    runIntervalSets: workout.runIntervalSets || '',
    runIntervalRest: workout.runIntervalRest || '',
    runIntervalPace: workout.runIntervalPace || '',
    runIntervalDuration: workout.runIntervalDuration || '',
    runIntervalPower: workout.runIntervalPower || '',
  };
}

export default function CalendarDayModal({
  isOpen,
  onClose,
  selectedDate,
  workouts,
  gears,
  modalView,
  setModalView,
  currentDocId,
  setCurrentDocId,
  editForm,
  setEditForm,
  onStatusToggle,
  onEdit,
  onAddNew,
  onDelete,
  onSave,
  handleHeadCoachGenerate,
  handleExerciseNameChange,
  isGenerating,
  formatDate,
}) {
  if (!isOpen) return null;

  const dayWorkouts = workouts[formatDate(selectedDate)] || [];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="card-base bg-surface-900 w-full max-w-4xl rounded-game shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-game-outline/50 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">
                {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
              </h2>
              {modalView === 'list' && <span className="text-xs font-medium text-gray-300 bg-surface-800 px-2 py-1 rounded-game border border-game-outline/50">當日清單</span>}
              {modalView === 'form' && <span className="text-xs text-game-grass bg-game-grass/20 px-2 py-1 rounded-game border border-game-outline/50">{currentDocId ? '編輯' : '新增'}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="關閉"><X size={24} aria-hidden /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {modalView === 'list' && (
            <div className="space-y-4">
              {dayWorkouts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-game-outline/50 rounded-game">
                  <p className="font-medium">當日尚無紀錄</p>
                </div>
              ) : (
                dayWorkouts.map((workout) => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    gears={gears}
                    onEdit={onEdit}
                    onStatusToggle={onStatusToggle}
                  />
                ))
              )}
              <button
                type="button"
                onClick={onAddNew || (() => { setCurrentDocId(null); setModalView('form'); })}
                className="w-full py-4 rounded-game border-2 border-dashed border-game-outline/50 text-gray-400 hover:text-white hover:border-game-grass/50"
              >
                <Plus aria-hidden /> 新增運動
              </button>
            </div>
          )}
          {modalView === 'form' && (
            <WorkoutForm
              editForm={editForm}
              setEditForm={setEditForm}
              gears={gears}
              handleHeadCoachGenerate={handleHeadCoachGenerate}
              isGenerating={isGenerating}
              handleExerciseNameChange={handleExerciseNameChange}
            />
          )}
        </div>
        <div className="p-6 border-t border-game-outline/50 flex justify-between">
          {modalView === 'form' && (
            <>
              {currentDocId && (
                <button type="button" onClick={onDelete} className="flex items-center gap-2 text-game-heart hover:text-game-heart/80 px-4 py-2 min-h-[44px]">
                  <Trash2 size={18} aria-hidden /> 刪除
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button type="button" onClick={() => setModalView('list')} className="btn-secondary px-4 py-2">取消</button>
                <button type="button" onClick={onSave} className="btn-primary px-6 py-2 font-bold">儲存</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
