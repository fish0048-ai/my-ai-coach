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
const FLOOR_COLOR = 0x1e293b;
const LINK_IDLE_COLOR = 0x334155;
const LINK_ACTIVE_COLOR = 0x38bdf8;
const AVATAR_HEIGHT = 1.2;
const AVATAR_RADIUS = 0.4;

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
    const floorMat = new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 網格線（輔助）
    const grid = new THREE.GridHelper(FLOOR_SIZE, 40, 0x334155, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // 建築物
    buildingsConfig.forEach((b) => {
      const [wx, wy, wz] = b.size;
      const geo = new THREE.BoxGeometry(wx, wy, wz);
      const mat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.6, metalness: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...b.position);
      mesh.position.y = wy / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { buildingId: b.id, lobby: b.lobby, enterRadius: 5 };
      scene.add(mesh);
    });

    // 小人（膠囊狀：圓柱 + 半球頂）
    const cylGeo = new THREE.CylinderGeometry(AVATAR_RADIUS, AVATAR_RADIUS, Math.max(0.01, AVATAR_HEIGHT - AVATAR_RADIUS * 2), 16);
    const sphGeo = new THREE.SphereGeometry(AVATAR_RADIUS, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const sphGeo2 = sphGeo.clone();
    const cap = new THREE.Group();
    const cyl = new THREE.Mesh(cylGeo, new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    cyl.position.y = (AVATAR_HEIGHT - AVATAR_RADIUS * 2) / 2 + AVATAR_RADIUS;
    cap.add(cyl);
    const top = new THREE.Mesh(sphGeo, new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    top.position.y = AVATAR_HEIGHT - AVATAR_RADIUS;
    cap.add(top);
    const bot = new THREE.Mesh(sphGeo2, new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    bot.position.y = AVATAR_RADIUS;
    bot.rotation.x = Math.PI;
    cap.add(bot);
    cap.position.set(...avatarConfig.startPosition);
    cap.castShadow = true;
    scene.add(cap);
    avatarMeshRef.current = cap;

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
    const amb = new THREE.AmbientLight(0x404070, 0.6);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(20, 30, 20);
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
      if (k === 'w') keysRef.current.w = true;
      if (k === 'a') keysRef.current.a = true;
      if (k === 's') keysRef.current.s = true;
      if (k === 'd') keysRef.current.d = true;
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

      // 進入建築判定
      if (avatarMesh) {
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
