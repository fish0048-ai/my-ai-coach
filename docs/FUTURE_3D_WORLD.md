# 未來若要恢復或修改「3D 虛擬城市」功能

> **狀態（2025-02）**：已從產品中移除 Three.js / React Three Fiber 的 3D 場景，以減少 bundle 與維護成本。  
> **保留**：側欄「等角世界」仍進入 **2D 等角地圖**（`WorldView` → `World2DView`），資料仍來自 `src/data/world3dConfig.js`。

## 當時移除了什麼

| 項目 | 說明 |
|------|------|
| `src/views/World3DView.jsx` | 已刪除。R3F `<Canvas>`、建築 GLB／方塊、點擊導航等。 |
| npm 套件 | `three`、`@react-three/fiber`、`@react-three/drei` |
| `src/shims/threeWithMsrt.js`、`dreiEffectsShim.js` | 已刪除（僅為舊版 three/drei 相容用）。 |
| Vite | `manualChunks` 中的 `three-vendor`、`resolve.alias` 的 three stats 路徑（若已清空可忽略）。 |

## 若要重新加入 3D

1. **還原程式**  
   - 從 Git 歷史取回刪除前的 `World3DView.jsx`（及本文件建立當次的 `WorldView.jsx`、`App.jsx`、`vite.config.js`、`package.json` 差異）。  
   - 在 `WorldView.jsx` 恢復 `mode === '3d' | '2d'` 切換與 `World3DView` 的 import。

2. **安裝依賴**（版本需互相相容，以下為移除前參考）  
   ```bash
   npm install three @react-three/fiber @react-three/drei
   ```  
   若 drei 與 three 版本不相容，可能需恢復當時的 shim 或調整 drei 匯入方式（見舊版 `World3DView.jsx` 註解：僅匯入 `useGLTF` 等子路徑以避免過時 API）。

3. **資源**  
   - `world3dConfig.js` 內 `KENNEY_MODEL` 指向 `public/models/kenney/*.glb`；若目錄不存在會 fallback 為程式方塊。  
   - 事件：`world3d-reset`（舊 3D 視圖用於重置相機／狀態）。

4. **路由**  
   - `App.jsx` 中 `case 'world-3d':` 仍渲染 `WorldView`；無需改 view id，除非你想改名並一併改 `viewStore` / 側欄。

## 相關檔案（移除 3D 後仍保留）

- `src/views/WorldView.jsx` — 僅包裝快捷列 + `World2DView`  
- `src/views/World2DView.jsx` — SVG 等角地圖  
- `src/data/world3dConfig.js` — 建築位置、導航動作、連結 DSL（2D／未來 3D 共用）

## 修改建議（未來）

- 可考慮將 `world3dConfig` 更名為 `worldMapConfig` 以降低「僅 3D」聯想。  
- 若只要輕量 3D，可評估 **純 three.js 無 R3F** 的單一畫布元件，減少 drei 版本牽連。
