// --- 總教練 (Head Coach) - 單日排程 ---
export const getHeadCoachPrompt = (userProfile, recentLogs, targetDate, monthlyStats, preferredRunType = null) => {
  const dateObj = new Date(targetDate);
  const dayOfWeek = dateObj.getDay(); 
  
  const dayOfMonth = dateObj.getDate();
  const monthProgress = dayOfMonth / 30;
  const target80 = 80 * monthProgress;
  const currentDist = monthlyStats.currentDist || 0;
  const gapStatus = currentDist < target80 ? "落後進度" : "進度良好";

  // 跑步類型對應說明
  const runTypeMap = {
    'Easy': '輕鬆跑（恢復跑，Zone 2 心率）',
    'Interval': '間歇跑（高強度間歇訓練）',
    'LSD': '長距離慢跑（Long Slow Distance）',
    'MP': '馬拉松配速跑（Marathon Pace）'
  };

  const runTypeInstruction = preferredRunType 
    ? `\n    **重要**：使用者已指定跑步類型為「${runTypeMap[preferredRunType] || preferredRunType}」，請務必生成此類型的跑步課表。`
    : '';

  return `
    角色：你是使用者的「健身總教練」，負責協調重訓與跑步。
    
    [使用者狀態]
    - 目標：${userProfile.goal}
    - 本月跑量：${currentDist.toFixed(1)} km (${gapStatus})
    - 安排日期：${targetDate} (週${dayOfWeek})${runTypeInstruction}
    
    [近期紀錄]
    ${recentLogs}
    
    [總教練決策邏輯]
    1. **協調性**：昨日高強度今日則低強度。
    2. **跑步規則**：
       - 平日(週一~五)時間限制在 **60分鐘** 內。
       - 週日優先安排 LSD。
       - **數據一致性**：請確保「距離 (km)」x「配速 (min/km)」約等於「總時間 (min)」。
       ${preferredRunType ? `- **使用者偏好**：請生成「${preferredRunType}」類型的跑步課表。` : ''}
    3. **重訓規則**：必須包含 5 個動作，標註肌群。

    [輸出任務]
    請回傳 JSON 物件 (Value 不包含單位，純數字)：
    {
      "type": "run" 或 "strength",
      "title": "標題",
      "advice": "短評",
      
      // 跑步欄位 (務必填寫)
      "runType": "LSD" | "Interval" | "Easy" | "MP",
      "runDistance": 數字 (例: 5.5),
      "runDuration": 數字 (例: 30),
      "runPace": 字串 (例: "5'30\" /km"),
      "runHeartRate": 字串 (例: "140-150"),
      
      // 間歇跑專用欄位 (僅當 runType === "Interval" 時填寫)
      "runIntervalSets": 數字 (例: 8, 表示幾組),
      "runIntervalPace": "字串 (例: \"4'00\" /km\", 表示每組配速)",
      "runIntervalDuration": 數字 (例: 60, 表示每組維持時間，單位：秒),
      "runIntervalRest": 數字 (例: 90, 表示休息幾秒),

      // 重訓欄位
      "exercises": [
        { "name": "名稱", "targetMuscle": "pecs", "sets": "4", "reps": "10", "weight": "適重" }
      ]
    }
  `;
};

// --- 總教練：週課表安排 (Weekly Scheduler) ---
// 這是之前遺漏的部分，現在補上
export const getWeeklySchedulerPrompt = (userProfile, contextSummary, planningDates, userPreferences, monthlyStats) => {
  return `
    角色：你是使用者的「健身總教練」，正在規劃本週剩餘日期的訓練課表。
    
    [使用者狀態]
    - 目標：${userProfile.goal}
    - 本月目前跑量：${monthlyStats.currentDist.toFixed(1)} km (目標 >80km)
    
    [近期訓練狀態 (Context)]
    ${contextSummary}
    
    [待規劃日期]
    ${JSON.stringify(planningDates)}
    
    [使用者指定偏好 (Multiselect)]
    ${JSON.stringify(userPreferences)}
    注意：使用者可能在同一天指定多種類型 (例如 ["strength", "run_easy"])，請為該日期生成 **多筆** 訓練計畫。
    
    類型代碼說明：
    - strength: 重訓 (必須5動作)
    - run_lsd: 長距離跑 (週日不受60分限制)
    - run_interval: 間歇跑 (高強度)
    - run_easy: 輕鬆跑 (恢復)
    - run_mp: 馬拉松配速跑
    - rest: 休息日 (不排課)
    - auto: 由你決定 (若無指定，請根據恢復狀態填補空缺)
    
    [規劃邏輯]
    1. **絕對遵守偏好**：若同一天有多個偏好，請生成多個物件。
    2. **動態調整 (Auto)**：針對 'auto' 的日期，請根據前後天的強度安排。
    3. **跑步規範**：平日(Mon-Fri) 跑步單次總時間 <= 60分鐘 (LSD除外)。
    4. **重訓規範**：每次 5 個動作，標註 targetMuscle。
    
    [輸出格式]
    請回傳 JSON Array，包含所有計畫 (若一天兩練，該日期會有兩個物件)：
    [
      {
        "date": "YYYY-MM-DD",
        "type": "run" | "strength",
        "title": "標題 (例: 早安輕鬆跑 / 晚間胸背訓練)",
        "advice": "規劃理由",
        "runType": "LSD" | "Interval" | "Easy" | "MP",
        "runDistance": 數字, "runDuration": 數字, "runPace": "字串", "runHeartRate": "字串",
        // 間歇跑專用欄位 (僅當 runType === "Interval" 時填寫)
        "runIntervalSets": 數字 (例: 8, 表示幾組),
        "runIntervalRest": 數字 (例: 90, 表示休息幾秒),
        "runIntervalPace": "字串 (例: \"4'00\" /km\", 表示每組配速)",
        "exercises": [{ "name": "...", "targetMuscle": "...", "sets": "...", "reps": "...", "weight": "..." }]
      }
    ]
    
    [間歇跑範例]
    如果是間歇跑，請提供完整資訊：
    {
      "type": "run",
      "runType": "Interval",
      "title": "400m 間歇跑",
      "runDistance": 3.2,
      "runDuration": 20,
      "runPace": "5'00\" /km",  // 平均配速
      "runIntervalSets": 8,     // 8組
      "runIntervalPace": "4'00\" /km",  // 每組配速
      "runIntervalDuration": 60,  // 每組維持60秒
      "runIntervalRest": 90    // 休息90秒
    }
    
    Output ONLY JSON. No Markdown.
  `;
};

// --- 專職跑步教練 ---
export const getRunSpecialistPrompt = (metrics) => {
  return `
    角色：專職跑步技術教練。
    任務：分析跑步數據。
    數據：${JSON.stringify(metrics)}
    
    請提供：評分、送髖與步頻分析、修正 Drill。
  `;
};

// --- 專職重訓教練 ---
export const getStrengthSpecialistPrompt = (metrics, mode) => {
  return `
    角色：專職肌力體能教練。
    任務：分析 ${mode === 'bench' ? '臥推' : '深蹲'} 數據。
    數據：${JSON.stringify(metrics)}
    
    請提供：評分、軌跡與節奏分析、優化建議。
  `;
};