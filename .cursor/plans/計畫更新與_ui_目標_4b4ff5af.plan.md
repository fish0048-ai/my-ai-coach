---
name: 計畫更新與 UI 目標
overview: 更新專案狀態計畫檔，並新增「UI 介面修正」的長、中、短期目標章節，依總攬→行事曆→營養師→數據趨勢→裝備管理→重訓分析→跑姿分析→訓練計畫推薦→個人知識庫→個人檔案之順序撰寫。
todos:
  - id: plan-update
    content: 更新專案狀態計畫檔（最後更新、ui-roadmap、第七章）
    status: completed
  - id: ui-audit-color-font
    content: 依序檢查所有功能介面，設計配色是否配合；字體可讀性（很多字體沒看到）
    status: completed
isProject: false
---

# 計畫更新與 UI 介面修正目標

> **執行狀態**：✅ **已完成**（2026-02-06）  
> 對象檔案 [專案狀態檢視與計劃更新_26aa7b4c.plan.md](./專案狀態檢視與計劃更新_26aa7b4c.plan.md) 已含最後更新日期、`ui-roadmap` todo（已標 completed）、第七章「UI 介面修正的長中短期目標」完整內容（通用定義 + 10 區塊短/中/長期目標）。

## 一、計畫檔更新範圍

更新對象：`[.cursor/plans/專案狀態檢視與計劃更新_26aa7b4c.plan.md](.cursor/plans/專案狀態檢視與計劃更新_26aa7b4c.plan.md)`

**擬執行的變更**：

1. **前置區**
  - 將「最後更新」日期改為 2026-02-06（或執行當日）。  
  - 在 YAML front matter 的 `todos` 中新增一則：`ui-roadmap` —「UI 介面修正長中短期目標（依 10 區塊執行）」，狀態 `pending`。
2. **新增章節**
  - 在既有「六、整體 UI 大更新」之後，新增 **「七、UI 介面修正的長中短期目標」**。  
  - 章節內先定義「短期／中期／長期」的通用說明，再依下列 10 個區塊分別列出對應目標。
3. **通用定義（寫在章節開頭）**
  - **短期**：視覺與元件統一（Design Token、card-base / btn-primary / btn-secondary、border-game-outline、game-* 配色）、無障礙小修正（aria、按鈕 min-height）。  
  - **中期**：動線與資訊架構、表單與錯誤/成功回饋、載入/空狀態一致性。  
  - **長期**：互動與微動效、進階響應式與可及性、數據視覺化與可讀性優化。

---

## 二、10 個區塊的長中短期目標（條列式）

依你指定的順序：總攬 → 行事曆 → 營養師 → 數據趨勢 → 裝備管理 → 重訓分析 → 跑姿分析 → 訓練計畫推薦 → 個人知識庫 → 個人檔案。

### 1. 總攬（Dashboard）

- **短期**：StatsOverview、PRTracker、AchievementPanel、TodaySchedule、BackupBanner、ShareMenu 已部分統一；補齊 StatCard、GameProfileStrip 與其餘小元件之 game-* / card-base / 按鈕樣式；錯誤邊界與登入畫面維持一致邊框與按鈕。
- **中期**：Dashboard 區塊優先順序與摺疊/展開；BodyHeatmap 說明與圖例；空狀態（無 PR、無成就）引導文案與 CTA。
- **長期**：關鍵指標一頁摘要、自訂 Widget 順序或隱藏；數據卡片互動（如點擊展開明細）。

### 2. 行事曆（Calendar）

- **短期**：CalendarHeader、CalendarGrid、ImportSection、WorkoutCard、WorkoutForm、CalendarDayModal、WeeklyModal 全面採用 card-base / btn-* / border-game-outline、game-grass 選取與拖放提示；拖曳說明列使用 hint-bar。
- **中期**：月/週切換動線、今日高亮與待辦提示；表單驗證與儲存回饋一致；匯入/匯出成功或錯誤提示樣式統一。
- **長期**：週視圖與日視圖並存或切換；訓練卡片拖曳動效與放置回饋。

### 3. 營養師（Nutrition）

- **短期**：NutritionView 已做部分統一；確認所有按鈕、卡片、輸入框、ProgressBar、智能建議區塊皆為 card-base / input-base / btn-* / game-*；食物列表與刪除按鈕樣式一致。
- **中期**：熱量/三大營養素目標設定與說明；鑑定結果表單欄位分組與必填提示；智能建議載入與空狀態。
- **長期**：圖表或趨勢（每日攝取曲線）；與訓練日連動的營養建議文案。

