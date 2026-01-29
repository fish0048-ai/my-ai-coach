import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useViewStore } from '../store/viewStore';
import {
  avatar as avatarConfig,
  buildings as buildingsConfig,
  links as linksConfig,
  getRoomAction,
  getBuildingById,
} from '../data/world3dConfig';

// --- 🎨 美化版等角投影 (Isometric Projection) ---
// 將 3D (X, Y, Z) 投影到 2D 等角平面
const projectToIso = ([x, y, z]) => {
  const scale = 5.5; // 放大比例
  const angle = Math.PI / 6; // 30度
  
  // 等角變換公式
  const screenX = (x - z) * Math.cos(angle) * scale;
  const screenY = (x + z) * Math.sin(angle) * scale - (y * scale);
  
  const offsetX = 200; // SVG 中央偏移
  const offsetY = 100;
  
  return {
    x: offsetX + screenX,
    y: offsetY + screenY,
  };
};

// --- 🏠 等角小屋組件 (Isometric House) ---
const IsoBuilding = ({ b, onClick }) => {
  const [wx, wy, wz] = b.size;
  const color = `#${b.color.toString(16).padStart(6, '0')}`;
  
  // 計算小屋頂點
  // 我們簡化為一個立體方塊 + 坡面屋頂
  return (
    <g
      className="cursor-pointer transition-transform hover:scale-105 duration-300 group"
      onClick={() => onClick(b)}
    >
      {/* 底部陰影 */}
      <ellipse cx="0" cy="5" rx={wx * 3} ry={wz * 1.5} fill="rgba(0,0,0,0.3)" />

      {/* 建築主體 (Isometric Box) */}
      <g transform="translate(0, -2)">
        {/* 右側面 */}
        <path
          d={`M 0 0 L ${wz * 3} ${wz * 1.5} L ${wz * 3} ${-wy * 3 + wz * 1.5} L 0 ${-wy * 3} Z`}
          fill={color}
          filter="brightness(0.8)"
        />
        {/* 左側面 */}
        <path
          d={`M 0 0 L ${-wx * 3} ${wx * 1.5} L ${-wx * 3} ${-wy * 3 + wx * 1.5} L 0 ${-wy * 3} Z`}
          fill={color}
          filter="brightness(0.9)"
        />
        {/* 屋頂面 (等角菱形) */}
        <path
          d={`M 0 ${-wy * 3} L ${wz * 3} ${-wy * 3 + wz * 1.5} L ${(wz - wx) * 3} ${-wy * 3 + (wz + wx) * 1.5} L ${-wx * 3} ${-wy * 3 + wx * 1.5} Z`}
          fill="#1e293b"
        />
        
        {/* 裝飾：小窗戶 */}
        <rect x={wx * 0.5} y={-wy * 2} width="4" height="6" fill="#fde68a" opacity="0.8" transform="skewY(30)" />
        <rect x={-wx * 2.5} y={-wy * 2} width="4" height="6" fill="#fde68a" opacity="0.8" transform="skewY(-30)" />
      </g>

      {/* 漂浮標籤 */}
      <g transform={`translate(0, ${-wy * 3 - 15})`}>
        <rect x="-30" y="-10" width="60" height="16" rx="8" fill="rgba(15, 23, 42, 0.8)" />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          className="fill-slate-100 font-bold"
          fontSize="8"
        >
          {b.name}
        </text>
      </g>
    </g>
  );
};

