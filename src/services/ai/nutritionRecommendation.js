/**
 * 智能營養建議服務
 * 基於訓練強度和時間，生成個人化營養建議
 */

import { getApiKey } from '../config/apiKeyService';
import { getUserProfile } from '../userService';
import { listTodayWorkouts } from '../calendarService';
import { runGemini } from '../../utils/gemini';
import { parseLLMJson } from '../../utils/aiJson';
import { handleError } from '../core/errorService';
import { NUTRITION_RULES } from './localAnalysisRules';
import { getKnowledgeContextForQuery } from './knowledgeBaseService';

/**
 * 計算今日訓練強度
 * @param {Array} workouts - 今日訓練記錄
 * @returns {Object} 訓練強度資訊 {intensity, duration, calories, type}
 */
const calculateTodayTrainingIntensity = (workouts) => {
  if (!Array.isArray(workouts) || workouts.length === 0) {
    return {
      intensity: 'none',
      duration: 0,
      calories: 0,
      type: 'none',
      hasTraining: false
    };
  }

  const completedWorkouts = workouts.filter(w => w.status === 'completed');
  
  let totalDuration = 0;
  let totalCalories = 0;
  const types = [];

  completedWorkouts.forEach(workout => {
    // 跑步訓練
    if (workout.type === 'run') {
      const duration = parseFloat(workout.runDuration) || 0;
      const distance = parseFloat(workout.runDistance) || 0;
      totalDuration += duration;
      // 估算熱量：每公里約 60-80 大卡
      totalCalories += distance * 70;
      types.push('running');
    }
    // 力量訓練
    else if (workout.type === 'strength') {
      const exercises = workout.exercises || [];
      let workoutDuration = 0;
      let workoutCalories = 0;
      
      exercises.forEach(ex => {
        const sets = parseInt(ex.sets) || 0;
        const reps = parseInt(ex.reps) || 0;
        // 估算：每組約 2-3 分鐘，每組約 10-15 大卡
        workoutDuration += sets * 2.5;
        workoutCalories += sets * 12;
      });
      
      totalDuration += workoutDuration;
      totalCalories += workoutCalories;
      types.push('strength');
    }
    
    // 如果有記錄的熱量，優先使用
    if (workout.calories) {
      totalCalories = parseFloat(workout.calories) || totalCalories;
    }
  });

  // 判斷強度
  let intensity = 'light';
  if (totalDuration >= 90 || totalCalories >= 600) {
    intensity = 'high';
  } else if (totalDuration >= 45 || totalCalories >= 300) {
    intensity = 'moderate';
  }

  return {
    intensity,
    duration: Math.round(totalDuration),
    calories: Math.round(totalCalories),
    type: types.length > 0 ? types.join(', ') : 'none',
    hasTraining: completedWorkouts.length > 0
  };
};

/**
 * 生成智能營養建議
 * @param {Object} params - 參數物件
 * @param {number} params.currentCalories - 目前已攝取熱量
 * @param {number} params.currentProtein - 目前已攝取蛋白質 (g)
 * @param {number} params.currentCarbs - 目前已攝取碳水 (g)
 * @param {number} params.currentFat - 目前已攝取脂肪 (g)
 * @param {number} params.targetCalories - 目標熱量 (TDEE)
 * @param {number} params.targetProtein - 目標蛋白質 (g)
 * @param {number} params.targetCarbs - 目標碳水 (g)
 * @param {number} params.targetFat - 目標脂肪 (g)
 * @param {string} params.userGoal - 用戶目標（增肌、減脂、維持等）
 * @returns {Promise<Object>} 營養建議物件 {recommendations, mealSuggestions, gaps}
 */
