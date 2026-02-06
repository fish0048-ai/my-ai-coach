/**
 * Athletica 基地地圖（RPG Phase 1：地圖導航化；Phase 2：等級／經驗／金幣）
 * 2D 基地地圖作為新首頁，點擊建築物進入對應功能。
 */
import React from 'react';
import { useViewStore } from '../store/viewStore';
import { useUserStore } from '../store/userStore';
import { MAP_BUILDINGS, MAP_TITLE, MAP_SUBTITLE } from '../data/athleticaMapConfig';
import { getDefaultGameProfile } from '../services/game/gameProfileService';
import {
  LayoutDashboard,
  Calendar,
  Utensils,
  MessageSquare,
  LineChart,
  ShoppingBag,
  Zap,
} from 'lucide-react';

const BUILDING_ICONS = {
  dashboard: LayoutDashboard,
  calendar: Calendar,
  nutrition: Utensils,
  ai_coach: MessageSquare,
  trend: LineChart,
  gear: ShoppingBag,
};

export default function WorldMap() {
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);
  const userData = useUserStore((s) => s.userData);
  const gp = userData?.gameProfile || getDefaultGameProfile();
  const level = gp.level ?? 1;
  const currentXP = gp.currentXP ?? 0;
  const nextLevelXP = Math.max(1, gp.nextLevelXP ?? 100);
  const coins = gp.coins ?? 0;
  const xpPct = Math.min(100, (currentXP / nextLevelXP) * 100);

  const handleBuildingClick = (b) => {
    if (b.openChat) {
      setIsChatOpen(true);
      return;
    }
    if (b.view) setCurrentView(b.view);
  };

  return (
    <div className="animate-fade-in h-full flex flex-col p-4 lg:p-6">
      {/* 左上角：HUD 風格（Kenney 平台－等級、經驗條、金幣） */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-game bg-white/95 border-[3px] border-game-outline shadow-card"
          role="status"
          aria-label={`等級 ${level}，經驗 ${currentXP}/${nextLevelXP}，金幣 ${coins}`}
        >
          <div className="flex items-center gap-1.5">
            <Zap size={18} className="text-game-grass" aria-hidden />
            <span className="text-sm font-bold text-game-outline">Lv.{level}</span>
          </div>
          <div className="w-24 h-2 bg-game-outline/30 rounded-full overflow-hidden border-2 border-game-outline">
            <div className="h-full bg-game-grass rounded-full transition-all" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="flex items-center gap-1.5">
            <img src="/kenney-ui/coin_gold.png" alt="" className="w-6 h-6 object-contain" aria-hidden />
            <span className="text-sm font-bold text-game-outline" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.8)' }}>×{coins}</span>
          </div>
        </div>
      </div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">{MAP_TITLE}</h1>
        <p className="text-sm text-gray-400 mt-1">{MAP_SUBTITLE}</p>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full flex-1 content-start"
        role="navigation"
        aria-label="基地建築導航"
      >
        {MAP_BUILDINGS.map((b) => {
          const Icon = BUILDING_ICONS[b.id];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handleBuildingClick(b)}
              className="card-base p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] transition-all duration-200 hover:scale-[1.02] hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-game-coin focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900 rounded-panel"
              style={{ ['--building-color']: b.color }}
              aria-label={`前往${b.label}`}
              title={`${b.label} · ${b.sublabel}`}
            >
              <div
                className="w-14 h-14 rounded-panel flex items-center justify-center bg-surface-800 border border-gray-700"
                style={{ backgroundColor: `${b.color}22`, borderColor: `${b.color}44` }}
              >
                {Icon && <Icon size={28} className="text-gray-200" aria-hidden />}
              </div>
              <div className="text-center">
                <div className="font-bold text-white text-sm">{b.label}</div>
                <div className="text-xs text-gray-500">{b.sublabel}</div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-500 mt-6">
        點擊建築進入功能 · 左側選單可切換 3D 城市與其他頁面
      </p>
    </div>
  );
}
