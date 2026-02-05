import React, { useRef, useEffect, useCallback, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useViewStore } from '../store/viewStore';
import {
  avatar as avatarConfig,
  buildings as buildingsConfig,
  links as linksConfig,
  getRoomAction,
  getBuildingById,
} from '../data/world3dConfig';

const FLOOR_SIZE = 80;
const FLOOR_COLOR = 0x0f172a;
const PLAZA_COLOR = 0x1f2937;
const LINK_IDLE_COLOR = 0x4b5563;
const LINK_ACTIVE_COLOR = 0x38bdf8;
const AVATAR_HEIGHT = 1.4;
const AVATAR_RADIUS = 0.45;

export default function World3DView() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const avatarMeshRef = useRef(null);
  const linkMeshesRef = useRef([]);
  const lastEnteredRef = useRef(null);
  const rafRef = useRef(null);
  const hasMovedRef = useRef(false); // 使用者是否曾經移動過
  const targetRef = useRef(null); // 目標移動位置（滑鼠點擊地面）

  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);
  const [tip, setTip] = useState('使用滑鼠點擊地面移動小人 · 靠近建築物即進入該功能');
  const [hoveredBuilding, setHoveredBuilding] = useState(null);
  const [enterFeedback, setEnterFeedback] = useState(null);
  const buildingMeshesRef = useRef([]);
  const controlsRefForReset = useRef(null);
  const cameraRefForReset = useRef(null);

  const runRoomAction = useCallback(
    (roomId, buildingName) => {
      const act = getRoomAction(roomId);
      if (!act) return;
      if (buildingName) {
        setEnterFeedback(`已前往 ${buildingName}`);
        setTip(`已前往 ${buildingName}`);
        setTimeout(() => {
          setEnterFeedback(null);
          setTip('使用滑鼠點擊地面移動小人 · 靠近建築物即進入該功能');
        }, 2000);
      }
      if (act.action === 'navigate') {
        setCurrentView(act.targetView);
      } else if (act.action === 'openPanel' && act.target === 'CoachChat') {
        setIsChatOpen(true);
      }
    },
    [setCurrentView, setIsChatOpen]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    // 天空漸層：上方較亮（#1e3a5f）、下方較深（#0f172a），符合 Modern Fitness Dark
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.018);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(20, 18, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    // 效能：小螢幕或高 DPR 時限制 pixel ratio，減少負擔
    const dpr = Math.min(window.devicePixelRatio, 2);
    const limitBySize = container.clientWidth < 640 ? 1 : dpr;
    renderer.setPixelRatio(limitBySize);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...avatarConfig.startPosition);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    controlsRef.current = controls;
    controlsRefForReset.current = controls;
    cameraRefForReset.current = camera;

    // 地面
    const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE, 20, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 1, metalness: 0 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 中央廣場（圓形，可愛風小鎮中心）
    const plazaGeo = new THREE.CircleGeometry(10, 32);
    const plazaMat = new THREE.MeshStandardMaterial({ color: PLAZA_COLOR, roughness: 0.9, metalness: 0.05 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.005;
    scene.add(plaza);

    // 網格線（輔助）
    const grid = new THREE.GridHelper(FLOOR_SIZE, 40, 0x334155, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // 建築物（多段小屋 + 屋頂 + 招牌，偏可愛風）
    buildingsConfig.forEach((b) => {
      const [wx, wy, wz] = b.size;
      const group = new THREE.Group();

      // 底座
      const baseGeo = new THREE.BoxGeometry(wx * 1.05, wy * 0.25, wz * 1.05);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.1 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = (wy * 0.25) / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      // 主體
      const bodyGeo = new THREE.BoxGeometry(wx, wy * 0.6, wz);
      const bodyMat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.7, metalness: 0.15 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = (wy * 0.25) + (wy * 0.6) / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);

      // 屋頂（錐形）
      const roofGeo = new THREE.ConeGeometry(Math.max(wx, wz) * 0.6, wy * 0.4, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.3 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = (wy * 0.25) + (wy * 0.6) + (wy * 0.2);
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);

      // 簡單窗戶（發光小方塊）
      const windowGeo = new THREE.BoxGeometry(wx * 0.4, wy * 0.18, 0.05);
      const windowMat = new THREE.MeshStandardMaterial({ color: 0xfeffd5, emissive: 0xfef9c3, emissiveIntensity: 0.6 });
      const win = new THREE.Mesh(windowGeo, windowMat);
      win.position.set(0, (wy * 0.25) + (wy * 0.4), wz / 2 + 0.03);
      group.add(win);

      group.position.set(...b.position);
      group.userData = { buildingId: b.id, buildingName: b.name, lobby: b.lobby, enterRadius: 5, size: b.size };
      scene.add(group);
      buildingMeshesRef.current.push(group);
    });

    // 小人（Q 版：大頭小身體 + 眼睛）
    const avatarGroup = new THREE.Group();

    // 身體
    const bodyGeo = new THREE.CylinderGeometry(AVATAR_RADIUS * 0.8, AVATAR_RADIUS, AVATAR_HEIGHT * 0.55, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.7, metalness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = (AVATAR_HEIGHT * 0.55) / 2 + AVATAR_RADIUS * 0.2;
    avatarGroup.add(body);

    // 頭（比例偏大）
    const headGeo = new THREE.SphereGeometry(AVATAR_RADIUS * 1.4, 24, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf9fafb, roughness: 0.9, metalness: 0.05 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = AVATAR_HEIGHT;
    avatarGroup.add(head);

    // 眼睛
    const eyeGeo = new THREE.SphereGeometry(AVATAR_RADIUS * 0.22, 16, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.2 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat.clone());
    const eyeOffsetX = AVATAR_RADIUS * 0.6;
    const eyeOffsetY = AVATAR_RADIUS * 0.1;
    const eyeOffsetZ = AVATAR_RADIUS * 1.2;
    eyeL.position.set(-eyeOffsetX, AVATAR_HEIGHT + eyeOffsetY, eyeOffsetZ);
    eyeR.position.set(eyeOffsetX, AVATAR_HEIGHT + eyeOffsetY, eyeOffsetZ);
    avatarGroup.add(eyeL);
    avatarGroup.add(eyeR);

    avatarGroup.position.set(...avatarConfig.startPosition);
    avatarGroup.castShadow = true;
    avatarGroup.receiveShadow = true;
    scene.add(avatarGroup);
    avatarMeshRef.current = avatarGroup;

    // 同步連線（線段）
    const linkMeshes = [];
    linksConfig.forEach((link) => {
      const fromB = getBuildingById(link.from);
      const toB = getBuildingById(link.to);
      if (!fromB || !toB) return;
      const [x1, y1, z1] = fromB.position;
      const [x2, y2, z2] = toB.position;
      const pts = [new THREE.Vector3(x1, y1 + fromB.size[1] / 2 + 0.5, z1), new THREE.Vector3(x2, y2 + toB.size[1] / 2 + 0.5, z2)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: LINK_IDLE_COLOR, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      line.userData = { linkId: link.id };
      scene.add(line);
      linkMeshes.push({ line, link });
    });
    linkMeshesRef.current = linkMeshes;

    // 燈光：環境光偏冷、主光帶一點藍，與深色主題一致
    const amb = new THREE.AmbientLight(0xe0e7ff, 0.4);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xf0f4ff, 0.85);
    dir.position.set(18, 26, 18);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 1024;
    dir.shadow.mapSize.height = 1024;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 100;
    dir.shadow.camera.left = -30;
    dir.shadow.camera.right = 30;
    dir.shadow.camera.top = 30;
    dir.shadow.camera.bottom = -30;
    scene.add(dir);

    // 滑鼠點擊移動：使用 Raycaster 將點擊轉換為地面座標
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hitPoint = new THREE.Vector3();
      const intersect = raycaster.ray.intersectPlane(groundPlane, hitPoint);
      if (intersect) {
        if (!targetRef.current) targetRef.current = new THREE.Vector3();
        targetRef.current.copy(hitPoint);
        targetRef.current.y = avatarConfig.startPosition[1];
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Hover：偵測滑鼠下的建築，顯示名稱
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(buildingMeshesRef.current, true);
      const hit = intersects[0];
      const group = hit?.object?.parent;
      const name = group?.userData?.buildingName ?? hit?.object?.userData?.buildingName ?? null;
      setHoveredBuilding(name || null);
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    let t = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = 0.016;
      t += dt;

      const avatarMesh = avatarMeshRef.current;
      const speed = avatarConfig.moveSpeed * 60 * dt;

      // 點擊移動：朝目標位置前進
      if (avatarMesh && targetRef.current) {
        const target = targetRef.current;
        const dir = new THREE.Vector3(
          target.x - avatarMesh.position.x,
          0,
          target.z - avatarMesh.position.z
        );
        const dist = dir.length();
        if (dist > 0.05) {
          dir.normalize();
          const step = Math.min(speed, dist);
          avatarMesh.position.x += dir.x * step;
          avatarMesh.position.z += dir.z * step;
          avatarMesh.position.y = avatarConfig.startPosition[1];
          hasMovedRef.current = true;

          // 讓小人面向移動方向（Z 軸朝前）
          const yaw = Math.atan2(dir.x, dir.z * -1);
          avatarMesh.rotation.y = yaw;
        } else {
          targetRef.current = null;
        }
      }

      // 進入建築判定（需使用者實際按鍵移動過才啟用）
      if (avatarMesh && hasMovedRef.current) {
        buildingsConfig.forEach((b) => {
          const px = avatarMesh.position.x - b.position[0];
          const pz = avatarMesh.position.z - b.position[2];
          const dist = Math.sqrt(px * px + pz * pz);
          const thresh = b.size[0] / 2 + (avatarConfig.enterRadius ?? 5);
          if (dist < thresh) {
            if (lastEnteredRef.current !== b.id) {
              lastEnteredRef.current = b.id;
              runRoomAction(b.lobby, b.name);
            }
          } else {
            if (lastEnteredRef.current === b.id) lastEnteredRef.current = null;
          }
        });
      }

      if (avatarMesh) controls.target.copy(avatarMesh.position);

      // 同步連線動畫（示範：輪流亮起）
      linkMeshesRef.current.forEach(({ line }, i) => {
        const m = line.material;
        const phase = (t * 0.5 + i * 0.8) % (Math.PI * 2);
        m.color.setHex(phase < Math.PI ? LINK_ACTIVE_COLOR : LINK_IDLE_COLOR);
      });

      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      if (!container?.parentElement) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.dispose();
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      linkMeshesRef.current.forEach(({ line }) => {
        line.geometry.dispose();
        line.material.dispose();
      });
      floorGeo.dispose();
      floorMat.dispose();
      scene.clear();
      renderer.dispose();
      if (container?.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [runRoomAction]);

  const handleResetView = useCallback(() => {
    const controls = controlsRefForReset.current;
    const camera = cameraRefForReset.current;
    const avatar = avatarMeshRef.current;
    if (controls && camera && avatar) {
      const x = avatar.position.x;
      const y = avatar.position.y;
      const z = avatar.position.z;
      controls.target.set(x, y, z);
      camera.position.set(x + 20, y + 18, z + 20);
      camera.lookAt(x, y, z);
    }
  }, []);

  return (
    <div
      className="relative w-full min-h-[60vh] h-[calc(100vh-6rem)] rounded-panel overflow-hidden bg-surface-900"
      role="application"
      aria-label="3D 虛擬城市場景。使用滑鼠點擊地面移動角色，靠近建築物即進入該功能。"
    >
      <div ref={containerRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
      {/* 天空漸層疊加（上方較亮，品牌感） */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-primary-800/25 via-transparent to-transparent"
        aria-hidden="true"
      />
      {/* 重置視角 */}
      <button
        type="button"
        onClick={handleResetView}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs font-medium text-gray-300 bg-surface-800/90 border border-gray-700 rounded-button hover:text-white hover:bg-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="重置視角"
        title="重置視角"
      >
        <RotateCcw size={14} aria-hidden /> 重置視角
      </button>
      {/* Hover 建築名稱提示 */}
      {hoveredBuilding && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-surface-800/95 border border-primary-500/30 rounded-button text-primary-200 text-sm font-medium shadow-card pointer-events-none z-10"
          role="tooltip"
        >
          {hoveredBuilding}
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center pointer-events-none">
        <p
          className={`text-sm px-4 py-2 rounded-button border shadow-card ${
            enterFeedback
              ? 'text-primary-400 bg-primary-500/20 border-primary-500/40'
              : 'text-gray-400 bg-surface-800/80 border-gray-700'
          }`}
          role="status"
          aria-live="polite"
        >
          {tip}
        </p>
      </div>
    </div>
  );
}
