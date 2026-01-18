# 專案架構診斷與重構計劃

## 1. 目前架構摘要

### 現況結構 (8-12 點)

1. **技術棧**: React 18.3.1 + Vite + Firebase (Auth/Firestore) + Tailwind CSS + Gemini AI + MediaPipe Pose
2. **分層現況**: Views (9個) / Components (4個) / Hooks (2個) / Utils (4個) / Layouts (1個)
3. **狀態管理**: 無統一狀態管理，各組件自行使用 `useState` 管理本地狀態
4. **資料流**: Firebase → View Component → UI，無中間服務層抽象
5. **Firebase 呼叫**: 散落於 9 個 View 組件中，直接使用 `collection`、`doc`、`getDocs` 等
6. **業務邏輯**: 與 UI 組件緊密耦合，例如 `CalendarView.jsx` (700+ 行) 包含 CRUD、AI 生成、檔案解析等
7. **工具函數**: 部分重複實作 (`formatDate`、`cleanNumber` 在多處重複定義)
8. **命名規範**: 不一致 (PascalCase 組件 / camelCase hooks / 混用中英文變數名)
9. **API Key 管理**: `localStorage.getItem('gemini_api_key')` 在 5+ 處直接調用
10. **資料轉換**: 日期字串、數值清理等邏輯散落各處，無統一處理層
11. **錯誤處理**: 多處使用 `try-catch` + `alert()`，無統一錯誤處理機制
12. **測試性**: 業務邏輯與 UI 耦合，難以單元測試

---

## 2. 最大的 5 個維護痛點

### 🔴 痛點 #1: Firebase 呼叫散落各處，無服務層抽象
**問題描述**:
- 9 個 View 組件直接調用 Firebase API (`collection`, `doc`, `getDocs`, `addDoc` 等)
- 重複的查詢邏輯 (例如「獲取今日課表」) 在多處重複實作
- 資料結構變更時需修改多處程式碼
- 無法統一處理錯誤、載入狀態、快取

**影響範圍**:
- `CalendarView.jsx` (50+ 處 Firebase 調用)
- `DashboardView.jsx` (10+ 處)
- `NutritionView.jsx` (8+ 處)
- `GearView.jsx` (6+ 處)
- 其餘 5 個 View 組件

**重構成本**: ⭐⭐⭐⭐ (高)

---

### 🔴 痛點 #2: 業務邏輯與 UI 高度耦合
**問題描述**:
- `CalendarView.jsx` 超過 700 行，包含：
  - 檔案上傳/解析邏輯 (`handleFitAnalysis`, `handleCSVUpload`)
  - AI 生成邏輯 (`handleHeadCoachGenerate`, `handleWeeklyGenerate`)
  - 表單驗證與資料轉換
  - 拖曳排序邏輯
- `StrengthAnalysisView.jsx`、`RunAnalysisView.jsx` 各自實作 MediaPipe 邏輯
- 無法獨立測試業務邏輯

**影響範圍**:
- `CalendarView.jsx`: 700+ 行
- `StrengthAnalysisView.jsx`: 395 行
- `RunAnalysisView.jsx`: 614 行
- `DashboardView.jsx`: 459 行

**重構成本**: ⭐⭐⭐⭐⭐ (極高)

---

### 🔴 痛點 #3: 工具函數重複定義，無統一工具庫
**問題描述**:
- `formatDate`: 在 `CalendarView.jsx`、`importHelpers.js` 重複定義
- `cleanNumber`: 在 `CalendarView.jsx`、`importHelpers.js` 重複定義
- `parsePaceToDecimal`: 只在 `TrendAnalysisView.jsx` 定義，其他地方需要時重複實作
- `calculateVolume`、`getWeekDates` 等邏輯散落各處

**影響範圍**:
- `CalendarView.jsx` (第 16-43 行)
- `importHelpers.js` (第 9-21 行)
- `TrendAnalysisView.jsx` (第 8-15 行)
- 其餘 View 組件內部定義的輔助函數

**重構成本**: ⭐⭐ (中低)

---