export default function World2DView() {
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);

  const { projectedBuildings, projectedLinks, avatarStartIso } = useMemo(() => {
    const projectedBuildings = buildingsConfig.map((b) => ({
      ...b,
      posIso: projectToIso(b.position),
    }));

    const projectedLinks = linksConfig.map((link) => {
      const fromB = getBuildingById(link.from);
      const toB = getBuildingById(link.to);
      if (!fromB || !toB) return null;
      const fromIso = projectToIso(fromB.position);
      const toIso = projectToIso(toB.position);
      return { id: link.id, fromIso, toIso };
    }).filter(Boolean);

    const avatarStartIso = projectToIso(avatarConfig.startPosition);

    return { projectedBuildings, projectedLinks, avatarStartIso };
  }, []);

  const [avatarPos, setAvatarPos] = useState(avatarStartIso);
  const [wobblePhase, setWobblePhase] = useState(0);
  const avatarPosRef = useRef(avatarStartIso);
  const worldPosRef = useRef({ x: avatarConfig.startPosition[0], z: avatarConfig.startPosition[2] });
  const pathRef = useRef([]); // 存儲 3D 世界坐標路徑
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
    // 建立 3D 空間的 L 型路徑 (先移動 X，再移動 Z)
    const start = worldPosRef.current;
    const end = { x: b.position[0], z: b.position[2] };
    
    const segments = [];
    if (Math.abs(end.x - start.x) > 0.1) segments.push({ x: end.x, z: start.z });
    if (Math.abs(end.z - start.z) > 0.1) segments.push({ x: end.x, z: end.z });

    if (segments.length === 0) {
      runRoomAction(b.lobby);
      return;
    }

    pathRef.current = segments;
    pendingRoomRef.current = b.lobby;
  };

  useEffect(() => {
    const speed = 15; // 3D 單位 / 秒

    const loop = (time) => {
      rafRef.current = requestAnimationFrame(loop);
      if (lastTimeRef.current == null) {
        lastTimeRef.current = time;
        return;
      }
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      if (pathRef.current && pathRef.current.length > 0) {
        const target = pathRef.current[0];
        const current = worldPosRef.current;
        
        const dx = target.x - current.x;
        const dz = target.z - current.z;
        const dist = Math.hypot(dx, dz);

        if (dist > 0.1) {
          const step = Math.min(dist, speed * dt);
          const nx = current.x + (dx / dist) * step;
          const nz = current.z + (dz / dist) * step;
          worldPosRef.current = { x: nx, z: nz };
          setAvatarPos(projectToIso([nx, 0, nz]));
        } else {
          worldPosRef.current = { ...target };
          setAvatarPos(projectToIso([target.x, 0, target.z]));
          pathRef.current.shift();

          if (pathRef.current.length === 0 && pendingRoomRef.current) {
            const room = pendingRoomRef.current;
            pendingRoomRef.current = null;
            runRoomAction(room);
          }
        }
      }

      setWobblePhase((prev) => prev + dt * 3);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [runRoomAction]);

  return (
    <div className="relative w-full min-h-[70vh] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
      {/* 頂部標題 */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 bg-gradient-to-b from-slate-900 to-transparent flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">AI Coach World</h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Interactive System Map</p>
        </div>
        <div className="flex gap-2">
           <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-bold">MODE: ISOMETRIC 2D</div>
        </div>
      </div>

      {/* SVG 畫布 */}
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="relative w-full max-w-4xl aspect-[16/10]">
          <svg viewBox="0 0 400 250" className="w-full h-full drop-shadow-2xl">
            <defs>
              {/* 地面漸層 */}
              <radialGradient id="isoGround" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e293b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>
              
              {/* 連線脈衝動畫 */}
              <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* 地面氛圍 */}
            <circle cx="200" cy="140" r="180" fill="url(#isoGround)" />
            
            {/* 裝飾：漂浮雲朵 */}
            <g opacity="0.4">
               <ellipse cx="60" cy="40" rx="15" ry="8" fill="#475569">
                 <animate attributeName="cx" values="60;70;60" dur="8s" repeatCount="indefinite" />
               </ellipse>
               <ellipse cx="340" cy="60" rx="20" ry="10" fill="#475569">
                 <animate attributeName="cx" values="340;330;340" dur="10s" repeatCount="indefinite" />
               </ellipse>
            </g>

            {/* 互動關係線 (等角) */}
            {projectedLinks.map((l) => (
              <g key={l.id}>
                <line
                  x1={l.fromIso.x}
                  y1={l.fromIso.y}
                  x2={l.toIso.x}
                  y2={l.toIso.y}
                  stroke="#334155"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                />
                {/* 脈衝動畫點 */}
                <circle r="2" fill="#38bdf8">
                  <animateMotion
                    path={`M ${l.fromIso.x} ${l.fromIso.y} L ${l.toIso.x} ${l.toIso.y}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
                </circle>
              </g>
            ))}

            {/* 建築物 */}
            {projectedBuildings.map((b) => (
              <g key={b.id} transform={`translate(${b.posIso.x}, ${b.posIso.y})`}>
                <IsoBuilding b={b} onClick={handleBuildingClick} />
              </g>
            ))}

            {/* Q 版小人 */}
            <g transform={`translate(${avatarPos.x}, ${avatarPos.y + Math.sin(wobblePhase) * 2})`}>
               {/* 影子 */}
               <ellipse cx="0" cy="4" rx="6" ry="3" fill="rgba(0,0,0,0.4)" />
               {/* 身體 */}
               <path d="M -4 0 L 4 0 L 0 -10 Z" fill="#38bdf8" />
               {/* 大頭 */}
               <circle cx="0" cy="-12" r="5" fill="#f8fafc" />
               {/* 眼睛 */}
               <circle cx="-1.5" cy="-13" r="1" fill="#0f172a" />
               <circle cx="1.5" cy="-13" r="1" fill="#0f172a" />
               {/* 光圈 */}
               <circle r="8" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.5">
                  <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
               </circle>
            </g>
          </svg>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <div className="px-6 py-2 bg-slate-900/90 border border-slate-800 rounded-full shadow-lg backdrop-blur-md">
           <p className="text-[11px] text-slate-300 font-medium tracking-wider uppercase flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
             Click a building to navigate the world
           </p>
        </div>
      </div>
    </div>
  );
}
