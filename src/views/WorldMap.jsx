/**
 * Athletica 基地地圖（RPG Phase 1：地圖導航化；Phase 2：等級／經驗／金幣）
 * 2D 基地地圖作為新首頁，點擊建築物進入對應功能。
 */
import React from 'react';
import { useViewStore } from '../store/viewStore';
import { useUserStore } from '../store/userStore';
import { MAP_BUILDINGS, MAP_TITLE, MAP_SUBTITLE } from '../data/athleticaMapConfig';
import { getDefaultGameProfile } from '../services/game/gameProfileService';
import { Zap } from 'lucide-react';

const BASE = import.meta.env.BASE_URL || '';

/** 各建築對應 Kenney Tiles 圖示（來自 kenney_new-platformer-pack） */
const BUILDING_TILES = {
  dashboard: 'door_closed.png',      // 司令部
  calendar: 'flag_green_a.png',      // 競技場
  nutrition: 'gem_yellow.png',       // 補給站
  ai_coach: 'sign_exit.png',         // 賢者之塔
  trend: 'switch_blue.png',          // 科技實驗室
  gear: 'lock_yellow.png',           // 裝備庫
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
        <div className="hud-strip" role="status" aria-label={`等級 ${level}，經驗 ${currentXP}/${nextLevelXP}，金幣 ${coins}`}>
          <img src={`${BASE}kenney-platformer/tiles/hud_player_helmet_yellow.png`} alt="" className="w-8 h-8 object-contain" aria-hidden />
          <div className="flex items-center gap-1.5">
            <Zap size={18} className="text-game-grass" aria-hidden />
            <span className="text-sm font-bold text-game-outline">Lv.{level}</span>
          </div>
          <div className="w-24 h-2 bg-game-outline/30 rounded-full overflow-hidden border-2 border-game-outline">
            <div className="h-full bg-game-grass rounded-full transition-all" style={{ width: `${xpPct}%` }} />
          </div>
          <div className="flex items-center gap-1.5">
            <img src={`${BASE}kenney-platformer/tiles/hud_coin.png`} alt="" className="w-6 h-6 object-contain" aria-hidden />
            <span className="text-sm font-bold text-game-outline">×{coins}</span>
          </div>
        </div>
      </div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{MAP_TITLE}</h1>
        <p className="text-sm text-gray-600 mt-1">{MAP_SUBTITLE}</p>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full flex-1 content-start"
        role="navigation"
        aria-label="基地建築導航"
      >
        {MAP_BUILDINGS.map((b) => {
          const tile = BUILDING_TILES[b.id];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handleBuildingClick(b)}
              className="card-base p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] transition-all duration-200 hover:scale-[1.02] hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-game-coin focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf8] rounded-panel"
              style={{ ['--building-color']: b.color }}
              aria-label={`前往${b.label}`}
              title={`${b.label} · ${b.sublabel}`}
            >
              <div
                className="w-14 h-14 rounded-panel flex items-center justify-center border-2 border-game-outline bg-[#fafaf8]"
                style={{ borderColor: `${b.color}99` }}
              >
                {tile && (
                  <img
                    src={`${BASE}kenney-platformer/tiles/${tile}`}
                    alt=""
                    className="w-10 h-10 object-contain"
                    aria-hidden
                  />
                )}
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-900 text-sm">{b.label}</div>
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