### 🔴 痛點 #4: 狀態管理混亂，資料流不清晰
**問題描述**:
- 無全域狀態管理，各組件自行管理狀態
- 跨組件資料同步困難 (例如「行事曆更新 → Dashboard 需重新載入」)
- `userData` 透過 props 逐層傳遞，深層組件難以取得
- `updateAIContext()` 在 10+ 處直接調用，無法追蹤資料流

**影響範圍**:
- `App.jsx`: 透過 props 傳遞 `userData`
- `DashboardView.jsx`: 需自行 `fetchWorkoutStats()` 而非響應式更新
- `CalendarView.jsx`: 手動呼叫 `updateAIContext()`、`fetchMonthWorkouts()`
- AI Context 更新與使用不透明

**重構成本**: ⭐⭐⭐ (中高)

---

### 🔴 痛點 #5: API Key 管理與配置散落
**問題描述**:
- `localStorage.getItem('gemini_api_key')` 在 5+ 處直接調用
- API Key 驗證、錯誤處理邏輯重複
- 無法統一管理多個外部服務的 API Key
- 設定變更時需修改多處

**影響範圍**:
- `CoachChat.jsx`: 在 `handleSend` 中直接讀取
- `CalendarView.jsx`: `handleHeadCoachGenerate`、`handleWeeklyGenerate`
- `NutritionView.jsx`: `handleImageUpload`、`getSuggestion`
- `StrengthAnalysisView.jsx`: `performAIAnalysis`
- `RunAnalysisView.jsx`: `performAIAnalysis`

**重構成本**: ⭐⭐ (中低)

---

## 3. 建議目標架構

```
my-ai-coach/
├── src/
│   ├── api/                    # API 服務層 (Firebase 封裝)
│   │   ├── firebase.ts         # Firebase 初始化 (保留)
│   │   ├── auth.ts             # 認證服務 (signIn, signOut, getCurrentUser)
│   │   ├── workouts.ts         # 訓練資料 CRUD (calendar, workouts)
│   │   ├── nutrition.ts        # 營養紀錄 CRUD (food_logs)
│   │   ├── gears.ts            # 裝備管理 CRUD (gears)
│   │   ├── body.ts             # 身體數據 CRUD (body_logs)
│   │   └── ai-context.ts       # AI Context 更新與讀取
│   │
│   ├── services/               # 業務邏輯服務層
│   │   ├── ai/                 
│   │   │   ├── coachService.ts        # AI 教練對話服務
│   │   │   ├── workoutGenerator.ts    # 訓練課表生成
│   │   │   └── analysisService.ts     # 動作分析服務
│   │   ├── analysis/           
│   │   │   ├── poseAnalysis.ts        # MediaPipe 姿態分析封裝
│   │   │   └── metricsCalculator.ts   # 評分計算邏輯
│   │   ├── import/             
│   │   │   ├── fitParser.ts           # FIT 檔案解析服務
│   │   │   └── csvParser.ts           # CSV 匯入服務
│   │   └── config/             
│   │       └── apiKeyManager.ts       # API Key 統一管理
│   │
│   ├── hooks/                  # 自訂 Hooks (業務邏輯抽離)
│   │   ├── useAuth.ts          # 認證狀態 Hook
│   │   ├── useWorkouts.ts      # 訓練資料 Hook (取代 useUserData 部分功能)
│   │   ├── usePoseDetection.ts # (保留) MediaPipe Hook
│   │   ├── useAIContext.ts     # AI Context 同步 Hook
│   │   └── useApiKey.ts        # API Key 管理 Hook
│   │
│   ├── utils/                  # 純函數工具庫 (無業務邏輯)
│   │   ├── date.ts             # formatDate, parseDate, getWeekDates
│   │   ├── number.ts           # cleanNumber, parsePaceToDecimal
│   │   ├── validation.ts       # 表單驗證、資料驗證
│   │   ├── constants.ts        # 常數定義 (肌肉群映射等)
│   │   └── helpers.ts          # 通用輔助函數
│   │
│   ├── components/             # UI 元件 (僅展示邏輯)
│   │   ├── AICoach/            
│   │   │   └── CoachChat.jsx   # (精簡) 僅 UI，業務邏輯移至 services
│   │   ├── Calendar/           
│   │   │   ├── WorkoutForm.jsx # (保留)
│   │   │   ├── WeeklyModal.jsx # 週課表彈窗 (從 CalendarView 抽離)
│   │   │   └── WorkoutCard.jsx # 訓練卡片 (可重用)
│   │   ├── BodyHeatmap.jsx     # (保留，已相對獨立)
│   │   └── WeatherWidget.jsx   # (保留)
│   │
│   ├── views/                  # 頁面視圖 (僅組合元件與 Hook)
│   │   ├── DashboardView.jsx   # 大幅精簡 (移除 Firebase 直接調用)
│   │   ├── CalendarView.jsx    # 精簡至 200-300 行 (業務邏輯移至 services)
│   │   ├── NutritionView.jsx   
│   │   ├── GearView.jsx        
│   │   ├── StrengthAnalysisView.jsx  # 移除 MediaPipe 邏輯至 services
│   │   ├── RunAnalysisView.jsx 
│   │   └── TrendAnalysisView.jsx     
│   │
│   ├── layouts/                
│   │   └── MainLayout.jsx      # (保留)
│   │
│   ├── types/                  # TypeScript 型別定義 (若未來導入 TS)
│   │   ├── workout.ts          
│   │   ├── nutrition.ts        
│   │   └── gear.ts             
│   │
│   ├── App.jsx                 # (精簡) 僅路由與 Layout
│   ├── main.jsx                # (保留)
│   └── index.css               # (保留)
│
└── (其他配置檔案)
```