### 4. 數據趨勢（Trend Analysis）

- **短期**：TrendAnalysisView 容器、卡片、按鈕改為 card-base、btn-primary/btn-secondary、border-game-outline；圖表區邊框與標題使用 game-* 或 surface-*；篩選器與日期選擇器樣式統一。
- **中期**：趨勢維度切換（跑量/配速/力量等）與時間區間；圖例與軸標籤可讀性；空資料說明與 CTA。
- **長期**：圖表互動（hover 明細、縮放）；匯出報表樣式與平台風格一致。

### 5. 裝備管理（Gear）

- **短期**：GearView 列表與表單使用 card-base、input-base、btn-*；裝備卡片邊框與狀態標籤（如耐久度）使用 game-*；新增/編輯 Modal 與主頁風格一致。
- **中期**：裝備與訓練/跑步紀錄的關聯展示；耐久度或使用次數的說明與提醒。
- **長期**：裝備統計或視覺化（如各鞋使用比例）；與遊戲化金幣/外觀的串接（若納入計劃）。

### 6. 重訓分析（Strength Analysis）

- **短期**：StrengthAnalysisView 版面與控制項改為 card-base、btn-*、border-game-outline；圖表與表格容器統一邊框與背景；動作選擇與篩選 UI 一致。
- **中期**：1RM/訓練量趨勢說明；空狀態與「尚未有數據」引導；表單錯誤與成功回饋。
- **長期**：動作比對、週期化視圖；圖表互動與匯出。

### 7. 跑姿分析（Run Analysis）

- **短期**：RunAnalysisView 容器、卡片、按鈕與表單統一為 card-base、input-base、btn-*、game-*；分析結果區塊與建議區塊邊框與標題一致。
- **中期**：分析維度與指標說明；載入中與無資料狀態；錯誤訊息樣式與 ErrorToast 一致。
- **長期**：跑姿指標與趨勢圖；與訓練計畫或跑步課表的聯動提示。

### 8. 訓練計畫推薦（Training Plan）

- **短期**：TrainingPlanView 列表與卡片、篩選與篩選按鈕、主要 CTA 改為 card-base、btn-*、border-game-outline；計畫卡片標籤與狀態用 game-grass / game-coin 等。
- **中期**：計畫詳情頁或 Modal 的資訊架構；「套用到行事曆」流程與成功/失敗回饋；空狀態與無符合條件說明。
- **長期**：計畫與實際完成率對照；推薦邏輯簡要說明（可讀性）。

### 9. 個人知識庫（Knowledge Base）

- **短期**：KnowledgeBaseView 容器、搜尋列、結果列表、新增/編輯表單使用 card-base、input-base、btn-*、game-*；標籤與分類樣式統一。
- **中期**：搜尋結果排序與篩選；新增條目成功/錯誤回饋；空狀態與引導（如何建立第一筆知識）。
- **長期**：條目與 AI 引用來源的對應展示；簡單的類別或標籤統計。

### 10. 個人檔案（Profile / FeatureViews）

- **短期**：ProfileHeader、BodyDataForm、TrainingScheduleSection、RunningScheduleSection、SupplementsList、備份與恢復區塊已部分統一；確認所有表單欄位為 input-base、按鈕為 btn-*、區塊為 card-base；分隔線與標題使用 game-outline / game-grass。
- **中期**：表單分區與進度（如「基本資料 / 訓練習慣 / 跑步課表」）；驗證與儲存回饋一致；備份/還原結果區塊已用 game-*，保持並檢查無遺漏。
- **長期**：頭像或外觀預覽；與 gameProfile（等級/金幣）的展示整合（若保留於此頁）。

---

## 三、章節結構建議（Markdown）

在計畫檔中，「七、UI 介面修正的長中短期目標」建議結構如下：

```markdown
### 七、UI 介面修正的長中短期目標

- **短期**：視覺與元件統一（Design Token、card-base / btn-* / border-game-outline、game-*）、無障礙小修正。
- **中期**：動線與資訊架構、表單與回饋、載入/空狀態一致性。
- **長期**：互動與動效、響應式與可及性進階、數據視覺化優化。

依序針對下列 10 個介面區塊訂定具體目標：

1. **總攬** — （如上 1. 總攬）
2. **行事曆** — （如上 2. 行事曆）
...
10. **個人檔案** — （如上 10. 個人檔案）
```

