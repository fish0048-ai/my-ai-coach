/**
 * Kenney 平台素材使用示範頁
 *
 * 素材邏輯（與參考圖一致）：
 * 1. 背景層：backgrounds/（天空漸層 + background_clouds.png 重複 + background_solid_grass + background_solid_dirt）
 * 2. 地形層：tiles/terrain_dirt_block_*.png、grass.png 組成平台與草地頂緣
 * 3. HUD 層：亮色底 + 3px 深色描邊；tiles/hud_player_helmet_*.png、hud_coin.png、hud_heart*.png
 * 4. 物件層：tiles/（bush, block_*, ladder_*, spring, flag_*, sign_*）、characters/、enemies/
 *
 * 路徑前綴：/kenney-platformer/backgrounds | /tiles | /characters | /enemies
 */
import React from 'react';

const TILE = 64;   // 地塊單位 px（Kenney Default 約 128，這裡縮為 64 以多放物件）
const HUD_H = 56;

export default function PlatformerDemoView() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-game-sky" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* ========== 1. 背景層：藍天 + 雲 + 草地 + 土 ========== */}
      <div className="absolute inset-0 pointer-events-none">
        {/* 天空底色 + 漸層 */}
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background: 'linear-gradient(180deg, #D6EEF8 0%, #C3E3FF 45%, #C3E3FF 100%)',
          }}
        />
        {/* 雲朵圖重複鋪滿（與參考圖一致） */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_clouds.png)',
            backgroundSize: '256px 256px',
            backgroundRepeat: 'repeat',
          }}
        />
        {/* 草地條：貼在畫面下方，波浪緣在上方（用 grass 素材當邊） */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: '38%',
            bottom: 0,
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_solid_grass.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'bottom',
          }}
        />
        {/* 土層：在草地下方多一截橫紋（可選，增加層次） */}
        <div
          className="absolute left-0 right-0"
          style={{
            height: '12%',
            bottom: 0,
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_solid_dirt.png)',
            backgroundSize: '100% 100%',
            backgroundPosition: 'bottom',
          }}
        />
      </div>

      {/* ========== 2. 地形層：土塊 + 草地頂緣 ========== */}
      <div
        className="absolute left-0 right-0 flex justify-center items-end gap-0"
        style={{ bottom: '12%', height: TILE * 2 }}
      >
        {/* 土塊橫排：左、中、右、…（terrain_dirt_block 可接 terrain_dirt_block_center） */}
        {['terrain_dirt_block_left', 'terrain_dirt_block_center', 'terrain_dirt_block_center', 'terrain_dirt_block_center', 'terrain_dirt_block_right'].map((name, i) => (
          <img
            key={name + i}
            src={`/kenney-platformer/tiles/${name}.png`}
            alt=""
            className="block object-contain"
            style={{ width: TILE, height: TILE }}
          />
        ))}
        {/* 草地頂緣（波浪）：用 hill_top 或 grass 一排 */}
        <div className="absolute flex gap-0" style={{ bottom: TILE, left: '50%', transform: 'translateX(-50%)' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <img
              key={`grass-${i}`}
              src="/kenney-platformer/tiles/grass.png"
              alt=""
              className="block object-contain"
              style={{ width: TILE, height: TILE }}
            />
          ))}
        </div>
      </div>

      {/* ========== 3. HUD 層：左上金幣框、右上有愛心（亮色底 + 深色粗描邊）========== */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-[3px] border-game-outline shadow-card bg-white/95"
          role="img"
          aria-label="金幣 x20"
        >
          <img src="/kenney-platformer/tiles/hud_player_helmet_yellow.png" alt="" className="w-8 h-8 object-contain" />
          <img src="/kenney-platformer/tiles/hud_coin.png" alt="" className="w-6 h-6 object-contain" />
          <span className="text-game-outline font-bold text-lg">×20</span>
        </div>
      </div>
      <div
        className="absolute top-4 right-4 z-10 flex items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] border-game-outline shadow-card bg-white/95"
        role="img"
        aria-label="生命值 2.5"
      >
        <img src="/kenney-platformer/tiles/hud_heart.png" alt="" className="w-7 h-7 object-contain" />
        <img src="/kenney-platformer/tiles/hud_heart.png" alt="" className="w-7 h-7 object-contain" />
        <img src="/kenney-platformer/tiles/hud_heart_half.png" alt="" className="w-7 h-7 object-contain" />
      </div>

      {/* ========== 4. 遊戲物件層：灌木、方塊、梯子、彈簧、旗子、告示牌、角色、敵人 ========== */}
      <div className="absolute inset-0 pointer-events-none" style={{ bottom: '12%' }}>
        {/* 地面平台上的物件（y 對齊地形頂） */}
        <div className="absolute flex items-end gap-0" style={{ left: '15%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/bush.png" alt="" style={{ width: TILE, height: TILE }} />
          <img src="/kenney-platformer/tiles/block_yellow.png" alt="" style={{ width: TILE, height: TILE }} />
          <img src="/kenney-platformer/tiles/block_exclamation.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '38%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/spring.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '48%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/ladder_bottom.png" alt="" style={{ width: TILE, height: TILE }} />
          <img src="/kenney-platformer/tiles/ladder_middle.png" alt="" style={{ width: TILE, height: TILE, display: 'block', marginBottom: -2 }} />
          <img src="/kenney-platformer/tiles/ladder_middle.png" alt="" style={{ width: TILE, height: TILE, display: 'block', marginBottom: -2 }} />
          <img src="/kenney-platformer/tiles/ladder_top.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '52%', bottom: TILE * 2.8 }}>
          <img src="/kenney-platformer/characters/character_yellow_climb_a.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '58%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/flag_yellow_a.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '68%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/sign_right.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '78%', bottom: TILE * 1.2 }}>
          <img src="/kenney-platformer/tiles/brick_brown.png" alt="" style={{ width: TILE, height: TILE }} />
          <img src="/kenney-platformer/tiles/block_coin.png" alt="" style={{ width: TILE, height: TILE, marginLeft: -TILE, marginBottom: TILE }} />
        </div>
        {/* 空中敵人/裝飾 */}
        <div className="absolute" style={{ left: '22%', top: '28%' }}>
          <img src="/kenney-platformer/enemies/bee_a.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
        <div className="absolute" style={{ left: '72%', top: '35%' }}>
          <img src="/kenney-platformer/enemies/fly_a.png" alt="" style={{ width: TILE * 0.8, height: TILE * 0.8 }} />
        </div>
        <div className="absolute" style={{ left: '82%', bottom: TILE * 2.2 }}>
          <img src="/kenney-platformer/enemies/slime_normal_rest.png" alt="" style={{ width: TILE, height: TILE }} />
        </div>
      </div>

      {/* 說明條：示範頁標題（HUD 風格） */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl border-[3px] border-game-outline shadow-card bg-white/95 text-game-outline text-sm font-bold"
      >
        素材示範：背景 → 地形 → HUD（亮色底+粗描邊）→ 物件
      </div>
    </div>
  );
}
