import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { RotateCcw } from 'lucide-react';
import { useViewStore } from '../store/viewStore';
import {
  buildings as buildingsConfig,
  getRoomAction,
} from '../data/world3dConfig';

function WorldScene({ onRunRoom }) {
  return (
    <>
      {/* 燈光與環境 */}
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 30, 140]} />
      <ambientLight intensity={0.45} color="#e0f2fe" />
      <directionalLight
        intensity={0.85}
        color="#e5edff"
        position={[40, 60, 40]}
        castShadow
      />

      {/* 地面與廣場 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 120, 1, 1]} />
        <meshStandardMaterial color="#020617" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {/* 建築群：依 world3dConfig 產生 */}
      {buildingsConfig.map((b) => (
        <group
          key={b.id}
          position={b.position}
          onClick={() => onRunRoom(b.lobby, b.name)}
          castShadow
          receiveShadow
        >
          {/* 底座 */}
          <mesh position={[0, b.size[1] * 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.size[0] * 1.1, b.size[1] * 0.24, b.size[2] * 1.1]} />
            <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.1} />
          </mesh>
          {/* 主體方塊 */}
          <mesh position={[0, b.size[1] * 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.size[0], b.size[1] * 0.7, b.size[2]]} />
            <meshStandardMaterial color={`#${b.color.toString(16).padStart(6, '0')}`} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* 頂部裝飾 */}
          <mesh position={[0, b.size[1] * 0.9, 0]} castShadow>
            <boxGeometry args={[b.size[0] * 0.6, b.size[1] * 0.15, b.size[2] * 0.6]} />
            <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.4} />
          </mesh>
          {/* 建築名稱標籤 */}
          <Html
            position={[0, b.size[1] * 1.05, 0]}
            style={{ pointerEvents: 'none' }}
            distanceFactor={8}
          >
            <div className="px-3 py-1 rounded-full bg-surface-800/90 border border-gray-700 text-xs text-gray-100 shadow-card whitespace-nowrap">
              {b.name}
            </div>
          </Html>
        </group>
      ))}

      {/* 相機控制 */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={18}
        maxDistance={90}
        maxPolarAngle={Math.PI / 2 - 0.12}
      />
    </>
  );
}

export default function World3DView() {
  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);

  const runRoomAction = useCallback(
    (roomId, buildingName) => {
      const act = getRoomAction(roomId);
      if (!act) return;
      if (act.action === 'navigate') {
        setCurrentView(act.targetView);
      } else if (act.action === 'openPanel' && act.target === 'CoachChat') {
        setIsChatOpen(true);
      }
    },
    [setCurrentView, setIsChatOpen]
  );

  const handleResetView = () => {
    // 交給 OrbitControls 的預設行為，未來可透過 ref 精細控制相機
    // 目前提供一個語意化按鈕，方便未來擴充
    window.dispatchEvent(new CustomEvent('world3d-reset'));
  };

  return (
    <div
      className="relative w-full min-h-[60vh] h-[calc(100vh-6rem)] rounded-panel overflow-hidden bg-surface-900"
      role="application"
      aria-label="3D 虛擬城市場景。點擊建築物即可前往對應功能。"
    >
      {/* 天空漸層疊加（上方較亮，品牌感） */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary-800/25 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* 重置視角（暫時為語意按鈕，未來可綁 OrbitControls ref） */}
      <button
        type="button"
        onClick={handleResetView}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs font-medium text-gray-300 bg-surface-800/90 border border-gray-700 rounded-button hover:text-white hover:bg-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="重置視角"
        title="重置視角"
      >
        <RotateCcw size={14} aria-hidden /> 重置視角
      </button>

      {/* React Three Fiber Canvas 場景 */}
      <Canvas
        shadows
        camera={{ position: [30, 30, 30], fov: 50, near: 0.1, far: 200 }}
        className="absolute inset-0 w-full h-full"
      >
        <Suspense
          fallback={
            <Html center>
              <div className="px-4 py-2 rounded-button bg-surface-800/90 border border-gray-700 text-xs text-gray-300 shadow-card">
                載入 3D 城市中…
              </div>
            </Html>
          }
        >
          <WorldScene onRunRoom={runRoomAction} />
        </Suspense>
      </Canvas>
    </div>
  );
}
