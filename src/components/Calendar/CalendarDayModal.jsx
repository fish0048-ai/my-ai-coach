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
      <div className="bg-surface-900 w-full max-w-4xl rounded-2xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">
                {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日
              </h2>
              {modalView === 'list' && <span className="text-xs text-gray-500 bg-surface-800 px-2 py-1 rounded">當日清單</span>}
              {modalView === 'form' && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">{currentDocId ? '編輯' : '新增'}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {modalView === 'list' && (
            <div className="space-y-4">
              {dayWorkouts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                  <p>當日尚無紀錄</p>
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
                onClick={onAddNew || (() => { setCurrentDocId(null); setModalView('form'); })}
                className="w-full py-4 rounded-xl border-2 border-dashed border-gray-700 text-gray-400 hover:text-white"
              >
                <Plus /> 新增運動
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
        <div className="p-6 border-t border-gray-800 flex justify-between">
          {modalView === 'form' && (
            <>
              {currentDocId && (
                <button onClick={onDelete} className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2">
                  <Trash2 size={18} /> 刪除
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button onClick={() => setModalView('list')} className="text-gray-400 hover:text-white px-4">取消</button>
                <button onClick={onSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-500 transition-colors">
                  儲存
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
