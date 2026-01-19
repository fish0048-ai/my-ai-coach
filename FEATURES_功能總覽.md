## My AI Coach 功能總覽（繁體中文）

本文件介紹 `my-ai-coach` 專案目前已實作的所有主要功能與對應程式碼位置，方便之後維護、擴充與介紹給使用者或協作者。

---

## 一、帳號與整體架構

- **Firebase 登入與用戶狀態**
  - 程式碼位置：
    - `src/firebase.js`：Firebase 初始化
    - `src/services/authService.js`：`signInWithGoogle()`, `signOut()`
    - `src/store/userStore.js`：`useUserStore`（監聽 `onAuthStateChanged`，載入 `userData`）
  - 功能說明：
    - 使用 Google 帳號登入 / 登出
    - 於全域 store 保持 `user` 與 `userData`（個人檔案）

- **視圖與佈局**
  - 程式碼位置：
    - `src/App.jsx`：應用主入口，根據 `currentView` 切換頁面
    - `src/store/viewStore.js`：`useViewStore` 管理 `currentView`、`isChatOpen`
    - `src/layouts/MainLayout.jsx`：側邊欄 + Header + 主內容區
  - 功能說明：
    - 左側 Sidebar 切換：Dashboard、Calendar、Nutrition、Trends、Gear、AI Tools、Profile、訓練計劃推薦
    - Header 顯示使用者資訊與 AI 聊天入口

- **錯誤與載入處理**
  - 程式碼位置：
    - `src/components/common/ErrorToast.jsx`：統一錯誤提示
    - `src/components/common/Skeleton.jsx`：骨架畫面
    - `src/services/errorService.js`：`handleError()` 統一錯誤紀錄與顯示
    - `src/App.jsx`：`ErrorBoundary` + `React.Suspense` lazy loading
  - 功能說明：
    - 畫面級錯誤會由 ErrorBoundary 捕捉並顯示錯誤資訊
    - 各功能頁面使用 Loader / Skeleton 提供載入狀態

- **PWA 支援**
  - 程式碼位置：
    - `public/manifest.json`
    - `public/sw.js`
    - `index.html`（掛載 manifest 與 theme-color）
    - `src/main.jsx`（註冊 Service Worker）
  - 功能說明：
    - 支援安裝到主畫面與基本離線快取（首頁與核心檔案）

---

## 二、儀表板（Dashboard）

- **主儀表板頁面**
  - 程式碼位置：`src/views/DashboardView.jsx`
  - 相關元件：
    - `src/components/Dashboard/StatCard.jsx`
    - `src/components/Dashboard/PRTracker.jsx`
    - `src/components/Dashboard/AchievementPanel.jsx`
    - `src/components/BodyHeatmap.jsx`
    - `src/components/WeatherWidget.jsx`
  - 功能說明：
    - 顯示近 30 天訓練統計：總次數、估算消耗熱量、訓練時數、目標達成狀態。
    - 今日課表區塊：顯示當日行事曆中的訓練計畫，並引導前往 Calendar 打卡。
    - 肌群熱圖：根據行事曆紀錄，使用 `BodyHeatmap` 顯示近期訓練肌群負荷。
    - 跑步週統計：週跑量、次數、最長距離、Zone 2 比例。
    - 綜合訓練建議：根據肌群負荷與跑步數據提供簡單建議。
    - PR 區塊與成就面板整合（見下節）。

- **個人紀錄（PR Tracker）**
  - 程式碼位置：
    - `src/components/Dashboard/PRTracker.jsx`
    - `src/services/calendarService.js`：`extractPRs()`, `getAllPRs()`
  - 功能說明：
    - 自動從行事曆訓練紀錄中分析：
      - 力量訓練 PR：最大重量、最大總組數 / 次數等。
      - 跑步 PR：最長距離、最快配速等。
    - 儀表板中顯示最新 PR 清單，鼓勵持續進步。

