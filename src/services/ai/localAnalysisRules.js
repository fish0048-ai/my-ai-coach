/**
 * 本地分析規則庫
 * 基於運動科學和營養學知識庫，提供本地分析規則
 * 減少 AI API 調用，降低 token 消耗
 */

/**
 * 營養建議規則庫
 */
export const NUTRITION_RULES = {
  /**
   * 根據訓練強度推薦營養
   */
  getTrainingBasedRecommendations: (trainingInfo, gaps) => {
    const recommendations = [];
    
    if (trainingInfo.hasTraining) {
      if (trainingInfo.intensity === 'high') {
        recommendations.push('高強度訓練後，建議在30分鐘內補充快速吸收的蛋白質和碳水');
        recommendations.push('訓練後可選擇香蕉、優格或蛋白質飲品，幫助肌肉恢復');
      } else if (trainingInfo.intensity === 'moderate') {
        recommendations.push('中強度訓練後，建議補充適量蛋白質和複合碳水');
      }
      
      if (trainingInfo.type.includes('running')) {
        recommendations.push('跑步訓練後，重點補充碳水以恢復肝醣儲存');
      } else if (trainingInfo.type.includes('strength')) {
        recommendations.push('力量訓練後，優先補充蛋白質以促進肌肉合成');
      }
    } else {
      recommendations.push('今日無訓練，建議維持正常飲食，避免過量攝取');
    }
    
    return recommendations;
  },

  /**
   * 根據營養缺口推薦餐點
   */
  getMealSuggestions: (gaps, userGoal) => {
    const suggestions = [];
    
    // 蛋白質缺口
    if (gaps.protein > 20) {
      suggestions.push({
        name: '雞胸肉便當',
        description: '雞胸肉150g、白飯1碗、青菜2份',
        calories: 450,
        protein: 35,
        carbs: 50,
        fat: 8
      });
    }
    
    if (gaps.protein > 15 && gaps.calorie > 300) {
      suggestions.push({
        name: '鮭魚定食',
        description: '烤鮭魚100g、糙米飯1碗、味噌湯、小菜',
        calories: 520,
        protein: 28,
        carbs: 45,
        fat: 22
      });
    }
    
    // 碳水缺口
    if (gaps.carbs > 50 && gaps.calorie > 200) {
      suggestions.push({
        name: '地瓜 + 水煮蛋',
        description: '中型地瓜2條、水煮蛋2顆',
        calories: 320,
        protein: 14,
        carbs: 55,
        fat: 6
      });
    }
    
    // 通用建議
    if (gaps.calorie > 400 && suggestions.length === 0) {
      suggestions.push({
        name: '均衡餐盒',
        description: '白飯1碗、主菜（雞/魚/豬擇一）、配菜3樣',
        calories: 550,
        protein: 25,
        carbs: 60,
        fat: 15
      });
    }
    
    return suggestions;
  },

  /**
   * 生成營養缺口提醒
   */
  getGapAlerts: (gaps) => {
    const alerts = {};
    
    if (gaps.protein < -20) {
      alerts.protein = '蛋白質攝取已超過目標，建議適量減少';
    } else if (gaps.protein > 30) {
      alerts.protein = `蛋白質缺口${Math.round(gaps.protein)}g，建議補充優質蛋白質`;
    }
    
    if (gaps.calorie < -300) {
      alerts.calorie = '熱量攝取已超過目標，建議控制份量';
    } else if (gaps.calorie > 500) {
      alerts.calorie = `熱量缺口${Math.round(gaps.calorie)}大卡，建議補充營養餐點`;
    }
    
    if (gaps.carbs > 50) {
      alerts.carbs = `碳水缺口${Math.round(gaps.carbs)}g，建議補充複合碳水`;
    }
    
    if (gaps.fat > 20) {
      alerts.fat = `脂肪缺口${Math.round(gaps.fat)}g，建議適量補充健康脂肪`;
    }
    
    return alerts;
  }
};

/**
 * 動作糾正規則庫
 */
