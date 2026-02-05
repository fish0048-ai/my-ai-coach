/**
 * 行事曆頂部標題與操作區
 */
import React from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Calendar as CalendarIcon, CalendarDays } from 'lucide-react';
import ImportSection from './ImportSection';

export default function CalendarHeader({
  currentDate,
  changeMonth,
  onOpenWeeklyModal,
  onGoToTrainingPlan,
  onSync,
  onExport,
  onFileUpload,
  isSyncing,
  fileLoading,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center card-base p-4 gap-3">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CalendarIcon className="text-primary-500" />
          運動行事曆
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenWeeklyModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-500 hover:to-primary-500 text-white rounded-button text-sm font-bold shadow-card transition-all"
          >
            <CalendarDays size={18} /> 本週總教練排程
          </button>
          <button
            onClick={onGoToTrainingPlan}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Sparkles size={16} /> 訓練計劃推薦
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:gap-4 md:justify-end">
        <ImportSection
          onSync={onSync}
          onExport={onExport}
          onFileUpload={onFileUpload}
          isSyncing={isSyncing}
          fileLoading={fileLoading}
        />
        <div className="flex items-center gap-2 bg-surface-900 rounded-button p-1">
          <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-surface-700 rounded-button text-white">
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm md:text-base font-mono text-white min-w-[100px] text-center">
            {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 hover:bg-surface-700 rounded-button text-white">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