- **訓練成就系統**
  - 程式碼位置：
    - `src/services/achievementService.js`
    - `src/components/Dashboard/AchievementBadge.jsx`
    - `src/components/Dashboard/AchievementPanel.jsx`
    - `src/views/CalendarView.jsx`：在訓練完成時觸發檢查
  - 功能說明：
    - 定義 13 種成就（連續訓練天數、總訓練次數、跑步總里程、特定里程碑等）。
    - 訓練完成或狀態改為 completed 時自動檢查並解鎖成就。
    - 儀表板中顯示已解鎖成就徽章與說明。

- **訓練統計 Dashboard（時間維度）**
  - 程式碼位置：`src/views/TrainingDashboardView.jsx`
  - 支援週 / 月 / 年度統計圖表（藉由 `statsCalculations` 聚合）。

---

## 三、運動行事曆（Calendar）

- **行事曆主頁**
  - 程式碼位置：`src/views/CalendarView.jsx`
  - 相關服務：
    - `src/services/calendarService.js`：CRUD + 快取 + PR 抽取
    - `src/utils/date.js`：`formatDate`, `getWeekDates`
  - 功能說明：
    - 月曆檢視：顯示每一天的訓練課表卡片。
    - 拖曳訓練：支援拖曳移動日期，按住 Ctrl / Cmd 拖曳可複製。
    - 顯示當日訓練細節，支援編輯 / 刪除 / 完成標記。
    - 快捷操作：上方工具列支援同步、匯入檔案、備份匯出等。

- **本週總教練排程**
  - 程式碼位置：
    - `src/views/CalendarView.jsx`：`WeeklyModal` 入口與參數
    - `src/components/Calendar/WeeklyModal.jsx`
    - `src/services/ai/workoutGenerator.js`：`generateWeeklyWorkout()`
  - 功能說明：
    - 使用者選擇一週中各天希望的訓練型態（重訓 / LSD / 間歇 / 輕鬆跑 / MP / 休息）。
    - 呼叫 AI 生成本週課表（已優化為結構化 JSON）。
    - 新增至 Calendar，並透過快取清除立即更新畫面。

- **單筆訓練編輯 / 新增表單**
  - 程式碼位置：`src/components/Calendar/WorkoutForm.jsx`
  - 功能說明：
    - 建立或編輯單次訓練，包括：
      - 類型：`run` / `strength` / `analysis` 等。
      - 跑步資訊：距離、時間、配速、心率。
      - 力量資訊：多組動作（名稱、組數、次數、重量、肌群）。

- **CSV / FIT 匯入與多平台整合**
  - 程式碼位置：
    - `src/services/importService.js`：`parseAndUploadFIT()`, `parseAndUploadCSV()`
    - `src/services/import/platformSync.js`：`parseStravaCSV()`, `parseGenericRunCSV()`
    - `src/utils/importHelpers.js`
  - 功能說明：
    - 支援匯入 Garmin FIT 檔案並寫入 Calendar。
    - 支援匯入 Strava / 通用 CSV，先由 `platformSync` 統一解析，再寫入 Calendar。
    - 已預留 `syncFromPlatformAPI()` 介面，未來可串接官方 API 自動同步。

- **行事曆備份匯出**
  - 程式碼位置：`src/views/CalendarView.jsx`（`handleExport`）
  - 功能說明：
    - 將雲端 Calendar 資料匯出為 CSV 備份。

---

## 四、AI 訓練計劃推薦

- **訓練計劃推薦頁面**
  - 程式碼位置：`src/views/TrainingPlanView.jsx`
  - AI 服務：`src/services/ai/workoutGenerator.js`
  - 功能說明：
    - 提供多種訓練計畫類型：
      - 力量：5x5、PPL、上下半身、全身等。
      - 跑步：新手計畫、5K、半馬完賽、全馬完賽、半馬 PB、全馬 PB。
    - 對於 PB 類型，支援輸入：
      - 目標 PB 時間（如 `1:45:00`）
      - 目標賽事日期（YYYY-MM-DD）
    - 生成後以結構化課表呈現（每天的類型、距離、時間、心率 / 動作清單）。
    - 可一鍵套用到 Calendar，並有確認對話框。