export const generateNutritionRecommendation = async ({
  currentCalories = 0,
  currentProtein = 0,
  currentCarbs = 0,
  currentFat = 0,
  targetCalories = 2000,
  targetProtein = 150,
  targetCarbs = 200,
  targetFat = 67,
  userGoal = '健康'
}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'nutritionRecommendation', operation: 'generateNutritionRecommendation' });
    throw error;
  }

  try {
    // 獲取今日訓練資料
    const todayWorkouts = await listTodayWorkouts();
    const trainingInfo = calculateTodayTrainingIntensity(todayWorkouts);

    // 獲取用戶資料
    const userProfile = await getUserProfile();
    const userGoalText = userProfile?.goal || userGoal;

    // 計算缺口
    const calorieGap = targetCalories - currentCalories;
    const proteinGap = targetProtein - currentProtein;
    const carbsGap = targetCarbs - currentCarbs;
    const fatGap = targetFat - currentFat;

    const gaps = { calorie: calorieGap, protein: proteinGap, carbs: carbsGap, fat: fatGap };

    // 先使用本地規則生成基礎建議
    const localRecommendations = NUTRITION_RULES.getTrainingBasedRecommendations(trainingInfo, gaps);
    const localMeals = NUTRITION_RULES.getMealSuggestions(gaps, userGoalText);
    const localGaps = NUTRITION_RULES.getGapAlerts(gaps);

    // 判斷是否需要 AI 深度分析
    // 條件：有特殊需求、複雜情況、或本地建議不足
    const needsAI = 
      Math.abs(calorieGap) > 800 || // 熱量缺口過大
      Math.abs(proteinGap) > 50 || // 蛋白質缺口過大
      localMeals.length < 2 || // 本地餐點建議不足
      trainingInfo.intensity === 'high' && Math.abs(calorieGap) > 500; // 高強度訓練且缺口大

    // 如果不需要 AI，直接返回本地分析結果
    if (!needsAI && localRecommendations.length > 0) {
      return {
        recommendations: localRecommendations,
        mealSuggestions: localMeals,
        gaps: localGaps,
        trainingInfo,
        timestamp: new Date().toISOString(),
        source: 'local'
      };
    }

    // 需要 AI 深度分析時，構建 prompt
    const knowledgeContext = await getKnowledgeContextForQuery('營養 飲食 目標 過敏 禁忌');
    const prompt = `你是一位專業的營養師。請根據以下資訊提供個人化營養建議。

用戶資訊：
- 目標：${userGoalText}
- 今日訓練：${trainingInfo.hasTraining ? `${trainingInfo.type}，強度${trainingInfo.intensity === 'high' ? '高' : trainingInfo.intensity === 'moderate' ? '中' : '低'}，持續${trainingInfo.duration}分鐘，消耗約${trainingInfo.calories}大卡` : '無訓練'}
${knowledgeContext ? `${knowledgeContext}` : ''}

營養現況：
- 已攝取：${Math.round(currentCalories)}大卡（蛋白質${Math.round(currentProtein)}g，碳水${Math.round(currentCarbs)}g，脂肪${Math.round(currentFat)}g）
- 目標：${targetCalories}大卡（蛋白質${targetProtein}g，碳水${targetCarbs}g，脂肪${targetFat}g）
- 缺口：${Math.round(calorieGap)}大卡（蛋白質${Math.round(proteinGap)}g，碳水${Math.round(carbsGap)}g，脂肪${Math.round(fatGap)}g）

請提供：
1. 3-5條具體營養建議（每條30字內，繁體中文）
2. 2-3個符合台灣常見食物的餐點建議（包含具體食物名稱和份量，繁體中文）
3. 營養缺口提醒（如果某項營養素明顯不足）
若有上述歷史紀錄（如過敏、禁忌、特殊飲食需求），請在建議中避開並納入考量。

輸出格式（JSON）：
{
  "recommendations": ["建議1", "建議2", "建議3"],
  "mealSuggestions": [
    {
      "name": "餐點名稱",
      "description": "具體內容和份量",
      "calories": 數字,
      "protein": 數字,
      "carbs": 數字,
      "fat": 數字
    }
  ],
  "gaps": {
    "calorie": "缺口說明",
    "protein": "缺口說明",
    "carbs": "缺口說明",
    "fat": "缺口說明"
  }
}

IMPORTANT: Output ONLY raw JSON.`;

    const response = await runGemini(prompt, apiKey);
    const recommendation = parseLLMJson(response, { rootType: 'object' });

    return {
      ...recommendation,
      trainingInfo,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    handleError(error, { context: 'nutritionRecommendation', operation: 'generateNutritionRecommendation' });
    throw error;
  }
};
