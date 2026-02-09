/**
 * 3D 城市 World 入口
 * 提供 2D 等角地圖 / 3D 場景切換，共用 world3dConfig。
 * 體驗：載入狀態、無障礙（鍵盤、aria）、快捷入口。
 */
import React, { useState, Suspense } from 'react';
import { Map, Box, Calendar, LayoutDashboard, MessageCircle, BookOpen } from 'lucide-react';
import { useViewStore } from '../store/viewStore';

const World2DView = React.lazy(() => import('./World2DView.jsx'));
// World3DView 改為靜態 import，與 WorldView 同 chunk 載入，避免切到 3D 時第二次動態 fetch 失敗（ERR_CONNECTION_REFUSED / Failed to fetch dynamically imported module）
import World3DView from './World3DView.jsx';

/** 載入中骨架：無障礙 + 視覺 */
function WorldLoadingFallback() {
  return (
    <div
      className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-surface-800 rounded-panel border-[3px] border-game-outline"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="虛擬世界載入中"
    >
      <div className="w-12 h-12 rounded-full border-[3px] border-game-grass/30 border-t-game-grass animate-spin mb-4" />
      <p className="text-sm text-gray-300">載入世界中...</p>
      <p className="text-xs text-gray-500 mt-1">請稍候</p>
    </div>
  );
}

export default function WorldView() {
  const [mode, setMode] = useState('3d'); // '2d' | '3d'
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
        <h2 className="text-lg font-bold text-gray-900" id="world-title">AI Coach World</h2>
        <div className="flex items-center gap-4 flex-wrap">
          {/* 快捷入口：統一 button-group-inline */}
          <nav className="button-group-inline" aria-label="快捷進入功能">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickAction(item)}
                  aria-label={`前往${item.label}`}
                  title={`${item.label}`}
                >
                  <Icon size={14} aria-hidden />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          {/* 2D / 3D 切換：統一 toggle-group */}
          <div className="toggle-group" role="group" aria-labelledby="world-title">
            <button type="button" onClick={() => setMode('3d')} aria-pressed={mode === '3d'} aria-label="切換至 3D 場景" title="3D 場景">
              <Box size={16} aria-hidden /> 3D 場景
            </button>
            <button type="button" onClick={() => setMode('2d')} aria-pressed={mode === '2d'} aria-label="切換至 2D 等角地圖" title="2D 等角地圖">
              <Map size={16} aria-hidden /> 2D 等角地圖
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[60vh] rounded-panel overflow-hidden card-base">
        <Suspense fallback={<WorldLoadingFallback />}>
          {mode === '3d' ? <World3DView /> : <World2DView />}
        </Suspense>
      </div>
    </div>
  );
}