- **計畫類型與 Prompt 優化**
  - 程式碼位置：
    - `PLAN_TYPES` 與 `generatePlanPrompt()`：`src/services/ai/workoutGenerator.js`
    - AI 呼叫封裝：`src/utils/gemini.js`
  - 功能說明：
    - 將 Prompt 精簡為只要求結構化 JSON，避免冗長文字說明。
    - 後處理裁剪過長的 title / notes，限制 tips 數量與長度。

---

## 五、智慧營養師（Nutrition）

- **營養紀錄與統計**
  - 程式碼位置：
    - `src/views/NutritionView.jsx`
    - `src/services/nutritionService.js`
    - `src/utils/nutritionCalculations.js`
  - 功能說明：
    - 依 `userData` 或輸入資料計算 TDEE 與目標三大營養素。
    - 記錄每日食物（名稱、熱量、蛋白質、碳水、脂肪）。
    - 顯示當日總攝取與目標對比，使用圓形進度與 ProgressBar。

- **圖片辨識食物**
  - 程式碼位置：
    - `src/views/NutritionView.jsx`：`handleImageUpload()`
    - `src/utils/gemini.js`：`runGeminiVision()`
  - 功能說明：
    - 上傳食物照片後，由 Gemini Vision 回傳食物名稱與營養估計，直接填入表單。

- **基礎晚餐 / 點心建議（簡易 AI）**
  - 程式碼位置：`getSuggestion()` in `NutritionView.jsx`
  - 功能說明：
    - 呼叫 `runGemini`，基於「剩餘熱量與蛋白質缺口」給出 3 個建議（150 字內，條列）。

- **智能營養建議（本地 + AI 混合）**
  - 程式碼位置：
    - `src/services/ai/nutritionRecommendation.js`
    - `src/services/ai/localAnalysisRules.js`：`NUTRITION_RULES`
    - `src/views/NutritionView.jsx`：智能建議卡片（`getSmartRecommendation()`）
  - 功能說明：
    - 從 Calendar 抓取「今日訓練」推估強度、時間與消耗熱量。
    - 比對目前攝取與目標，計算熱量 / 三大營養素缺口。
    - **先用本地規則產生建議**：
      - 基於訓練強度（高 / 中 / 低）給出恢復策略。
      - 根據缺口推薦具體餐點（雞胸肉便當、鮭魚定食等）。
      - 產生缺口提醒（過多 / 過少）。
    - 只有在缺口很大或情況複雜時，才呼叫 AI 進行深度分析，降低 token 消耗。

---

## 六、動作分析（重訓 / 跑姿）

- **重訓 AI 分析**
  - 程式碼位置：
    - `src/views/StrengthAnalysisView.jsx`
    - `src/hooks/usePoseDetection.js`：MediaPipe Pose 初始化
    - `src/services/analysisService.js`：結果儲存至 Calendar
    - `src/services/ai/formCorrection.js` + `localAnalysisRules.js`
  - 功能說明：
    - 上傳重訓影片或 FIT 檔，偵測關節角度（臥推 / 深蹲）。
    - 計算動作評分（`calculateStrengthScore`）。
    - 透過 `analyzeFormDeviations()` 計算偏差（手肘 / 膝蓋角度、槓鈴軌跡、離心時間等）。
    - **本地糾正建議**：
      - `FORM_CORRECTION_RULES` 先給出常見錯誤的修正建議與練習動作（箱式深蹲、窄距伏地挺身等）。
    - **AI 深度建議（選擇性）**：
      - 在偏差嚴重或多項問題時，呼叫 Gemini 生成詳細糾正計劃。
    - 可將分析結果（分數、指標、建議）儲存回 Calendar，之後在 Dashboard 的「動作優化建議」區塊呈現最近一次分析。

- **跑姿 AI 分析**
  - 程式碼位置：`src/views/RunAnalysisView.jsx`
  - 功能說明：
    - 上傳跑步影片或 FIT 檔，分析步頻、送髖、垂直振幅等指標。
    - 計算跑姿評分，並提供 AI 文本建議（使用 Gemini）。

