# 未來若要加回「基地地圖／等角世界／3D」

> **狀態（2025-02）**：World 相關功能已自產品移除，登入後預設為 **總覽 (`dashboard`)**。  
> 還原請以 **Git 歷史** 取回下列檔案與 `App.jsx`、`MainLayout.jsx`、`viewStore.js` 的差異。

## 已刪除的檔案（還原時一併取回）

| 檔案 | 用途 |
|------|------|
| `src/views/WorldMap.jsx` | RPG 基地地圖首頁（路由 `map`） |
| `src/views/WorldView.jsx` | 等角世界入口＋快捷列（路由 `world-3d`） |
| `src/views/World2DView.jsx` | SVG 等角地圖 |
| `src/views/World3DView.jsx` | （若當時已刪）Three.js／R3F 3D 場景 |
| `src/data/athleticaMapConfig.js` | 基地地圖建築與導航 |
| `src/data/world3dConfig.js` | 等角／3D 建築 DSL、位置、ROOM_ACTIONS |

## 應用程式需恢復的接線

1. **`src/App.jsx`**  
   - `React.lazy` 載入 `WorldMap`、`WorldView`（若只有 2D 則僅 WorldView + World2DView）。  
   - `switch` 增加 `case 'map':`、`case 'world-3d':`。

2. **`src/layouts/MainLayout.jsx`**  
   - 側欄 **Athletica** 區：`基地地圖`、`等角世界`（或合併為單一入口）。  
   - `VIEW_TITLES` 補上 `map`、`world-3d`。  
   - 頂欄「回到地圖」或改為與當時 UX 一致。

3. **`src/store/viewStore.js`**  
   - 若要以地圖為首頁：`currentView: 'map'`、`currentLocation: 'MAP'`，並在 `setCurrentView` 內恢復 `view === 'map' ? 'MAP' : view` 邏輯（若仍需要 `currentLocation`）。

4. **`src/App.jsx` 遷移用 `useEffect`**  
   - 移除「`map`／`world-3d` → dashboard」的修正，避免與新路由衝突。

## 3D 專用（若一併還原）

- npm：`three`、`@react-three/fiber`、`@react-three/drei`  
- `vite.config.js`：three 相關 `manualChunks`／alias（見刪除前的 commit）  
- 資源：`public/models/kenney/*.glb`（可選）

## 備註

- 總覽上的 RPG HUD（等級／經驗／金幣）仍保留，與地圖無硬性依賴。  
- 計畫文件 `.cursor/plans/*` 內若有 World／World3D 描述，僅供歷史參考，以 Git 實際檔案為準。
