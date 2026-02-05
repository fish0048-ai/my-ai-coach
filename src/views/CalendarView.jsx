/**
 * 行事曆主視圖
 * 使用 useCalendar Hook + CalendarHeader + CalendarGrid 精簡
 */
import React from 'react';
import { Copy, Move } from 'lucide-react';
import { useViewStore } from '../store/viewStore';
import { formatDate } from '../utils/date';
import useCalendar from '../hooks/useCalendar';
import CalendarHeader from '../components/Calendar/CalendarHeader';
import CalendarGrid from '../components/Calendar/CalendarGrid';
import CalendarDayModal from '../components/Calendar/CalendarDayModal';
import WeeklyModal from '../components/Calendar/WeeklyModal';

export default function CalendarView() {
  const setCurrentView = useViewStore((state) => state.setCurrentView);
  const { state, setters, handlers, computed } = useCalendar();
  const { days, changeMonth } = computed;

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col">
      <CalendarHeader
        currentDate={state.currentDate}
        changeMonth={changeMonth}
        onOpenWeeklyModal={handlers.openWeeklyModal}
        onGoToTrainingPlan={() => setCurrentView('training-plan')}
        onSync={handlers.handleSync}
        onExport={handlers.handleExport}
        onFileUpload={handlers.handleFileUpload}
        isSyncing={state.isSyncing}
        fileLoading={state.fileLoading}
      />

      <div className="bg-surface-800/50 p-2 rounded-card text-xs text-gray-400 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1">
          <Move size={12} /> 拖曳可移動日期
        </span>
        <span className="flex items-center gap-1">
          <Copy size={12} /> 按住 Ctrl 拖曳可複製
        </span>
      </div>

      <div className="flex-1 card-base p-4 overflow-y-auto">
        <CalendarGrid
          days={days}
          currentDate={state.currentDate}
          workouts={state.workouts}
          selectedDate={state.selectedDate}
          dragOverDate={state.dragOverDate}
          onDragStart={handlers.handleDragStart}
          onDrop={handlers.handleDrop}
          onDateClick={handlers.handleDateClick}
          onDragOver={setters.setDragOverDate}
        />
      </div>

      <WeeklyModal
        isOpen={state.showWeeklyModal}
        currentDate={state.currentDate}
        workouts={state.workouts}
        weeklyPrefs={state.weeklyPrefs}
        toggleWeeklyPref={handlers.toggleWeeklyPref}
        onClose={() => setters.setShowWeeklyModal(false)}
        onGenerate={handlers.handleWeeklyGenerate}
        loading={state.fileLoading}
      />

      {state.isModalOpen && (
        <CalendarDayModal
          isOpen={state.isModalOpen}
          onClose={() => setters.setModalOpen(false)}
          selectedDate={state.selectedDate}
          workouts={state.workouts}
          gears={state.gears}
          modalView={state.modalView}
          setModalView={setters.setModalView}
          currentDocId={state.currentDocId}
          setCurrentDocId={setters.setCurrentDocId}
          editForm={state.editForm}
          setEditForm={setters.setEditForm}
          onStatusToggle={handlers.handleStatusToggle}
          onEdit={handlers.handleEdit}
          onAddNew={handlers.handleAddNew}
          onDelete={handlers.handleDelete}
          onSave={handlers.handleSave}
          handleHeadCoachGenerate={handlers.handleHeadCoachGenerate}
          handleExerciseNameChange={handlers.handleExerciseNameChange}
          isGenerating={state.isGenerating}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
