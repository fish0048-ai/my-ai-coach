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
  const targetRef = useRef(null);
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
    // 設定目標位置，小人會用動畫方式走過去，到了再觸發功能
    targetRef.current = { ...b.pos2d };
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

      let changed = false;
      const current = avatarPosRef.current;

      if (targetRef.current) {
        const target = targetRef.current;
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1) {
          const step = Math.min(dist, speed * dt);
          const nx = current.x + (dx / dist) * step;
          const ny = current.y + (dy / dist) * step;
          avatarPosRef.current = { x: nx, y: ny };
          setAvatarPos(avatarPosRef.current);
          changed = true;
        } else {
          avatarPosRef.current = { ...target };
          setAvatarPos(avatarPosRef.current);
          targetRef.current = null;
          changed = true;

          if (pendingRoomRef.current) {
            const room = pendingRoomRef.current;
            pendingRoomRef.current = null;
            runRoomAction(room);
          }
        }
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
            {/* 背景網格 */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1f2937" strokeWidth="1" />
              </pattern>
            </defs>
            <rect x="0" y="0" width="400" height="240" fill="#020617" />
            <rect x="0" y="0" width="400" height="240" fill="url(#grid)" opacity="0.5" />

            {/* 中央圓形廣場 */}
            <circle cx="200" cy="120" r="36" fill="#111827" stroke="#1f2937" strokeWidth="2" />

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

            {/* 建築節點 */}
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
                  stroke="#0f172a"
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
                  stroke="#0f172a"
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

