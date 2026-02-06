/**
 * Kenney 平台素材示範頁（對齊 Sample A.png）
 * 背景：Kenney 全素材搭配組合（遠樹、遠山、蘑菇、雙層雲、裝飾地景），可愛不單調
 */
import React from 'react';

const TILE = 64; // Kenney Default 64x64
const GROUND_Y = TILE * 1.1;

export default function PlatformerDemoView() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-game-sky">
      {/* ========== 1. 背景層：多層組合（由後到前）========== */}
      {/* 天空漸層 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #D6EEF8 0%, #C3E3FF 55%, #C3E3FF 100%)',
        }}
      />
      {/* 遠景：淡出遠樹（柔和綠意） */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_fade_trees.png)',
          backgroundSize: '100% 75%',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 遠景：淡出遠山（層次感） */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_fade_hills.png)',
          backgroundSize: '100% 70%',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 遠景：彩色樹林（可愛樹木剪影） */}
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_color_trees.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 遠景：彩色遠山 */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_color_hills.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 遠景：彩色蘑菇（點綴，低透明度） */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_color_mushrooms.png)',
          backgroundSize: '80% 50%',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* 雲朵層 1：較大、主雲 */}
      <div
        className="absolute inset-0 opacity-85"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_clouds.png)',
          backgroundSize: '280px 280px',
          backgroundPosition: '0 0',
          backgroundRepeat: 'repeat',
        }}
      />
      {/* 雲朵層 2：較小、偏移，增加層次 */}
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage: 'url(/kenney-platformer/backgrounds/background_clouds.png)',
          backgroundSize: '200px 200px',
          backgroundPosition: '60px 50px',
          backgroundRepeat: 'repeat',
        }}
      />
      {/* 裝飾：遠方小山與灌木（tiles 當背景點綴） */}
      <div className="absolute inset-0 pointer-events-none" style={{ bottom: '15%' }}>
        <img src="/kenney-platformer/tiles/hill.png" alt="" className="absolute opacity-30" style={{ left: '5%', bottom: 0, width: TILE * 2, height: TILE * 1.5, objectFit: 'contain', objectPosition: 'bottom' }} />
        <img src="/kenney-platformer/tiles/hill.png" alt="" className="absolute opacity-25" style={{ right: '8%', bottom: 0, width: TILE * 2.2, height: TILE * 1.6, objectFit: 'contain', objectPosition: 'bottom' }} />
        <img src="/kenney-platformer/tiles/hill_top.png" alt="" className="absolute opacity-35" style={{ left: '25%', bottom: 0, width: TILE * 1.5, height: TILE * 1.2, objectFit: 'contain', objectPosition: 'bottom' }} />
        <img src="/kenney-platformer/tiles/bush.png" alt="" className="absolute opacity-20" style={{ left: '15%', bottom: TILE * 0.3, width: TILE * 0.8, height: TILE * 0.8 }} />
        <img src="/kenney-platformer/tiles/bush.png" alt="" className="absolute opacity-20" style={{ right: '20%', bottom: TILE * 0.2, width: TILE * 0.7, height: TILE * 0.7 }} />
      </div>

      {/* ========== 2. 地形層：草地波浪緣（terrain_grass_cloud，像 Sample A 的綠平台）========== */}
      <div
        className="absolute left-0 right-0 flex justify-center items-end"
        style={{ bottom: 0, height: TILE * 2 }}
      >
        <div className="flex gap-0 shrink-0">
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_left.png" alt="" width={TILE} height={TILE} className="block" />
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_middle.png" alt="" width={TILE} height={TILE} className="block" />
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_middle.png" alt="" width={TILE} height={TILE} className="block" />
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_middle.png" alt="" width={TILE} height={TILE} className="block" />
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_middle.png" alt="" width={TILE} height={TILE} className="block" />
          <img src="/kenney-platformer/tiles/terrain_grass_cloud_right.png" alt="" width={TILE} height={TILE} className="block" />
        </div>
      </div>

      {/* ========== 3. HUD（與 Sample A：亮色底 + 深色粗描邊）========== */}
      {/* 左上：金幣 x20 */}
      <div className="absolute top-4 left-4 z-10">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border-[3px] border-game-outline shadow-card bg-white"
          role="img"
          aria-label="金幣 x20"
        >
          <img src="/kenney-platformer/tiles/hud_coin.png" alt="" className="w-8 h-8 object-contain" />
          <span className="text-game-outline font-bold text-lg">×20</span>
        </div>
      </div>
      {/* 右上：愛心 2.5（白底卡片 + 粗描邊） */}
      <div className="absolute top-4 right-4 z-10">
        <div
          className="flex items-center gap-0.5 px-3 py-2 rounded-xl border-[3px] border-game-outline shadow-card bg-white"
          role="img"
          aria-label="生命值 2.5"
        >
          <img src="/kenney-platformer/tiles/hud_heart.png" alt="" className="w-8 h-8 object-contain" />
          <img src="/kenney-platformer/tiles/hud_heart.png" alt="" className="w-8 h-8 object-contain" />
          <img src="/kenney-platformer/tiles/hud_heart_half.png" alt="" className="w-8 h-8 object-contain" />
        </div>
      </div>

      {/* ========== 4. 遊戲物件（對齊 Sample A 配置）========== */}
      <div className="absolute inset-0 pointer-events-none" style={{ bottom: 0 }}>
        {/* 左側：黃方塊、驚嘆號方塊、灌木 */}
        <div className="absolute flex items-end gap-0" style={{ left: '8%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/block_yellow.png" alt="" width={TILE} height={TILE} />
          <img src="/kenney-platformer/tiles/block_exclamation.png" alt="" width={TILE} height={TILE} />
          <img src="/kenney-platformer/tiles/bush.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 藍色開關／方塊 */}
        <div className="absolute" style={{ left: '22%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/switch_blue.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 彈簧 */}
        <div className="absolute" style={{ left: '30%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/spring.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 灰色石台（brick_grey） */}
        <div className="absolute" style={{ left: '36%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/brick_grey.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 梯子 + 黃色角色爬梯 */}
        <div className="absolute" style={{ left: '44%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/ladder_bottom.png" alt="" width={TILE} height={TILE} />
          <img src="/kenney-platformer/tiles/ladder_middle.png" alt="" width={TILE} height={TILE} style={{ display: 'block', marginBottom: -1 }} />
          <img src="/kenney-platformer/tiles/ladder_middle.png" alt="" width={TILE} height={TILE} style={{ display: 'block', marginBottom: -1 }} />
          <img src="/kenney-platformer/tiles/ladder_top.png" alt="" width={TILE} height={TILE} />
        </div>
        <div className="absolute" style={{ left: '44%', bottom: GROUND_Y + TILE * 2.2 }}>
          <img src="/kenney-platformer/characters/character_yellow_climb_a.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 棕色方塊 + 問號金幣方塊 */}
        <div className="absolute flex items-end gap-0" style={{ left: '54%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/brick_brown.png" alt="" width={TILE} height={TILE} />
          <img src="/kenney-platformer/tiles/block_coin.png" alt="" width={TILE} height={TILE} style={{ marginBottom: TILE }} />
        </div>
        {/* 橘色警告方塊（三角+驚嘆號） */}
        <div className="absolute" style={{ left: '62%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/block_strong_danger.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 紅色鑰匙孔方塊 */}
        <div className="absolute" style={{ left: '68%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/block_red.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 黃旗 */}
        <div className="absolute" style={{ left: '74%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/flag_yellow_a.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 橙色箭頭告示牌 */}
        <div className="absolute" style={{ left: '80%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/tiles/sign_right.png" alt="" width={TILE} height={TILE} />
        </div>
        {/* 綠黏液敵人 */}
        <div className="absolute" style={{ left: '86%', bottom: GROUND_Y }}>
          <img src="/kenney-platformer/enemies/slime_normal_rest.png" alt="" width={TILE} height={TILE} />
        </div>

        {/* 空中：蜜蜂左上、蒼蠅右上 */}
        <div className="absolute" style={{ left: '12%', top: '22%' }}>
          <img src="/kenney-platformer/enemies/bee_a.png" alt="" width={TILE} height={TILE} />
        </div>
        <div className="absolute" style={{ right: '18%', top: '28%' }}>
          <img src="/kenney-platformer/enemies/fly_a.png" alt="" width={TILE * 0.9} height={TILE * 0.9} />
        </div>
      </div>

      {/* ========== 5. 底部說明條（Sample A 風格：深褐/橘底 + 白字）========== */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-5 py-2.5 rounded-lg border-[3px] border-game-outline shadow-card text-white text-sm font-bold"
        style={{ backgroundColor: '#8B4513' }}
      >
        素材示範：背景 → 地形 → HUD（亮色底+粗描邊）→ 物件
      </div>
    </div>
  );
}
