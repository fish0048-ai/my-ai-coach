// 動作名稱關鍵字對應表
// Key: 動作關鍵字 (包含此字串即觸發)
// Value: 對應 BodyHeatmap.jsx 的肌肉代碼
export const exerciseMapping = {
    // 胸部 (pecs)
    "臥推": "pecs",
    "胸推": "pecs",
    "飛鳥": "pecs",
    "伏地挺身": "pecs",
    "夹胸": "pecs",
    "bench press": "pecs",
    "chest": "pecs",

    // 肩膀 (delts - 前/中束, rear_delts - 後束)
    "肩推": "delts",
    "推舉": "delts",
    "側平舉": "delts",
    "前平舉": "delts",
    "臉拉": "rear_delts",
    "反向飛鳥": "rear_delts",
    "shoulder": "delts",

    // 背部 (lats - 背闊, traps - 斜方, lower_back - 下背)
    "引體向上": "lats",
    "下拉": "lats",
    "划船": "lats",
    "單槓": "lats",
    "硬舉": "lower_back",
    "山羊": "lower_back",
    "聳肩": "traps",
    "pull up": "lats",
    "row": "lats",
    "deadlift": "lower_back",

    // 腿部 (quads - 股四頭, hamstrings - 膕旁, glutes - 臀, calves - 小腿)
    "深蹲": "quads",
    "腿推": "quads",
    "分腿蹲": "quads",
    "腿屈伸": "quads",
    "腿後勾": "hamstrings",
    "直腿硬舉": "hamstrings",
    "臀推": "glutes",
    "後踢": "glutes",
    "提踵": "calves",
    "squat": "quads",
    "leg press": "quads",

    // 手臂 (biceps - 二頭, triceps - 三頭)
    "二頭": "biceps",
    "彎舉": "biceps",
    "三頭": "triceps",
    "臂屈伸": "triceps",
    "窄推": "triceps",
    "法推": "triceps",
    "curl": "biceps",
    "extension": "triceps",

    // 核心 (abs, obliques)
    "卷腹": "abs",
    "舉腿": "abs",
    "平板支撐": "abs",
    "棒式": "abs",
    "俄羅斯轉體": "obliques",
    "plank": "abs"
};

// 輔助函式：根據輸入名稱尋找對應肌肉
export const detectMuscleGroup = (exerciseName) => {
    if (!exerciseName) return '';
    const lowerName = exerciseName.toLowerCase();
    
    // 遍歷對照表，尋找是否包含關鍵字
    for (const [keyword, muscle] of Object.entries(exerciseMapping)) {
        if (lowerName.includes(keyword)) {
            return muscle;
        }
    }
    return ''; // 沒找到回傳空字串
};