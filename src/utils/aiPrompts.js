// --- 總教練 (Head Coach) - 負責行事曆與週期安排 ---
export const getHeadCoachPrompt = (userProfile, recentLogs, targetDate, monthlyStats) => {
    const dateObj = new Date(targetDate);
    const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...
    
    // 計算月跑量進度
    const dayOfMonth = dateObj.getDate();
    const monthProgress = dayOfMonth / 30;
    const target80 = 80 * monthProgress;
    const currentDist = monthlyStats.currentDist || 0;
    const gapStatus = currentDist < target80 ? "落後進度" : "進度良好";
  
    return `
      角色：你是使用者的「健身總教練」，負責協調重訓與跑步。
      
      [使用者狀態]
      - 目標：${userProfile.goal}
      - 本月跑量：${currentDist.toFixed(1)} km (${gapStatus})
      - 安排日期：${targetDate} (週${dayOfWeek})
      
      [近期紀錄]
      ${recentLogs}
      
      [總教練決策邏輯]
      1. **協調性**：昨日高強度今日則低強度。
      2. **跑步規則**：
         - 平日(週一~五)時間限制在 **60分鐘** 內。
         - 週日優先安排 LSD。
         - **數據一致性**：請確保「距離 (km)」x「配速 (min/km)」約等於「總時間 (min)」。
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
  
        // 重訓欄位
        "exercises": [
          { "name": "名稱", "targetMuscle": "pecs", "sets": "4", "reps": "10", "weight": "適重" }
        ]
      }
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