---

## 七、個人檔案與訓練設定（Profile）

- **個人檔案主頁**
  - 程式碼位置：`src/views/FeatureViews.jsx`（`view === 'profile'`）
  - 相關元件：
    - `src/components/Profile/ProfileHeader.jsx`
    - `src/components/Profile/BodyDataForm.jsx`
    - `src/components/Profile/TrainingScheduleSection.jsx`
    - `src/components/Profile/RunningScheduleSection.jsx`
    - `src/components/Profile/SupplementsList.jsx`
    - `src/components/Profile/HeartRateZones.jsx`
  - 功能說明：
    - 編輯身高、體重、體脂、肌肉量、BMR、年齡、性別與活動係數等。
    - 自動計算 TDEE 與目標卡路里（依增肌 / 減脂 / 維持）。
    - 設定每週訓練日與時間、長課 / 間歇 / 輕鬆跑日。
    - 顯示心率區間與 Zone 2 區段。
    - 記錄補充品與備註。
    - 儲存時：
      - 更新 `users/{uid}` Profile。
      - 同步一筆當日 body_logs。
      - 更新 AI Context（讓 AI 教練與訓練計畫了解最新狀態）。

- **資料備份與恢復**
  - 程式碼位置：
    - `src/services/backupService.js`
    - `src/views/FeatureViews.jsx`（Profile 頁底部）
  - 功能說明：
    - 一鍵下載完整 JSON 備份（Profile + Calendar + body_logs + food_logs + gears + achievements）。
    - 上傳 JSON 備份並選擇是否覆寫，支援逐集合恢復與錯誤顯示。

---

## 八、AI 教練聊天（Coach Chat）

- 程式碼位置：
  - `src/components/AICoach/CoachChat.jsx`
  - `src/services/aiContextService.js`
  - `src/utils/contextManager.js`
  - `src/utils/gemini.js`
- 功能說明：
  - 右上角按鈕開啟對話視窗，與 AI 教練互動。
  - `aiContextService` 會彙整：
    - 近 7 天訓練概況（跑步 / 重訓次數與簡短描述）
    - 最近飲食紀錄
    - 個人目標與 TDEE
  - 每次對話都會帶入這些 Context，讓回答更貼近實際狀態。

---

## 九、工具與共用模組

- **AI 封裝**
  - `src/utils/gemini.js`：統一封裝 Gemini / Gemini Vision 呼叫與錯誤處理。
  - `src/services/ai/localAnalysisRules.js`：本地規則庫（營養、動作糾正、訓練計畫模板、動作評分）。

- **計算工具**
  - `src/utils/nutritionCalculations.js`：BMR / TDEE / 目標卡路里。
  - `src/utils/heartRateCalculations.js`：心率區間計算。
  - `src/utils/statsCalculations.js`：訓練統計（Dashboard 用）。
  - `src/utils/cycleAnalysis.js`：訓練週期（增肌 / 減脂 / 維持 / 恢復）分析。
  - `src/utils/trendCalculations.js`, `src/utils/workoutCalculations.js`：各種趨勢與訓練統計輔助。

- **驗證與錯誤處理**
  - `src/utils/formValidation.js`：表單欄位驗證規則。
  - `src/services/errorService.js`：集中錯誤處理與顯示。

---

## 十、後續建議與擴充方向

根據 `專案狀態檢視與計劃更新` 計劃檔，目前核心功能已基本完成，建議後續可優先考慮：

1. **多平台 API 自動同步**
   - 實作 `syncFromPlatformAPI()` 串接 Strava / Garmin / Apple Health。
2. **PDF 報告匯出**
   - 在 `reportGenerator.js` 中增加 PDF 生成功能，並於 Dashboard 分享選單加入「下載 PDF 報告」。
3. **測試與文件**
   - 為關鍵服務與視圖撰寫單元測試與 E2E 測試。
   - 完善 `README.md`，補上部署說明與 API Key 設定流程。

此檔案可作為整個專案的「功能導覽 + 程式碼索引」，方便你自己或新加入的開發者快速理解系統。