**核心原則**:
- **分層清晰**: API → Services → Hooks → Views
- **單一職責**: 每個模組只做一件事
- **依賴單向**: Views 依賴 Hooks → Hooks 依賴 Services → Services 依賴 API
- **可測試性**: 業務邏輯與 UI 分離，易於單元測試

---

## 4. 重構路線圖 (分 3 階段)

### 階段一：基礎設施建立 (低風險，不影響現有功能)

**目標**: 建立服務層骨架，抽離工具函數，建立統一配置管理

**順序**:

1. **建立統一工具庫** (`src/utils/`)
   - `src/utils/date.ts`: 抽離 `formatDate`、`getWeekDates`
   - `src/utils/number.ts`: 抽離 `cleanNumber`、`parsePaceToDecimal`
   - `src/utils/constants.ts`: 移動 `exerciseDB.js` 的映射表
   - 驗證: 執行 `grep` 找出所有重複定義，逐一替換

2. **建立配置管理** (`src/services/config/`)
   - `apiKeyManager.ts`: 封裝 `localStorage` API Key 讀寫
   - `src/hooks/useApiKey.ts`: Hook 封裝
   - 驗證: 先建立檔案，暫時不替換現有調用 (並行運作)

3. **建立 API 服務層骨架** (`src/api/`)
   - `src/api/firebase.ts`: 重新匯出現有 `firebase.js`
   - `src/api/auth.ts`: 封裝 `signInWithPopup`、`signOut`
   - `src/api/workouts.ts`: 建立 CRUD 函數骨架 (先不實作)
   - 驗證: 確保 Firebase 初始化不受影響

**預估時間**: 2-3 天  
**風險**: ⭐ (低) - 僅新增檔案，不修改現有程式碼

---

### 階段二：抽離業務邏輯 (中風險，逐步遷移)

**目標**: 將業務邏輯從 View 組件移至 Services，建立自訂 Hooks

**順序**:

4. **抽離檔案解析服務** (`src/services/import/`)
   - 從 `importHelpers.js` 遷移至 `fitParser.ts`、`csvParser.ts`
   - 更新 `CalendarView.jsx` 使用新服務
   - 驗證: 測試 FIT/CSV 匯入功能正常

5. **抽離 AI 服務** (`src/services/ai/`)
   - `workoutGenerator.ts`: 從 `CalendarView.jsx` 抽出 `handleHeadCoachGenerate`、`handleWeeklyGenerate`
   - `analysisService.ts`: 從 `StrengthAnalysisView.jsx`、`RunAnalysisView.jsx` 抽出 AI 分析邏輯
   - `coachService.ts`: 從 `CoachChat.jsx` 抽出對話邏輯
   - 驗證: 測試 AI 生成、分析功能正常

