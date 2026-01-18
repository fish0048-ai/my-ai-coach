# 重構 TODO 清單

## 🎯 Quick Wins (優先執行 - 不破壞功能)

### ⭐ Quick Win #1: 統一日期工具函數

**目標**: 消除 `formatDate`、`getWeekDates` 的重複定義，統一至 `src/utils/date.ts`

**修改檔案**:
- ✅ 新建: `src/utils/date.ts`
- 🔧 修改: `src/utils/importHelpers.js` (第 9-15 行)
- 🔧 修改: `src/views/CalendarView.jsx` (第 16-36 行)

**預估影響面**:
- 影響檔案數: 2 個主要檔案
- 重複代碼行數: ~30 行可刪除
- 後續收益: 其他 View 可複用，未來日期邏輯集中管理

**完成標準**:
- [ ] `src/utils/date.ts` 包含 `formatDate(date)` 與 `getWeekDates(baseDate)`
- [ ] `CalendarView.jsx` 使用 `import { formatDate, getWeekDates } from '../utils/date'`
- [ ] `importHelpers.js` 移除內部定義，改用 import
- [ ] 測試: 行事曆日期顯示正常、週課表日期計算正確
- [ ] 無 console 錯誤

**自動化程度**: 🤖 **可自動重構**
- 使用 VS Code "Find & Replace in Files" 可批量替換
- `formatDate` 函數體相同，可直接替換
- 建議仍用 `grep` 確認所有使用處

---

### ⭐ Quick Win #2: API Key 管理封裝

**目標**: 將 `localStorage.getItem('gemini_api_key')` 統一封裝，便於未來擴展與測試

**修改檔案**:
- ✅ 新建: `src/services/config/apiKeyManager.ts`
- ✅ 新建: `src/hooks/useApiKey.ts`
- 🔧 修改: `src/components/AICoach/CoachChat.jsx` (第 14, 65, 79 行)
- 🔧 修改: `src/views/CalendarView.jsx` (第 174, 217 行)
- 🔧 修改: `src/views/NutritionView.jsx` (第 79, 160 行)
- 🔧 修改: `src/views/StrengthAnalysisView.jsx` (第 219 行)
- 🔧 修改: `src/views/RunAnalysisView.jsx` (第 386 行)

**預估影響面**:
- 影響檔案數: 5 個檔案
- 重複代碼行數: ~10 處直接調用
- 後續收益: 可統一加入驗證、快取、錯誤處理邏輯

**完成標準**:
- [ ] `apiKeyManager.ts` 提供 `getApiKey()` 與 `setApiKey(key)` 函數
- [ ] `useApiKey` Hook 提供 `{ apiKey, setApiKey, hasApiKey }`
- [ ] 所有 `localStorage.getItem('gemini_api_key')` 替換為 `apiKey` 或 `getApiKey()`
- [ ] 測試: AI 功能正常運作 (對話、生成課表、圖片辨識)
- [ ] 無 console 錯誤

**自動化程度**: 🤖 **可部分自動**
- `localStorage.getItem('gemini_api_key')` 可用 Find & Replace
- 但需 👤 **人工確認** 每個替換處的上下文邏輯
- Hook 使用處需手動調整結構

---

### ⭐ Quick Win #3: 常數定義統一化

**目標**: 將 `exerciseDB.js` 的肌肉群映射移至 `src/utils/constants.ts`，統一命名

**修改檔案**:
- ✅ 新建: `src/utils/constants.ts`
- 🔧 修改: `src/assets/data/exerciseDB.js` → 改為 `src/utils/exerciseDB.ts`
- 🔧 修改: 所有 `import { detectMuscleGroup } from '../assets/data/exerciseDB'` (約 3 處)

**預估影響面**:
- 影響檔案數: ~3 個檔案 (CalendarView, importHelpers, StrengthAnalysis)
- 代碼變動: 僅調整 import 路徑，無邏輯變更
- 後續收益: 常數集中管理，未來擴展容易

**完成標準**:
- [ ] `src/utils/constants.ts` 包含 `EXERCISE_MUSCLE_MAPPING` 常數物件
- [ ] `detectMuscleGroup` 函數移至 `src/utils/exerciseDB.ts` (或改名)
- [ ] 所有 import 路徑更新
- [ ] 測試: 動作名稱仍能正確識別肌群
- [ ] 無 console 錯誤

