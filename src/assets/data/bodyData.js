// 精細化的人體肌肉 SVG 路徑
// 這些路徑將肌肉分為更細緻的區塊，讓顯示更專業

export const BODY_PATHS = {
    front: {
        // 頭頸
        head: "M50,15 C50,15 58,15 58,23 C58,31 56,36 50,36 C44,36 42,31 42,23 C42,15 50,15 50,15 Z",
        neck: "M45,35 L55,35 L56,40 L44,40 Z",
        
        // 胸部 (Pectorals)
        chest_left: "M50,45 L50,65 C45,68 38,62 38,50 C38,45 42,42 50,45 Z",
        chest_right: "M50,45 L50,65 C55,68 62,62 62,50 C62,45 58,42 50,45 Z",
        
        // 肩膀 (Deltoids - Front)
        shoulder_left: "M38,42 C32,41 24,46 24,50 C24,53 28,58 32,55 C34,53 36,48 38,42 Z",
        shoulder_right: "M62,42 C68,41 76,46 76,50 C76,53 72,58 68,55 C66,53 64,48 62,42 Z",
        
        // 手臂 (Biceps & Forearms)
        bicep_left: "M30,55 C26,56 22,65 22,70 C22,73 28,73 30,70 L30,55 Z",
        bicep_right: "M70,55 C74,56 78,65 78,70 C78,73 72,73 70,70 L70,55 Z",
        forearm_left: "M22,70 L20,85 L16,92 L24,90 L26,75 Z",
        forearm_right: "M78,70 L80,85 L84,92 L76,90 L74,75 Z",
        
        // 核心 (Abs & Obliques)
        abs: "M42,65 L58,65 L56,90 L44,90 Z M42,72 H58 M43,80 H57", // 腹直肌 (含線條)
        oblique_left: "M42,65 L38,62 L38,85 L44,90 Z",
        oblique_right: "M58,65 L62,62 L62,85 L56,90 Z",
        
        // 腿部 (Quads)
        quad_left: "M44,90 C40,95 36,110 38,130 C38,130 46,135 48,130 L49,92 Z",
        quad_right: "M56,90 C60,95 64,110 62,130 C62,130 54,135 52,130 L51,92 Z",
        
        // 小腿 (Tibialis/Calves Front)
        shin_left: "M38,130 L40,165 L46,165 L46,135 Z",
        shin_right: "M62,130 L60,165 L54,165 L54,135 Z"
    },
    back: {
        head: "M50,15 C50,15 58,15 58,23 C58,31 56,36 50,36 C44,36 42,31 42,23 C42,15 50,15 50,15 Z",
        
        // 背部 (Traps & Lats)
        traps: "M44,40 L56,40 L65,48 L50,60 L35,48 Z", // 斜方肌
        lats_left: "M35,48 L40,65 L50,85 L50,60 L40,55 Z", // 背闊肌左
        lats_right: "M65,48 L60,65 L50,85 L50,60 L60,55 Z", // 背闊肌右
        lower_back: "M42,85 L58,85 L56,92 L44,92 Z", // 下背
        
        // 肩膀 (Rear Delts)
        shoulder_left: "M35,48 C30,48 24,52 24,56 C24,58 30,62 35,55 Z",
        shoulder_right: "M65,48 C70,48 76,52 76,56 C76,58 70,62 65,55 Z",
        
        // 手臂 (Triceps)
        tricep_left: "M24,56 L20,75 L28,75 L30,62 Z",
        tricep_right: "M76,56 L80,75 L72,75 L70,62 Z",
        
        // 臀部 (Glutes)
        glutes: "M40,92 C35,95 35,105 50,110 C65,105 65,95 60,92 L50,95 Z M50,92 L50,110",
        
        // 腿後側 (Hamstrings)
        hamstring_left: "M38,110 L38,135 L48,135 L48,112 Z",
        hamstring_right: "M62,110 L62,135 L52,135 L52,112 Z",
        
        // 小腿 (Calves Back)
        calf_left: "M38,135 C34,145 36,155 40,165 L46,165 L46,140 Z",
        calf_right: "M62,135 C66,145 64,155 60,165 L54,165 L54,140 Z"
    }
};

// 定義哪些 SVG 部位對應到使用者的輸入標籤
export const MUSCLE_MAPPING = {
    '胸部': ['chest_left', 'chest_right'],
    '背部': ['traps', 'lats_left', 'lats_right', 'lower_back'],
    '肩膀': ['shoulder_left', 'shoulder_right'],
    '手臂': ['bicep_left', 'bicep_right', 'forearm_left', 'forearm_right', 'tricep_left', 'tricep_right'],
    '核心': ['abs', 'oblique_left', 'oblique_right'],
    '腿部': ['quad_left', 'quad_right', 'shin_left', 'shin_right', 'glutes', 'hamstring_left', 'hamstring_right', 'calf_left', 'calf_right']
};