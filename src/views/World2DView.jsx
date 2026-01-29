import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useViewStore } from '../store/viewStore';
import {
  avatar as avatarConfig,
  buildings as buildingsConfig,
  links as linksConfig,
  getRoomAction,
  getBuildingById,
} from '../data/world3dConfig';

// 將 3D XZ 座標簡單投影到 2D 平面
const projectTo2D = ([x, , z]) => {
  const scale = 6; // 縮放比例
  const offsetX = 200;
  const offsetY = 120;
  return {
    x: offsetX + x * scale,
    y: offsetY + z * scale,
  };
};

export default function World2DView() {
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);

  const { projectedBuildings, projectedLinks, avatarStart2D } = useMemo(() => {
    const projectedBuildings = buildingsConfig.map((b) => ({
      ...b,
      pos2d: projectTo2D(b.position),
    }));

    const projectedLinks = linksConfig.map((link) => {
      const fromB = getBuildingById(link.from);
      const toB = getBuildingById(link.to);
      if (!fromB || !toB) return null;
      const from2d = projectTo2D(fromB.position);
      const to2d = projectTo2D(toB.position);
      return { id: link.id, from2d, to2d };
    }).filter(Boolean);

    const avatarStart2D = projectTo2D(avatarConfig.startPosition);

    return { projectedBuildings, projectedLinks, avatarStart2D };
  }, []);

  const [avatarPos, setAvatarPos] = useState(avatarStart2D);
  const [wobblePhase, setWobblePhase] = useState(0);
  const avatarPosRef = useRef(avatarStart2D);
  const pathRef = useRef([]); // 一條由水平/垂直線段組成的路徑
  const pendingRoomRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  const runRoomAction = useCallback((roomId) => {
    const act = getRoomAction(roomId);
    if (!act) return;
    if (act.action === 'navigate') {
      setCurrentView(act.targetView);
    } else if (act.action === 'openPanel' && act.target === 'CoachChat') {
      setIsChatOpen(true);
    }
  }, [setCurrentView, setIsChatOpen]);

  const handleBuildingClick = (b) => {
    // 建立「只能走直線」的路徑：先走 X 再走 Y（或反之）
    const start = avatarPosRef.current;
    const end = b.pos2d;
    const segments = [];

    // 先水平對齊 X，再垂直對齊 Y（皆為軸對齊，沒有斜線）
    if (Math.abs(end.x - start.x) > 1) {
      segments.push({ x: end.x, y: start.y });
    }
    if (Math.abs(end.y - start.y) > 1) {
      segments.push({ x: end.x, y: end.y });
    }

    // 如果非常接近，直接當成到達
    if (segments.length === 0) {
      runRoomAction(b.lobby);
      return;
    }

    pathRef.current = segments;
    pendingRoomRef.current = b.lobby;
  };

  useEffect(() => {
    const speed = 140; // px / 秒

    const loop = (time) => {
      rafRef.current = requestAnimationFrame(loop);
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
        return;
      }
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const current = avatarPosRef.current;

      if (pathRef.current && pathRef.current.length > 0) {
        const target = pathRef.current[0];
        const dx = target.x - current.x;
        const dy = target.y - current.y;

        // 只會有一個軸需要移動（確保不能走斜線）
        let nx = current.x;
        let ny = current.y;

        if (Math.abs(dx) > 1) {
          const step = Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
          nx = current.x + step;
        } else if (Math.abs(dy) > 1) {
          const step = Math.sign(dy) * Math.min(Math.abs(dy), speed * dt);
          ny = current.y + step;
        } else {
          // 抵達當前 segment 終點
          nx = target.x;
          ny = target.y;
          pathRef.current.shift();

          // 所有 segment 完成後才觸發功能
          if (pathRef.current.length === 0 && pendingRoomRef.current) {
            const room = pendingRoomRef.current;
            pendingRoomRef.current = null;
            runRoomAction(room);
          }
        }

        avatarPosRef.current = { x: nx, y: ny };
        setAvatarPos(avatarPosRef.current);
      }

      // idle / 移動時都做一點輕微搖動，增加遊戲感
      setWobblePhase((prev) => prev + dt * 3);

      return changed;
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, [runRoomAction]);

  return (
    <div className="relative w-full min-h-[60vh] rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900/80 to-slate-900/40">
        <div>
          <p className="text-xs font-semibold text-sky-300">互動世界總覽（2D 模式）</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            點擊建築即可切換到對應功能，小人標記用來幫助你理解目前所在位置。
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="relative w-full max-w-3xl mx-auto aspect-[4/2.5] bg-slate-900/80 rounded-xl border border-slate-800 shadow-inner overflow-hidden">
          <svg
            viewBox="0 0 400 240"
            className="w-full h-full"
          >
            {/* 背景：柔和漸層 + 網格 */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1f2937" strokeWidth="1" />
              </pattern>
              <radialGradient id="worldGlow" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="45%" stopColor="#020617" />
                <stop offset="100%" stopColor="#000000" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="400" height="240" fill="url(#worldGlow)" />
            <rect x="0" y="0" width="400" height="240" fill="url(#grid)" opacity="0.35" />

            {/* 中央圓形廣場 + 光暈 */}
            <circle cx="200" cy="120" r="42" fill="#020617" opacity="0.8" />
            <circle cx="200" cy="120" r="36" fill="#020617" stroke="#1f2937" strokeWidth="2" />
            <circle cx="200" cy="120" r="24" fill="#0f172a" opacity="0.9" />

            {/* 建築之間的連線（互動關係） */}
            {projectedLinks.map((l, idx) => (
              <line
                key={l.id}
                x1={l.from2d.x}
                y1={l.from2d.y}
                x2={l.to2d.x}
                y2={l.to2d.y}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.5"
              />
            ))}

            {/* 建築節點（圓弧排列的小鎮，帶柔和陰影） */}
            {projectedBuildings.map((b) => (
              <g
                key={b.id}
                transform={`translate(${b.pos2d.x} ${b.pos2d.y})`}
                className="cursor-pointer"
                onClick={() => handleBuildingClick(b)}
              >
                {/* 建築底座 */}
                <rect
                  x={-26}
                  y={-22}
                  width={52}
                  height={32}
                  rx={10}
                  fill="#020617"
                  stroke="#020617"
                  strokeWidth="2"
                />
                {/* 建築主體 */}
                <rect
                  x={-22}
                  y={-20}
                  width={44}
                  height={24}
                  rx={8}
                  fill={`#${b.color.toString(16).padStart(6, '0')}`}
                  stroke="#0b1120"
                  strokeWidth="1.5"
                />
                {/* 小窗戶 */}
                <rect
                  x={-10}
                  y={-10}
                  width={20}
                  height={8}
                  rx={3}
                  fill="#fef9c3"
                  opacity="0.85"
                />
                {/* 建築名稱 */}
                <text
                  x={0}
                  y={22}
                  textAnchor="middle"
                  className="fill-slate-200"
                  fontSize="9"
                >
                  {b.name}
                </text>
              </g>
            ))}

            {/* 小人標記（目前所在位置，帶有輕微搖動） */}
            <g transform={`translate(${avatarPos.x} ${avatarPos.y + Math.sin(wobblePhase) * 2})`}>
              <circle r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
              <circle cx="-2" cy="-1.2" r="1.4" fill="#0f172a" />
              <circle cx="2" cy="-1.2" r="1.4" fill="#0f172a" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