6. **建立 Workouts API 服務** (`src/api/workouts.ts`)
   - 實作 `getWorkoutsByDateRange`、`createWorkout`、`updateWorkout`、`deleteWorkout`
   - 建立 `useWorkouts` Hook
   - 逐步替換 `CalendarView.jsx`、`DashboardView.jsx` 的 Firebase 調用
   - 驗證: 對照現有功能，確保 CRUD 行為一致

7. **建立其他 API 服務** (`src/api/`)
   - `nutrition.ts`: 營養紀錄 CRUD
   - `gears.ts`: 裝備管理 CRUD
   - `body.ts`: 身體數據 CRUD
   - 驗證: 逐一頁面測試，確保功能正常

**預估時間**: 5-7 天  
**風險**: ⭐⭐⭐ (中) - 需確保功能完整性，建議逐頁遷移並測試

---

### 階段三：重構大型組件 (高風險，需謹慎)

**目標**: 大幅精簡 View 組件，移除業務邏輯，僅保留 UI 組合

**順序**:

8. **精簡 CalendarView.jsx**
   - 移除內部的 `formatDate`、`cleanNumber`、`getWeekDates` (改用 utils)
   - 移除 Firebase 直接調用 (改用 `useWorkouts` Hook)
   - 移除 AI 生成邏輯 (改用 `workoutGenerator` service)
   - 移除檔案解析邏輯 (改用 import services)
   - 將 `WeeklyModal` 抽離為獨立元件
   - 目標: 從 700+ 行降至 200-300 行
   - 驗證: 完整測試行事曆所有功能 (CRUD、拖曳、AI 生成、匯入)

9. **精簡 StrengthAnalysisView.jsx 與 RunAnalysisView.jsx**
   - 抽離 MediaPipe 邏輯至 `src/services/analysis/poseAnalysis.ts`
   - 抽離評分計算至 `src/services/analysis/metricsCalculator.ts`
   - 使用 `usePoseDetection` Hook (已存在)
   - 目標: 從 395/614 行降至 150-200 行
   - 驗證: 測試姿態分析、AI 分析、儲存功能

10. **精簡 DashboardView.jsx**
    - 移除 Firebase 直接調用 (改用 `useWorkouts` Hook)
    - 移除統計計算邏輯 (抽離至 `utils/statistics.ts` 或服務層)
    - 目標: 從 459 行降至 200-250 行
    - 驗證: 測試統計數據顯示、肌肉熱圖、今日課表

11. **統一 API Key 管理**
    - 替換所有 `localStorage.getItem('gemini_api_key')` 為 `useApiKey` Hook
    - 移除重複的驗證邏輯
    - 驗證: 測試所有使用 AI 功能的地方

**預估時間**: 5-7 天  
**風險**: ⭐⭐⭐⭐ (高) - 大型組件修改，容易遺漏細節

---

## 5. 風險清單與驗證方式

### 🔴 高風險項目

#### 1. CalendarView.jsx 重構 (階段三 #8)
**風險原因**: 700+ 行，包含最複雜的業務邏輯  
**可能問題**:
- 拖曳排序功能失效
- AI 生成課表格式錯誤
- FIT/CSV 匯入失敗
- 日期計算錯誤 (時區問題)

**驗證清單**:
- [ ] 新增/編輯/刪除訓練紀錄
- [ ] 拖曳移動訓練到不同日期
- [ ] Ctrl+拖曳複製訓練
- [ ] AI 生成單日課表 (重訓/跑步)
- [ ] AI 生成本週課表 (多選模式)
- [ ] 匯入 FIT 檔案
- [ ] 匯入 CSV 檔案
- [ ] 匯出 CSV 備份
- [ ] 同步 AI Context
- [ ] 切換月份顯示

**防護措施**:
- 使用 Git 分支，保留原版對照
- 逐小塊重構，每次修改後立即測試
- 建立測試清單，逐項勾選

