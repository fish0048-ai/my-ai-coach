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
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarIcon className="text-game-grass" aria-hidden />
          運動行事曆
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onOpenWeeklyModal} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <CalendarDays size={18} aria-hidden /> 本週總教練排程
          </button>
          <button onClick={onGoToTrainingPlan} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
            <Sparkles size={16} aria-hidden /> 訓練計劃推薦
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
        <div className="flex items-center gap-2 bg-surface-800 rounded-game border-[3px] border-game-outline p-1">
          <button onClick={() => changeMonth(-1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-game-grass rounded-game text-white transition-colors" aria-label="上個月">
            <ChevronLeft size={20} aria-hidden />
          </button>
          <span className="text-sm md:text-base font-mono text-white min-w-[100px] text-center">
            {currentDate.getFullYear()} 年 {currentDate.getMonth() + 1} 月
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-game-grass rounded-game text-white transition-colors" aria-label="下個月">
            <ChevronRight size={20} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
