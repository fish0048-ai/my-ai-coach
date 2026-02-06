import React from 'react';

const BASE = import.meta.env.BASE_URL || '';

/** 滿版 Kenney 圖層背景（土、草地、雲、遠山遠樹），供 MainLayout 與登入頁共用 */
export default function KenneyBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_solid_dirt.png)`,
          backgroundSize: '100% 14%',
          backgroundPosition: 'bottom left',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_solid_grass.png)`,
          backgroundSize: '100% 30%',
          backgroundPosition: 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div
        className="absolute inset-0 opacity-85"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_clouds.png)`,
          backgroundSize: '260px 260px',
          backgroundPosition: '0 0',
          backgroundRepeat: 'repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 32%, transparent 42%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 32%, transparent 42%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-75"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_clouds.png)`,
          backgroundSize: '180px 180px',
          backgroundPosition: '40px 60px',
          backgroundRepeat: 'repeat',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 28%, transparent 38%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 28%, transparent 38%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_color_hills.png)`,
          backgroundSize: '256px 256px',
          backgroundPosition: 'left bottom',
          backgroundRepeat: 'repeat-x',
        }}
      />
      <div
        className="absolute inset-0 opacity-85"
        style={{
          backgroundImage: `url(${BASE}kenney-platformer/backgrounds/background_color_trees.png)`,
          backgroundSize: '256px 256px',
          backgroundPosition: 'left bottom',
          backgroundRepeat: 'repeat-x',
        }}
      />
    </div>
  );
}
