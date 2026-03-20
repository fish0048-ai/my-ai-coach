/**
 * 虛擬世界入口（僅 2D 等角地圖）
 * 資料與導航邏輯見 world3dConfig；3D 場景已暫停，還原方式見 docs/FUTURE_3D_WORLD.md
 */
import React, { Suspense } from 'react';
import { Calendar, LayoutDashboard, MessageCircle, BookOpen } from 'lucide-react';
import { useViewStore } from '../store/viewStore';

const World2DView = React.lazy(() => import('./World2DView.jsx'));

function WorldLoadingFallback() {
  return (
    <div
      className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-[#fafaf8] rounded-game border-[3px] border-game-outline"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="虛擬世界載入中"
    >
      <div className="w-12 h-12 rounded-full border-[3px] border-game-grass/30 border-t-game-grass animate-spin mb-4" />
      <p className="text-sm font-bold text-gray-900">載入世界中...</p>
      <p className="text-xs text-gray-700 mt-1">請稍候</p>
    </div>
  );
}

export default function WorldView() {
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);

  const quickActions = [
    { id: 'calendar', label: '行事曆', view: 'calendar', icon: Calendar },
    { id: 'dashboard', label: '儀表板', view: 'dashboard', icon: LayoutDashboard },
    { id: 'coach', label: 'AI 教練', openChat: true, icon: MessageCircle },
    { id: 'knowledge-base', label: '知識庫', view: 'knowledge-base', icon: BookOpen },
  ];

  const handleQuickAction = (item) => {
    if (item.openChat) setIsChatOpen(true);
    else setCurrentView(item.view);
  };

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col" role="region" aria-label="AI Coach 虛擬世界">
      <div className="card-base p-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900" id="world-title">AI Coach World（等角地圖）</h2>
        <nav className="button-group-inline" aria-label="快捷進入功能">
          {quickActions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickAction(item)}
                aria-label={`前往${item.label}`}
                title={item.label}
              >
                <Icon size={14} aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 min-h-[60vh] rounded-game overflow-hidden card-base">
        <Suspense fallback={<WorldLoadingFallback />}>
          <World2DView />
        </Suspense>
      </div>
    </div>
  );
}
