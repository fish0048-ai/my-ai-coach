import React, { Suspense, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
// 僅匯入 useGLTF，避免載入 Effects/CubeCamera 等使用 three 已移除 API 的模組（RGBFormat、WebGLMultisampleRenderTarget）
import { useGLTF } from '@react-three/drei/core/useGLTF.js';
import { RotateCcw } from 'lucide-react';
import { useViewStore } from '../store/viewStore';
import {
  buildings as buildingsConfig,
  getRoomAction,
} from '../data/world3dConfig';

const KENNEY_BASE = '/models/kenney/';

// 預載 7 棟建築用 GLB，減少進入 3D 視圖時的延遲
['building-a.glb', 'building-b.glb', 'building-c.glb', 'building-d.glb', 'building-e.glb', 'building-f.glb', 'building-g.glb'].forEach((f) => {
  useGLTF.preload(KENNEY_BASE + f);
});

/** 單一 Kenney GLB 建築：依 size 縮放，材質保持明亮以符合平台風格 */
function KenneyBuilding({ url, size }) {
  const { scene } = useGLTF(KENNEY_BASE + url);
  const [, h] = size;
  const scale = (h * 0.9) / 1;
  const clone = React.useMemo(() => scene.clone(), [scene]);

  return (
    <group scale={scale} castShadow receiveShadow>
      <primitive object={clone} />
    </group>
  );
}

/** 程式生成的方塊建築（fallback 或無 Kenney 時）；position 可選，fallback 時由外層提供 */
function BoxBuilding({ building, onRunRoom, position: pos }) {
  const b = building;
  const position = pos ?? b.position;
  return (
    <group
      position={position}
      onClick={() => onRunRoom(b.lobby, b.name)}
      castShadow
      receiveShadow
    >
      <mesh position={[0, b.size[1] * 0.12, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.size[0] * 1.1, b.size[1] * 0.24, b.size[2] * 1.1]} />
        <meshStandardMaterial color="#020617" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[0, b.size[1] * 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[b.size[0], b.size[1] * 0.7, b.size[2]]} />
        <meshStandardMaterial color={`#${b.color.toString(16).padStart(6, '0')}`} roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[0, b.size[1] * 0.9, 0]} castShadow>
        <boxGeometry args={[b.size[0] * 0.6, b.size[1] * 0.15, b.size[2] * 0.6]} />
        <meshStandardMaterial color="#020617" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

function WorldScene({ onRunRoom }) {
  return (
    <>
      {/* 燈光與環境：Kenney 平台風格（天空藍、草地綠、暖土） */}
      <color attach="background" args={['#87ceeb']} />
      <fog attach="fog" args={['#87ceeb', 40, 130]} />
      <ambientLight intensity={0.4} color="#b3e5fc" />
      <directionalLight
        intensity={0.7}
        color="#fffde7"
        position={[50, 60, 40]}
        castShadow
      />
      <directionalLight intensity={0.25} color="#7cb342" position={[-30, 20, 20]} />
      <directionalLight intensity={0.15} color="#8d6e63" position={[0, -10, 0]} />

      {/* 地面：草地綠 + 中央廣場土色 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[120, 120, 1, 1]} />
        <meshStandardMaterial color="#558b2f" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>

      {/* 建築群：有 kenneyModel 則載入 GLB，否則方塊 */}
      {buildingsConfig.map((b) =>
        b.kenneyModel ? (
          <group
            key={b.id}
            position={b.position}
            onClick={() => onRunRoom(b.lobby, b.name)}
          >
            <Suspense fallback={<BoxBuilding building={b} onRunRoom={onRunRoom} position={[0, 0, 0]} />}>
              <KenneyBuilding url={b.kenneyModel} size={b.size} />
            </Suspense>
          </group>
        ) : (
          <BoxBuilding key={b.id} building={b} onRunRoom={onRunRoom} />
        )
      )}
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
      className="relative w-full min-h-[60vh] h-[calc(100vh-6rem)] rounded-panel overflow-hidden bg-game-sky border-[3px] border-game-outline shadow-card"
      role="application"
      aria-label="3D 虛擬城市場景。點擊建築物即可前往對應功能。"
    >
      {/* 天空漸層疊加：平台風格 */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/20 via-transparent to-game-grass/20"
        aria-hidden="true"
      />

      {/* 重置視角：平台風格粗邊 */}
      <button
        type="button"
        onClick={handleResetView}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs font-medium text-game-outline bg-white/95 border-[3px] border-game-outline rounded-game shadow-card hover:bg-game-grass hover:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            <></>
          }
        >
          <WorldScene onRunRoom={runRoomAction} />
        </Suspense>
      </Canvas>
    </div>
  );
}
