import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  const keysRef = useRef({ w: false, a: false, s: false, d: false });
  const yawRef = useRef(0);
  const lastEnteredRef = useRef(null);
  const rafRef = useRef(null);
  const hasMovedRef = useRef(false); // 使用者是否曾經按鍵移動過

  const setCurrentView = useViewStore((s) => s.setCurrentView);
  const setIsChatOpen = useViewStore((s) => s.setIsChatOpen);
  const [tip, setTip] = useState('WASD 移動小人 · 靠近建築物即進入該功能');

  const runRoomAction = useCallback(
    (roomId) => {
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(20, 18, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
      group.userData = { buildingId: b.id, lobby: b.lobby, enterRadius: 5, size: b.size };
      scene.add(group);
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

    // 燈光
    const amb = new THREE.AmbientLight(0xf9fafb, 0.45);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
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

    // 鍵盤
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') { keysRef.current.w = true; hasMovedRef.current = true; }
      if (k === 'a') { keysRef.current.a = true; hasMovedRef.current = true; }
      if (k === 's') { keysRef.current.s = true; hasMovedRef.current = true; }
      if (k === 'd') { keysRef.current.d = true; hasMovedRef.current = true; }
    };
    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w') keysRef.current.w = false;
      if (k === 'a') keysRef.current.a = false;
      if (k === 's') keysRef.current.s = false;
      if (k === 'd') keysRef.current.d = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let t = 0;
    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const dt = 0.016;
      t += dt;

      const avatarMesh = avatarMeshRef.current;
      const keys = keysRef.current;
      const speed = avatarConfig.moveSpeed * 60 * dt;
      let yaw = yawRef.current;
      const rotSpeed = 2.5 * dt;
      if (keys.a) yaw += rotSpeed;
      if (keys.d) yaw -= rotSpeed;
      yawRef.current = yaw;
      const dx = -Math.sin(yaw) * speed;
      const dz = -Math.cos(yaw) * speed;
      if (avatarMesh) {
        if (keys.w) {
          avatarMesh.position.x += dx;
          avatarMesh.position.z += dz;
        }
        if (keys.s) {
          avatarMesh.position.x -= dx;
          avatarMesh.position.z -= dz;
        }
        avatarMesh.position.y = avatarConfig.startPosition[1];
        avatarMesh.rotation.y = yaw;
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
              runRoomAction(b.lobby);
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      controls.dispose();
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

  return (
    <div className="relative w-full min-h-[60vh] h-[calc(100vh-6rem)] rounded-xl overflow-hidden bg-slate-950">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-4 left-4 right-4 flex justify-center">
        <p className="text-sm text-slate-400 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-700">
          {tip}
        </p>
      </div>
    </div>
  );
}