可將上節「二、10 個區塊的長中短期目標」完整貼入各小標下，或改為表格（區塊 | 短期 | 中期 | 長期）以節省篇幅。

---

## 四、不需更動的部分

- 執行摘要表格、RPG 三階段、世界地圖映射、3D 資產、既有「六、整體 UI 大更新」內容、建築對照表、參考與注意事項：**維持不變**，僅在文末或適當處加入「七、UI 介面修正的長中短期目標」與 YAML todo。

---

## 五、執行步驟摘要

1. 開啟 `[.cursor/plans/專案狀態檢視與計劃更新_26aa7b4c.plan.md](.cursor/plans/專案狀態檢視與計劃更新_26aa7b4c.plan.md)`。
2. 更新「最後更新」日期；在 front matter 的 `todos` 新增 `ui-roadmap`。
3. 在「六、整體 UI 大更新」之後插入「七、UI 介面修正的長中短期目標」，含通用定義與 10 個區塊的長/中/短期目標（依本計畫第二節內容撰寫）。
4. 存檔後可將 `ui-roadmap` 標為 in_progress 或依實際執行再更新狀態。

以上完成後，計畫檔即包含你要的「計畫更新」與「UI 介面修正長中短期目標」，且順序為總攬 → 行事曆 → 營養師 → 數據趨勢 → 裝備管理 → 重訓分析 → 跑姿分析 → 訓練計畫推薦 → 個人知識庫 → 個人檔案。

---

## 六、依序檢查功能介面：設計配色與字體可讀性

**目標**：依序檢查所有功能介面，確認設計配色與 Kenney 平台風格一致，並**改善字體可讀性**（目前多處字體不明顯或難以辨識）。

**檢查順序**（與第七章 10 區塊一致）：

1. 總攬（Dashboard）  
2. 行事曆（Calendar）  
3. 營養師（Nutrition）  
4. 數據趨勢（Trend Analysis）  
5. 裝備管理（Gear）  
6. 重訓分析（Strength Analysis）  
7. 跑姿分析（Run Analysis）  
8. 訓練計畫推薦（Training Plan）  
9. 個人知識庫（Knowledge Base）  
10. 個人檔案（Profile）

**每區塊檢查要項**：

- **設計配色**：標題、內文、按鈕、卡片、邊框是否使用 game-* / card-base / btn-* / border-game-outline；是否與整站 Kenney 風格一致。  
- **字體可讀性**：文字與背景對比是否足夠；字級、字重、顏色（如 `text-gray-900`、`text-game-outline`）是否讓文字「看得到」；小字（`text-xs`、`text-sm`）是否在淺底或深底上可讀。  
- **修正方向**：不足處補上統一 class；對比不足處調整為深色字（如 `text-gray-900`）於淺底、淺字於深色區塊；必要時提高字級或字重。

**YAML todo**：`ui-audit-color-font` —「依序檢查所有功能介面，設計配色是否配合；字體可讀性（很多字體沒看到）」— 狀態已標為 **`completed`**。

**執行紀錄（2026-02-06）**：已依序檢查並修正下列區塊之字體可讀性與配色：
- **總攬**：StatsOverview、TodaySchedule、PRTracker、AchievementPanel、RunningStatsSection、GameProfileStrip、BodyHeatmap 空狀態、WeatherWidget、BackupBanner — 將 `text-gray-400`/`text-gray-500` 改為 `text-gray-700` 或 `text-gray-900`，`text-white` 於淺底改為 `text-gray-900`，小字改為 `text-xs` + `font-medium`。
- **行事曆**：CalendarHeader 標題改為 `text-gray-900`；CalendarGrid 星期列改為 `text-gray-800`、訓練 pill 改為 `text-xs font-medium`；CalendarDayModal 空狀態與標籤改為較深色。
- **營養師**：頁標題、ProgressBar、剩餘熱量區、智能建議標題與說明改為深色字。
- **數據趨勢**：頁標題改為 `text-gray-900`，toggle 按鈕改為 `text-gray-700`/`hover:text-gray-900`，空狀態改為 `text-gray-700`。
- **裝備管理**：頁標題、副標、裝備卡片型號/里程/狀態/按鈕改為深色字。
- **個人知識庫**：頁標題、說明、新增表單標題與 label 改為 `text-gray-900`/`text-gray-700`。