**自動化程度**: 🤖 **可自動重構**
- 檔案移動與 import 更新可用工具完成
- 函數邏輯不變，風險低

---

## 📋 階段一：基礎設施建立 (低風險)

### TODO #1.1: 建立統一工具庫 - 日期函數

**目標**: 同 Quick Win #1 (已標記)

**修改檔案**: (同 Quick Win #1)

**預估影響面**: (同 Quick Win #1)

**完成標準**: (同 Quick Win #1)

**自動化程度**: 🤖 可自動重構

---

### TODO #1.2: 建立統一工具庫 - 數值處理函數

**目標**: 消除 `cleanNumber`、`parsePaceToDecimal` 重複定義

**修改檔案**:
- ✅ 新建: `src/utils/number.ts`
- 🔧 修改: `src/utils/importHelpers.js` (第 17-21 行)
- 🔧 修改: `src/views/CalendarView.jsx` (第 39-43 行)
- 🔧 修改: `src/views/TrendAnalysisView.jsx` (第 8-15 行)

**預估影響面**:
- 影響檔案數: 3 個檔案
- 重複代碼行數: ~20 行可刪除

**完成標準**:
- [ ] `src/utils/number.ts` 包含 `cleanNumber(val)` 與 `parsePaceToDecimal(paceStr)`
- [ ] 所有使用處改用 import
- [ ] 測試: 數值輸入/顯示正常、配速解析正確

**自動化程度**: 🤖 **可自動重構**
- `cleanNumber` 函數體相同
- `parsePaceToDecimal` 需 👤 **人工確認** 邏輯一致性

---

### TODO #1.3: 建立配置管理服務

**目標**: 同 Quick Win #2 (已標記)

**修改檔案**: (同 Quick Win #2)

**預估影響面**: (同 Quick Win #2)

**完成標準**: (同 Quick Win #2)

**自動化程度**: 🤖 可部分自動 + 👤 人工確認

---

### TODO #1.4: 建立 API 服務層骨架

**目標**: 建立 Firebase API 封裝層骨架，不實作邏輯

**修改檔案**:
- ✅ 新建: `src/api/firebase.ts` (重新 export 現有 `firebase.js`)
- ✅ 新建: `src/api/auth.ts` (骨架)
- ✅ 新建: `src/api/workouts.ts` (骨架)
- ✅ 新建: `src/api/nutrition.ts` (骨架)
- ✅ 新建: `src/api/gears.ts` (骨架)
- ✅ 新建: `src/api/body.ts` (骨架)
- ✅ 新建: `src/api/ai-context.ts` (骨架)
- 🔧 修改: `src/firebase.js` → 移動至 `src/api/firebase.ts` 或保留並在 `api/firebase.ts` 重新 export

**預估影響面**:
- 影響檔案數: 僅新增檔案，不修改現有程式碼
- 風險: ⭐ 極低

**完成標準**:
- [ ] 所有 API 服務檔案建立，包含基本匯出
- [ ] `src/api/firebase.ts` 正確 export `auth`、`db`
- [ ] 現有程式碼仍正常運作 (無 import 錯誤)
- [ ] 測試: 應用程式正常啟動

**自動化程度**: 🤖 **可自動建立骨架**
- 檔案結構可自動生成
- 👤 **人工確認** export 路徑正確

---

## 📋 階段二：抽離業務邏輯 (中風險)

### TODO #2.1: 抽離檔案解析服務 - FIT Parser

**目標**: 將 FIT 檔案解析邏輯從 `importHelpers.js` 移至獨立服務

**修改檔案**:
- ✅ 新建: `src/services/import/fitParser.ts`
- 🔧 修改: `src/utils/importHelpers.js` (移除 `parseAndUploadFIT` 函數)
- 🔧 修改: `src/views/CalendarView.jsx` (第 336, 344 行) - import 路徑更新

**預估影響面**:
- 影響檔案數: 2 個檔案
- 功能風險: ⭐⭐ 中 (檔案解析核心邏輯)

**完成標準**:
- [ ] `fitParser.ts` 包含 `parseFitFile(file)` 函數，回傳標準化資料結構
- [ ] 移除 `importHelpers.js` 中的 `parseAndUploadFIT`
- [ ] `CalendarView.jsx` 使用新服務
- [ ] 測試: FIT 檔案匯入功能正常 (跑步/重訓資料正確解析)
- [ ] 測試: 日期、距離、心率等欄位正確

**自動化程度**: 👤 **需人工確認**
- 邏輯遷移需仔細比對
- 資料結構轉換需驗證

---

### TODO #2.2: 抽離檔案解析服務 - CSV Parser

**目標**: 將 CSV 解析邏輯移至獨立服務

**修改檔案**:
- ✅ 新建: `src/services/import/csvParser.ts`
- 🔧 修改: `src/utils/importHelpers.js` (移除 `parseAndUploadCSV`、`generateCSVData`)
- 🔧 修改: `src/views/CalendarView.jsx` (第 322, 303 行) - import 與呼叫更新

**預估影響面**:
- 影響檔案數: 2 個檔案
- 功能風險: ⭐⭐ 中 (CSV 格式多樣，需相容性測試)

**完成標準**:
- [ ] `csvParser.ts` 包含 `parseCsvFile(file)` 與 `generateCsvData(workouts, gears)`
- [ ] CSV 匯入支援中文/英文標題列
- [ ] CSV 匯出格式正確 (BOM、逗號轉義)
- [ ] 測試: 匯入/匯出功能正常

**自動化程度**: 👤 **需人工確認**
- CSV 解析邏輯複雜，需逐行比對

---

### TODO #2.3: 抽離 AI 服務 - 訓練課表生成

**目標**: 將 AI 生成課表邏輯從 `CalendarView.jsx` 移至服務層

**修改檔案**:
- ✅ 新建: `src/services/ai/workoutGenerator.ts`
- 🔧 修改: `src/views/CalendarView.jsx` (第 171-213 行: `handleHeadCoachGenerate`, 第 215-274 行: `handleWeeklyGenerate`)
- 🔧 修改: `src/utils/aiPrompts.js` (保留，由新服務調用)

**預估影響面**:
- 影響檔案數: 1 個主要檔案
- 功能風險: ⭐⭐⭐ 中高 (AI 核心功能)
- 程式碼減少: ~100 行從 CalendarView 移除

**完成標準**:
- [ ] `workoutGenerator.ts` 包含 `generateDailyWorkout(params)` 與 `generateWeeklyWorkout(params)`
- [ ] Prompt 組裝邏輯封裝
- [ ] JSON 解析與錯誤處理統一
- [ ] `CalendarView.jsx` 僅呼叫服務，不包含 AI 邏輯
- [ ] 測試: AI 生成單日/週課表功能正常
- [ ] 測試: 錯誤處理正確 (API Key 缺失、JSON 解析失敗)

**自動化程度**: 👤 **需人工確認**
- 邏輯複雜，需逐行遷移
- JSON 解析邏輯需仔細比對

---

### TODO #2.4: 抽離 AI 服務 - 分析建議

**目標**: 將 AI 分析邏輯從分析頁面抽離

**修改檔案**:
- ✅ 新建: `src/services/ai/analysisService.ts`
- 🔧 修改: `src/views/StrengthAnalysisView.jsx` (第 218-239 行)
- 🔧 修改: `src/views/RunAnalysisView.jsx` (第 385-406 行)
- 🔧 修改: `src/views/NutritionView.jsx` (第 159-185 行: `getSuggestion`)

**預估影響面**:
- 影響檔案數: 3 個檔案
- 功能風險: ⭐⭐ 中

**完成標準**:
- [ ] `analysisService.ts` 包含 `analyzeStrength(metrics, mode)`、`analyzeRunning(metrics)`、`getNutritionSuggestion(summary)`
- [ ] Prompt 組裝邏輯封裝
- [ ] 所有 AI 分析功能正常運作

**自動化程度**: 👤 **需人工確認**
- Prompt 需仔細比對，確保格式一致

---

### TODO #2.5: 抽離 AI 服務 - 教練對話

**目標**: 將 CoachChat 的對話邏輯抽離

**修改檔案**:
- ✅ 新建: `src/services/ai/coachService.ts`
- 🔧 修改: `src/components/AICoach/CoachChat.jsx` (第 62-98 行: `handleSend`)

**預估影響面**:
- 影響檔案數: 1 個檔案
- 功能風險: ⭐ 低 (僅封裝，不改變邏輯)

**完成標準**:
- [ ] `coachService.ts` 包含 `sendMessage(userMessage, context)`
- [ ] Context 組裝邏輯封裝
- [ ] `CoachChat.jsx` 僅負責 UI，業務邏輯移至服務

**自動化程度**: 🤖 **可部分自動**
- 函數遷移較直接，但需 👤 **人工確認** Context 組裝邏輯

---

### TODO #2.6: 建立 Workouts API 服務

**目標**: 封裝 Firebase 的 calendar 集合操作

**修改檔案**:
- ✅ 新建/完成: `src/api/workouts.ts` (實作 CRUD 函數)
- ✅ 新建: `src/hooks/useWorkouts.ts`
- 🔧 修改: `src/views/CalendarView.jsx` - 逐步替換 Firebase 直接調用 (約 20+ 處)
- 🔧 修改: `src/views/DashboardView.jsx` - 替換 `fetchWorkoutStats` (約 5 處)

**預估影響面**:
- 影響檔案數: 2 個主要檔案
- 功能風險: ⭐⭐⭐ 中高 (資料庫操作核心)
- 程式碼減少: CalendarView 減少 ~50 行 Firebase 調用

**完成標準**:
- [ ] `workouts.ts` 包含:
  - `getWorkoutsByDateRange(userId, startDate, endDate)`
  - `getWorkoutById(userId, workoutId)`
  - `createWorkout(userId, workoutData)`
  - `updateWorkout(userId, workoutId, updates)`
  - `deleteWorkout(userId, workoutId)`
- [ ] `useWorkouts` Hook 提供 `{ workouts, loading, createWorkout, updateWorkout, deleteWorkout }`
- [ ] 逐步替換 `CalendarView.jsx` 的 Firebase 調用 (先替換查詢，再替換寫入)
- [ ] 測試: 所有 CRUD 操作正常
- [ ] 測試: 資料一致性 (新增/編輯/刪除後列表更新)

**自動化程度**: 👤 **需人工確認**
- 查詢條件需仔細比對
- 資料結構轉換需驗證

---

### TODO #2.7: 建立 Nutrition API 服務

**目標**: 封裝 Firebase 的 food_logs 集合操作

**修改檔案**:
- ✅ 新建: `src/api/nutrition.ts`
- 🔧 修改: `src/views/NutritionView.jsx` (約 8 處 Firebase 調用)

**預估影響面**:
- 影響檔案數: 1 個檔案
- 功能風險: ⭐⭐ 中

**完成標準**:
- [ ] `nutrition.ts` 包含 `getFoodLogsByDate`、`createFoodLog`、`deleteFoodLog`
- [ ] `NutritionView.jsx` 使用新服務
- [ ] 測試: 食物紀錄 CRUD 正常

**自動化程度**: 👤 **需人工確認**

---

### TODO #2.8: 建立 Gears API 服務

**目標**: 封裝 Firebase 的 gears 集合操作

**修改檔案**:
- ✅ 新建: `src/api/gears.ts`
- 🔧 修改: `src/views/GearView.jsx` (約 6 處 Firebase 調用)

**預估影響面**:
- 影響檔案數: 1 個檔案
- 功能風險: ⭐⭐ 中

**完成標準**:
- [ ] `gears.ts` 包含裝備 CRUD 函數
- [ ] `GearView.jsx` 使用新服務
- [ ] 測試: 裝備管理功能正常

**自動化程度**: 👤 **需人工確認**

---

### TODO #2.9: 建立 Body API 服務

**目標**: 封裝 Firebase 的 body_logs 集合操作

**修改檔案**:
- ✅ 新建: `src/api/body.ts`
- 🔧 修改: `src/views/TrendAnalysisView.jsx` (約 3 處 Firebase 調用)

**預估影響面**:
- 影響檔案數: 1 個檔案
- 功能風險: ⭐ 低

**完成標準**:
- [ ] `body.ts` 包含身體數據 CRUD
- [ ] `TrendAnalysisView.jsx` 使用新服務
- [ ] 測試: 身體數據新增/刪除正常

**自動化程度**: 👤 **需人工確認**

---

## 📋 階段三：重構大型組件 (高風險)

### TODO #3.1: 精簡 CalendarView.jsx - 移除工具函數

**目標**: 移除 CalendarView 內部的重複工具函數定義

**修改檔案**:
- 🔧 修改: `src/views/CalendarView.jsx` (移除第 16-43 行)

**預估影響面**:
- 功能風險: ⭐ 低 (已由 TODO #1.1, #1.2 完成工具函數抽離)
- 程式碼減少: ~30 行

**完成標準**:
- [ ] CalendarView 無內部定義的 `formatDate`、`cleanNumber`、`getWeekDates`
- [ ] 所有呼叫處使用 `import` 的函數
- [ ] 測試: 功能正常

**自動化程度**: 🤖 **可自動刪除** (前提: TODO #1.1, #1.2 已完成)

---

### TODO #3.2: 精簡 CalendarView.jsx - 移除 Firebase 直接調用

**目標**: 替換所有 Firebase 直接調用為 API 服務

**修改檔案**:
- 🔧 修改: `src/views/CalendarView.jsx` (約 20+ 處 Firebase 調用)
- 🔧 修改: `src/views/CalendarView.jsx` - 改用 `useWorkouts` Hook

**預估影響面**:
- 功能風險: ⭐⭐⭐ 中高
- 程式碼減少: ~50 行 Firebase 調用代碼

**完成標準**:
- [ ] CalendarView 無直接 `collection`、`doc`、`getDocs` 調用
- [ ] 使用 `useWorkouts` Hook 管理狀態
- [ ] 測試: 所有功能正常 (CRUD、拖曳、匯入)

**自動化程度**: 👤 **需人工確認**
- 依賴 TODO #2.6 完成

---

### TODO #3.3: 精簡 CalendarView.jsx - 移除 AI 生成邏輯

**目標**: 使用 AI 服務取代內部邏輯

**修改檔案**:
- 🔧 修改: `src/views/CalendarView.jsx` (移除第 171-274 行 AI 相關邏輯)
- 🔧 修改: `src/views/CalendarView.jsx` - 改用 `workoutGenerator` 服務

**預估影響面**:
- 功能風險: ⭐⭐⭐ 中高
- 程式碼減少: ~100 行

**完成標準**:
- [ ] CalendarView 無 AI Prompt 組裝邏輯
- [ ] 使用 `workoutGenerator` 服務
- [ ] 測試: AI 生成功能正常

**自動化程度**: 👤 **需人工確認**
- 依賴 TODO #2.3 完成

---

### TODO #3.4: 精簡 CalendarView.jsx - 抽離週課表彈窗

**目標**: 將 `WeeklyModal` 抽離為獨立元件

**修改檔案**:
- ✅ 新建: `src/components/Calendar/WeeklyModal.jsx`
- 🔧 修改: `src/views/CalendarView.jsx` (移除第 553-622 行的 modal JSX)

**預估影響面**:
- 功能風險: ⭐⭐ 中
- 程式碼減少: ~70 行
- 可重用性: 提高

**完成標準**:
- [ ] `WeeklyModal.jsx` 獨立元件，接收 props
- [ ] CalendarView 僅負責開啟/關閉狀態
- [ ] 測試: 週課表功能正常

**自動化程度**: 👤 **需人工確認**
- JSX 結構需仔細遷移

---

### TODO #3.5: 抽離 MediaPipe 邏輯至服務層

**目標**: 將姿態分析邏輯從 View 組件移至服務

**修改檔案**:
- ✅ 新建: `src/services/analysis/poseAnalysis.ts`
- ✅ 新建: `src/services/analysis/metricsCalculator.ts`
- 🔧 修改: `src/views/StrengthAnalysisView.jsx` (移除角度計算、評分邏輯)
- 🔧 修改: `src/views/RunAnalysisView.jsx` (移除掃描、處理邏輯)

**預估影響面**:
- 影響檔案數: 2 個檔案
- 功能風險: ⭐⭐⭐ 中高 (核心分析邏輯)
- 程式碼減少: 每個 View 減少 ~100-150 行

**完成標準**:
- [ ] `poseAnalysis.ts` 封裝角度計算、掃描邏輯
- [ ] `metricsCalculator.ts` 封裝評分計算
- [ ] View 組件僅負責 UI 與服務呼叫
- [ ] 測試: 姿態分析功能正常

**自動化程度**: 👤 **需人工確認**
- 邏輯複雜，需仔細遷移

---

### TODO #3.6: 精簡 StrengthAnalysisView.jsx

**目標**: 移除業務邏輯，僅保留 UI 組合

**修改檔案**:
- 🔧 修改: `src/views/StrengthAnalysisView.jsx` (使用新服務)

**預估影響面**:
- 程式碼減少: 從 395 行降至 ~150-200 行
- 功能風險: ⭐⭐⭐ 中高

**完成標準**:
- [ ] View 僅負責 UI 渲染與事件處理
- [ ] 所有業務邏輯使用服務層
- [ ] 測試: 所有功能正常

**自動化程度**: 👤 **需人工確認**
- 依賴 TODO #3.5 完成

---

### TODO #3.7: 精簡 RunAnalysisView.jsx

**目標**: 同 TODO #3.6

**修改檔案**:
- 🔧 修改: `src/views/RunAnalysisView.jsx` (使用新服務)

**預估影響面**:
- 程式碼減少: 從 614 行降至 ~200-250 行
- 功能風險: ⭐⭐⭐ 中高

**完成標準**: (同 TODO #3.6)

**自動化程度**: 👤 **需人工確認**

---

### TODO #3.8: 精簡 DashboardView.jsx

**目標**: 使用 `useWorkouts` Hook，移除 Firebase 直接調用

**修改檔案**:
- 🔧 修改: `src/views/DashboardView.jsx` (移除 `fetchWorkoutStats`，改用 Hook)
- 🔧 修改: `src/views/DashboardView.jsx` - 統計計算邏輯可抽離至 `utils/statistics.ts`

**預估影響面**:
- 程式碼減少: 從 459 行降至 ~200-250 行
- 功能風險: ⭐⭐ 中

**完成標準**:
- [ ] DashboardView 使用 `useWorkouts` Hook
- [ ] 統計計算邏輯抽離或簡化
- [ ] 測試: 統計數據顯示正確

**自動化程度**: 👤 **需人工確認**
- 依賴 TODO #2.6 完成

---

### TODO #3.9: 統一 API Key 管理 (最終清理)

**目標**: 替換所有殘留的 `localStorage` 直接調用

**修改檔案**:
- 🔧 修改: 所有仍直接使用 `localStorage` 的檔案
- 🔧 確認: 所有檔案已使用 `useApiKey` Hook 或 `apiKeyManager`

**預估影響面**:
- 功能風險: ⭐ 低 (TODO #1.3 已完成大部分)

**完成標準**:
- [ ] 全域搜尋 `localStorage.getItem('gemini_api_key')` 結果為 0
- [ ] 所有 AI 功能正常

**自動化程度**: 🤖 **可自動搜尋確認**

---

## 📊 執行建議

### 建議執行順序

1. **第一週**: Quick Wins (#1, #2, #3) + 階段一基礎設施
   - 目標: 建立基礎設施，不影響現有功能
   - 預估時間: 2-3 天

2. **第二週**: 階段二前半 (檔案解析、AI 服務)
   - 目標: 抽離核心業務邏輯
   - 預估時間: 3-4 天

3. **第三週**: 階段二後半 (API 服務) + 階段三開始
   - 目標: 完成 API 封裝，開始精簡大型組件
   - 預估時間: 4-5 天

4. **第四週**: 階段三完成
   - 目標: 精簡所有大型組件
   - 預估時間: 3-4 天

### 自動化工具建議

**VS Code 擴充功能**:
- `Find & Replace in Files` (Ctrl+Shift+H): 批量替換
- `TypeScript Hero` / `Auto Import`: 自動管理 import

**命令列工具**:
- `grep -r "formatDate" src/`: 找出所有使用處
- `rg "localStorage.getItem"`: 使用 ripgrep 快速搜尋

**Git 策略**:
- 每個 TODO 建立獨立 commit
- 使用 `git revert` 快速回滾有問題的改動