export const FORM_CORRECTION_RULES = {
  /**
   * 根據偏差生成本地糾正建議
   */
  getLocalCorrections: (deviationAnalysis, mode) => {
    if (!deviationAnalysis || !deviationAnalysis.hasIssues) {
      return null;
    }
    
    const corrections = [];
    const correctiveExercises = [];
    
    Object.entries(deviationAnalysis.deviations).forEach(([key, dev]) => {
      if (!dev || dev.severity === 'none') return;
      
      if (mode === 'bench') {
        if (key === 'elbowAngle') {
          if (dev.direction === 'too_small') {
            corrections.push('手肘角度過小，建議調整握距，讓手肘與身體呈約75-90度');
            correctiveExercises.push({
              name: '啞鈴飛鳥',
              sets: 3,
              reps: '12-15',
              focus: '感受胸肌拉伸，控制手肘角度',
              description: '平躺，雙手各持啞鈴，手肘微彎，向兩側展開至胸部有拉伸感'
            });
          } else if (dev.direction === 'too_large') {
            corrections.push('手肘角度過大，建議收緊手肘，減少肩部壓力');
            correctiveExercises.push({
              name: '窄距伏地挺身',
              sets: 3,
              reps: '10-12',
              focus: '手肘貼近身體，感受三頭肌發力',
              description: '雙手距離比肩窄，手肘貼近身體，下降時手肘角度約90度'
            });
          }
        }
        
        if (key === 'barPath') {
          corrections.push('槓鈴軌跡偏移，建議保持垂直上下移動，避免前後晃動');
          correctiveExercises.push({
            name: '空槓練習',
            sets: 3,
            reps: '8-10',
            focus: '專注於垂直軌跡，慢速控制',
            description: '使用空槓或輕重量，專注於保持槓鈴垂直上下移動'
          });
        }
        
        if (key === 'eccentricTime') {
          if (dev.direction === 'too_fast') {
            corrections.push('離心階段過快，建議放慢下降速度至2-3秒，增加肌肉張力');
          } else {
            corrections.push('離心階段過慢，建議控制在2-3秒，保持節奏');
          }
        }
      } else if (mode === 'squat') {
        if (key === 'kneeAngle') {
          if (dev.direction === 'too_small') {
            corrections.push('膝蓋角度不足，建議增加下蹲深度，讓大腿平行地面');
            correctiveExercises.push({
              name: '箱式深蹲',
              sets: 3,
              reps: '10-12',
              focus: '控制下蹲深度，臀部觸及箱子',
              description: '在身後放置箱子，下蹲至臀部輕觸箱子後站起'
            });
          } else if (dev.direction === 'too_large') {
            corrections.push('膝蓋角度過大，可能導致膝蓋壓力增加，建議調整深度');
          }
        }
        
        if (key === 'hipDepth') {
          corrections.push('髖關節深度不足，建議增加下蹲深度，讓臀部低於膝蓋');
          correctiveExercises.push({
            name: '高腳杯深蹲',
            sets: 3,
            reps: '12-15',
            focus: '保持背部挺直，下蹲至大腿平行',
            description: '雙手抱啞鈴於胸前，下蹲時保持背部挺直，下蹲至大腿平行地面'
          });
        }
      }
    });
    
    if (corrections.length === 0) return null;
    
    return {
      corrections,
      correctiveExercises,
      trainingPlan: '建議在每次訓練前進行10分鐘的動態熱身，包含上述糾正動作。每週安排2-3次專項糾正訓練，每次15-20分鐘。'
    };
  }
};

/**
 * 訓練計劃模板庫
 */
export const WORKOUT_TEMPLATES = {
  /**
   * 標準訓練計劃模板
   */
  templates: {
    '5x5': {
      name: '5x5 力量訓練',
      description: '經典的 5x5 訓練法，每週 3 次，每次 5 組 5 次',
      weeklySchedule: [
        { day: 1, exercises: ['深蹲 5x5', '臥推 5x5', '划船 5x5'] },
        { day: 3, exercises: ['深蹲 5x5', '肩推 5x5', '硬舉 1x5'] },
        { day: 5, exercises: ['深蹲 5x5', '臥推 5x5', '划船 5x5'] }
      ]
    },
    'ppl': {
      name: 'PPL 推拉腿',
      description: '每週 6 天，推/拉/腿循環',
      weeklySchedule: [
        { day: 1, type: 'push', exercises: ['臥推', '肩推', '三頭'] },
        { day: 2, type: 'pull', exercises: ['硬舉', '划船', '二頭'] },
        { day: 3, type: 'legs', exercises: ['深蹲', '腿舉', '小腿'] },
        { day: 4, type: 'push', exercises: ['上斜臥推', '側平舉', '三頭'] },
        { day: 5, type: 'pull', exercises: ['引體向上', '划船', '二頭'] },
        { day: 6, type: 'legs', exercises: ['前蹲', '羅馬尼亞硬舉', '小腿'] }
      ]
    }
  },
  
  /**
   * 判斷是否需要 AI 深度分析
   */
  needsAIAnalysis: (planType, userProfile, customRequirements) => {
    // 如果用戶有特殊需求（如目標 PB、特定日期），需要 AI
    if (customRequirements?.targetPB || customRequirements?.targetRaceDate) {
      return true;
    }
    
    // 如果計劃類型是標準模板（如 5x5, PPL），可以先用本地模板
    const standardPlans = ['5x5', 'ppl', 'upper_lower', 'full_body'];
    if (standardPlans.includes(planType)) {
      return false; // 可以使用本地模板
    }
    
    // 跑步計劃通常需要 AI 根據用戶歷史調整
    if (planType.startsWith('running_')) {
      return true;
    }
    
    return true; // 預設需要 AI
  }
};

/**
 * 動作分析規則庫
 */
export const MOVEMENT_ANALYSIS_RULES = {
  /**
   * 根據評分和指標生成本地反饋
   */
  getLocalFeedback: (score, metrics, mode) => {
    if (score >= 85) {
      return {
        feedback: `動作評分${score}分，表現優秀！保持目前的動作品質，繼續維持良好的訓練習慣。`,
        needsAI: false
      };
    }
    
    if (score >= 70) {
      return {
        feedback: `動作評分${score}分，整體表現良好。建議關注細節優化，可以參考下方的偏差分析進行調整。`,
        needsAI: false
      };
    }
    
    // 低分需要 AI 深度分析
    return {
      feedback: null,
      needsAI: true
    };
  }
};