---

#### 2. Firebase API 服務層封裝 (階段二 #6)
**風險原因**: 資料庫操作，錯誤會導致資料遺失或損壞  
**可能問題**:
- 查詢條件錯誤，資料不完整
- 更新邏輯錯誤，覆蓋錯誤欄位
- 權限設定錯誤，無法讀寫

**驗證清單**:
- [ ] 讀取訓練資料 (單日/月範圍)
- [ ] 新增訓練 (重訓/跑步)
- [ ] 更新訓練狀態 (`planned` → `completed`)
- [ ] 刪除訓練
- [ ] 讀取使用者資料 (`users/{uid}`)
- [ ] 子集合操作 (`calendar`, `food_logs`, `gears`)

**防護措施**:
- 保留原 Firebase 調用作為備份註解
- 先建立服務函數，確認行為一致後再替換
- 使用 Firebase Console 檢查資料完整性

---

#### 3. AI 服務抽離 (階段二 #5)
**風險原因**: Gemini API 調用，錯誤會影響核心功能  
**可能問題**:
- Prompt 格式錯誤，AI 回應異常
- JSON 解析失敗
- API Key 管理錯誤，無法調用

**驗證清單**:
- [ ] AI 教練對話 (簡單問題/複雜問題)
- [ ] 生成單日課表 (重訓/跑步)
- [ ] 生成本週課表 (多選模式)
- [ ] 食物圖片辨識
- [ ] 營養建議生成
- [ ] 動作分析建議 (重訓/跑步)

**防護措施**:
- 保留原始 Prompt 作為註解
- 使用相同的 API Key 測試
- 對照原始回應格式

---

### 🟡 中風險項目

#### 4. 工具函數統一 (階段一 #1)
**風險原因**: 多處使用，替換錯誤會導致計算錯誤  
**可能問題**:
- 日期格式不一致 (時區問題)
- 數值解析錯誤 (空值處理)
- 函數簽名改變，呼叫處未更新

**驗證清單**:
- [ ] `formatDate`: 測試各種日期格式
- [ ] `cleanNumber`: 測試字串/數字/空值
- [ ] `parsePaceToDecimal`: 測試 "5'30\"" 格式

**防護措施**:
- 使用 `grep` 找出所有使用處
- 建立測試腳本驗證函數行為
- 逐一替換並測試

---

#### 5. Hooks 建立與使用 (階段二)
**風險原因**: 狀態管理變更，可能導致 UI 不更新  
**可能問題**:
- `useEffect` 依賴錯誤，無限迴圈
- 狀態更新時機錯誤，UI 顯示舊資料
- 取消訂閱邏輯錯誤，記憶體洩漏

**驗證清單**:
- [ ] `useWorkouts`: 資料更新時 UI 自動刷新
- [ ] `useApiKey`: API Key 變更時所有使用處同步更新
- [ ] 組件卸載時正確取消訂閱

**防護措施**:
- 使用 React DevTools 檢查狀態更新
- 檢查 Console 是否有警告訊息
- 測試快速切換頁面 (檢查記憶體)

---

### 🟢 低風險項目

#### 6. 元件抽離 (階段三)
**風險原因**: UI 調整，功能不受影響  
**驗證清單**:
- [ ] 視覺效果與原版一致
- [ ] 事件處理正常 (點擊、輸入)

---

## 總結建議

**優先順序**:
1. **階段一** (必做): 建立基礎設施，為後續重構鋪路
2. **階段二** (重要): 逐步抽離業務邏輯，降低風險
3. **階段三** (謹慎): 大型組件重構，需充分測試

**建議策略**:
- **並行開發**: 新服務與舊程式碼並存，逐步遷移
- **小步快跑**: 每次改動後立即測試，避免累積大量改動
- **保留備份**: 重要檔案保留原始版本作為參考
- **文件化**: 記錄每個服務的職責與使用方式

**時間預估**:
- 階段一: 2-3 天
- 階段二: 5-7 天
- 階段三: 5-7 天
- **總計**: 約 2-3 週 (包含測試時間)
