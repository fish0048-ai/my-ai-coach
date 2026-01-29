---
name: 3d-world-plan-markdown-refactor
overview: 重寫專案狀態與計劃文件，改用 3D 虛擬世界＋小人走進不同房子比喻功能與同步狀態，保持純文件層面的敘事與結構。
todos:
  - id: kb-1
    content: "aiPrompts: getHeadCoachPrompt、getWeeklySchedulerPrompt 加入 knowledgeContext"
    status: completed
  - id: kb-2
    content: "workoutGenerator: 單日/週課表 取得 KB 並傳入 prompt"
    status: completed
  - id: kb-3
    content: "analysisService: 重訓/跑姿分析 取得 KB 並注入 prompt"
    status: completed
  - id: kb-4
    content: nutritionRecommendation、formCorrection、NutritionView 取得 KB 並注入
    status: completed
isProject: false
---

# 3D 世界比喻重構 `專案狀態檢視與計劃更新`

## 目標

- **敘事轉換**：將現有的專案狀態說明，改寫成「3D 虛擬城市」的比喻：每個主要功能是一棟房子，小人代表使用者進入房子就觸發該功能。
- **同步視覺化**：用 3D 世界語言描述不同房子之間的資料同步與狀態（例如：房子之間的光束、管線、橋樑），不改動實際程式碼，只在 `.plan.md` 文件中表達。
- **維持原有資訊密度**：不刪掉原本文件中的進度／任務，只是換一種空間化描述方式（可用小節或附錄保留原文字摘要）。

## 主要修改點（針對 `.cursor/plans/專案狀態檢視與計劃更新_26aa7b4c.plan.md`）

- **新增導言：3D 虛擬城市總覽**
  - 在文件開頭加入一段新導言，描述：
    - 有一座「My AI Coach 城市」，
    - 使用者化身為可操控的小人（Avatar），
    - 城市中有多棟主建築：行事曆館、訓練儀表板、營養研究所、個人知識庫圖書館、AI 教練中心等。
  - 說明操作隱喻：
    - 小人走到某棟房子門口 → 代表切換到對應功能頁面；
    - 進入房子內部不同樓層／房間 → 代表該功能裡的子功能（例如行事曆中的同步、匯入 FIT、產生週計畫）。
- **用「房子」重寫功能與進度小節**
  - 將現有各功能區塊（Dashboard、Calendar、Nutrition、AI Coach、Knowledge Base…）重寫成房子描述：
    - 例如：
      - 「行事曆房」：牆上掛滿月曆，房中有『匯入角落』『週教練桌』『同步控制台』，對應原本 CalendarView 的匯入、AI 週排程、平台同步等功能。
      - 「AI 教練中心」：中央是諮詢櫃臺（CoachChat），牆邊的螢幕顯示從個人知識庫與 AI Context 拉出的摘要。
      - 「個人知識庫圖書館」：書架上是訓練日記／傷痛紀錄，每一本書代表一條 KB record。
  - 在每棟房子的小節底下，用 1–2 行保留原本「開發進度／技術狀態」摘要，確保工程資訊仍可快速檢索。
- **以 3D 敘事描述同步關係**
  - 為「同步狀態」寫一個專門段落，以世界觀方式呈現：
    - 不同房子間用**光束、管線或橋樑**表現資料同步，例如：
      - 行事曆房 ↔ 趨勢分析塔：當使用者完成訓練並打卡時，行事曆屋頂會亮起，連到趨勢塔的光纜跟著發光，代表趨勢圖與 PR 面板已更新。
      - 行事曆房 ↔ AI 教練中心：小人在行事曆完訓練後，牆上的「教練連線燈」亮起，表示 AI Coach 的上下文已同步最新訓練。
      - 營養研究所 ↔ 個人知識庫圖書館：吃過的餐點紀錄被整理成「營養卷宗」存放到圖書館裡，後續 AI 教練或營養建議會讀這些卷宗。
  - 針對目前已實作的重要同步路徑，逐一用這種比喻描述（不需要完全覆蓋所有小功能，但要涵蓋主要數據流：行事曆、趨勢、Dashboard、AI Coach、Nutrition、Knowledge Base）。
- **用房間階層對應任務階段**
  - 將原本計畫中的「階段一／階段二／任務 2-1…」改寫為：
    - 城市某一區域正在施工（例如：API 區塊是新建的工業區）、
    - 某些房子的某一樓層還在裝潢（代表該子功能尚在重構中）。
  - 例如：
    - 「API 層骨架」→ 描述為城市地下有一條新建的『資料管線地鐵』，目前已打通主要站點（workouts, nutrition, body, gears），但有些支線仍在施工。
    - 「PR 服務抽離」→ 描述為在「力量訓練房」新增了一間『個人紀錄檔案室』，專門整理 PR 資料，其他房子透過走廊來查閱。
- **在文件尾端保留技術向索引**
  - 新增一個簡短附錄，維持工程師視角的對照表：
    - 房子／區域名稱 ↔ 實際檔案或目錄，例如：
      - 行事曆房 → `[src/views/CalendarView.jsx](src/views/CalendarView.jsx)`、`[src/services/ai/workoutGenerator.js](src/services/ai/workoutGenerator.js)`
      - AI 教練中心 → `[src/components/AICoach/CoachChat.jsx](src/components/AICoach/CoachChat.jsx)`、`[src/services/ai/coachService.js](src/services/ai/coachService.js)`
      - 個人知識庫圖書館 → `[src/views/KnowledgeBaseView.jsx](src/views/KnowledgeBaseView.jsx)`、`[src/services/ai/knowledgeBaseService.js](src/services/ai/knowledgeBaseService.js)`
  - 讓未來維護者能從 3D 敘事直接跳回真實程式碼。

## 後續可選延伸（不在本次修改範圍內）

- 若未來真的要做 3D / 類遊戲化 UI，可以在之後的文件中：
  - 在城市比喻的基礎上，補充技術實作選項（例如：Three.js、2D isometric、或簡化版房間切換動畫）。
  - 設計小人的操作方式（鍵盤／點擊）與資料同步動畫行為。

這次計劃僅修改 `.plan.md` 的敘事與結構，不碰實際 React/Vite 程式碼。