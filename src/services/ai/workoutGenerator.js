/**
 * AI 訓練課表生成服務
 * 封裝 AI 生成單日和週課表的邏輯
 */

import { getApiKey } from '../apiKeyService';
import { getUserProfile } from '../userService';
import { getAIContext } from '../../utils/contextManager';
import { getHeadCoachPrompt, getWeeklySchedulerPrompt } from '../../utils/aiPrompts';
import { runGemini } from '../../utils/gemini';
import { formatDate, getWeekDates } from '../../utils/date';
import { cleanNumber } from '../../utils/number';
import { parseLLMJson } from '../../utils/aiJson';
import { handleError } from '../errorService';

/**
 * 生成單日訓練課表
 * @param {Object} params - 參數物件
 * @param {Date|string} params.selectedDate - 選擇的日期
 * @param {number} params.monthlyMileage - 本月跑量
 * @returns {Promise<Object>} 生成的訓練計畫物件，包含 type, title, advice, exercises, runDistance, runDuration, runPace, runHeartRate
 */
export const generateDailyWorkout = async ({ selectedDate, monthlyMileage }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'workoutGenerator', operation: 'generateDailyWorkout' });
    throw error;
  }

  try {
    const userProfile = (await getUserProfile()) || { goal: '健康' };
    const recentLogs = await getAIContext();
    const monthlyStats = { currentDist: monthlyMileage };
    const targetDateStr = formatDate(selectedDate);
    
    let prompt = getHeadCoachPrompt(userProfile, recentLogs, targetDateStr, monthlyStats);
    prompt += "\n\nIMPORTANT: Output ONLY raw JSON.";
    const response = await runGemini(prompt, apiKey);
    const plan = parseLLMJson(response, { rootType: 'object' });

    // 轉換為表單格式
    return {
      status: 'planned',
      type: plan.type === 'run' ? 'run' : 'strength',
      title: plan.title || '',
      notes: `[總教練建議]\n${plan.advice || ''}`,
      exercises: plan.exercises || [],
      runDistance: cleanNumber(plan.runDistance),
      runDuration: cleanNumber(plan.runDuration),
      runPace: plan.runPace || '',
      runHeartRate: plan.runHeartRate || '',
      runType: plan.runType || '',
      runIntervalSets: plan.runIntervalSets ? String(plan.runIntervalSets) : '',
      runIntervalRest: plan.runIntervalRest ? String(plan.runIntervalRest) : '',
      runIntervalPace: plan.runIntervalPace || '', // 每組配速
    };
  } catch (error) {
    handleError(error, { context: 'workoutGenerator', operation: 'generateDailyWorkout' });
    throw error;
  }
};

/**
 * 生成週訓練課表
 * @param {Object} params - 參數物件
 * @param {Date} params.currentDate - 當前日期
 * @param {Object} params.weeklyPrefs - 每日期望偏好，格式：{ 'YYYY-MM-DD': ['strength', 'run_easy'] }
 * @param {number} params.monthlyMileage - 本月跑量
 * @returns {Promise<Array>} 生成的訓練計畫陣列，每個項目包含 date, type, title, advice, exercises, runDistance, runDuration, runPace, runHeartRate
 */
export const generateWeeklyWorkout = async ({ currentDate, weeklyPrefs, monthlyMileage }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'workoutGenerator', operation: 'generateWeeklyWorkout' });
    throw error;
  }

  try {
    // 計算規劃日期
    const weekDates = getWeekDates(currentDate);
    const planningDates = weekDates.filter(d => {
      return weeklyPrefs[d] && weeklyPrefs[d].length > 0 && !weeklyPrefs[d].includes('rest');
    });

    if (planningDates.length === 0) {
      const error = new Error('本週無需規劃 (未選擇任何訓練)');
      handleError(error, { context: 'workoutGenerator', operation: 'generateWeeklyWorkout' });
      throw error;
    }

    const userProfile = (await getUserProfile()) || { goal: '健康' };
    const recentLogs = await getAIContext();
    const monthlyStats = { currentDist: monthlyMileage };

    let prompt = getWeeklySchedulerPrompt(userProfile, recentLogs, planningDates, weeklyPrefs, monthlyStats);
    prompt += "\n\nIMPORTANT: Output ONLY raw JSON Array.";
    const response = await runGemini(prompt, apiKey);
    const plans = parseLLMJson(response, { rootType: 'array' });

    // 轉換為標準格式
    return plans
      .filter(plan => plan.type !== 'rest')
      .map(plan => ({
        date: plan.date,
        status: 'planned',
        type: plan.type === 'run' ? 'run' : 'strength',
        title: plan.title || 'AI 訓練計畫',
        notes: `[總教練週計畫]\n${plan.advice || ''}`,
        exercises: plan.exercises || [],
        runDistance: cleanNumber(plan.runDistance),
        runDuration: cleanNumber(plan.runDuration),
        runPace: plan.runPace || '',
        runHeartRate: plan.runHeartRate || '',
        runType: plan.runType || '',
        runIntervalSets: plan.runIntervalSets ? String(plan.runIntervalSets) : '',
        runIntervalRest: plan.runIntervalRest ? String(plan.runIntervalRest) : '',
        runIntervalPace: plan.runIntervalPace || '', // 每組配速
        updatedAt: new Date().toISOString()
      }));
  } catch (error) {
    handleError(error, { context: 'workoutGenerator', operation: 'generateWeeklyWorkout' });
    throw error;
  }
};

/**
 * 訓練計劃模板類型
 */
export const PLAN_TYPES = {
  '5x5': {
    name: '5x5 力量訓練',
    description: '經典的力量訓練計劃，每週3次，每次5組5次',
    duration: '4-6 週',
    frequency: 3,
    focus: 'strength'
  },
  'push_pull_legs': {
    name: '推/拉/腿 (PPL)',
    description: '每週6次訓練，分為推、拉、腿三個循環',
    duration: '持續',
    frequency: 6,
    focus: 'hypertrophy'
  },
  'upper_lower': {
    name: '上下半身分離',
    description: '每週4次訓練，分為上半身和下半身',
    duration: '持續',
    frequency: 4,
    focus: 'balanced'
  },
  'full_body': {
    name: '全身訓練',
    description: '每週3次，每次訓練全身肌群',
    duration: '持續',
    frequency: 3,
    focus: 'general'
  },
  'running_beginner': {
    name: '跑步新手計劃',
    description: '適合初學者的跑步計劃，逐步增加距離',
    duration: '8-12 週',
    frequency: 3,
    focus: 'endurance'
  },
  'running_5k': {
    name: '5K 訓練計劃',
    description: '針對5公里跑步的訓練計劃',
    duration: '8-10 週',
    frequency: 4,
    focus: 'speed'
  },
  // 跑步進階：半馬 / 全馬完賽目標
  'running_half_marathon_finish': {
    name: '半馬完賽訓練計劃',
    description: '針對半程馬拉松 (21km) 的完賽訓練計劃，循序漸進提升耐力與配速',
    duration: '10-12 週',
    frequency: 4,
    focus: 'endurance',
    raceGoalDescription: '在安全前提下完成半程馬拉松 (21km) 比賽'
  },
  'running_full_marathon_finish': {
    name: '全馬完賽訓練計劃',
    description: '針對全程馬拉松 (42km) 的完賽訓練計劃，強調週期化累積跑量與恢復',
    duration: '12-16 週',
    frequency: 4,
    focus: 'endurance',
    raceGoalDescription: '在安全前提下完成全程馬拉松 (42km) 比賽'
  },
  // 跑步進階：半馬 / 全馬 破 PB 目標
  'running_half_marathon_pb': {
    name: '半馬破 PB 訓練計劃',
    description: '針對半馬成績提升的強化訓練計劃，重點放在配速與乳酸門檻訓練',
    duration: '10-12 週',
    frequency: 4,
    focus: 'speed',
    raceGoalDescription: '在指定賽事中突破過去半馬最佳成績 (PB)'
  },
  'running_full_marathon_pb': {
    name: '全馬破 PB 訓練計劃',
    description: '針對全馬成績提升的強化訓練計劃，結合馬拉松配速長跑與節奏跑',
    duration: '12-16 週',
    frequency: 5,
    focus: 'speed',
    raceGoalDescription: '在指定賽事中突破過去全馬最佳成績 (PB)'
  }
};

/**
 * 生成訓練計劃推薦
 * @param {Object} params - 參數物件
 * @param {string} [params.planType] - 計劃類型（可選，如果不提供則基於用戶資料推薦）
 * @param {number} [params.weeks] - 計劃週數，預設4週
 * @param {string} [params.targetPB] - 目標 PB（例如：1:45:00），僅對「破 PB」類型有效
 * @param {string} [params.targetRaceDate] - 目標賽事日期（YYYY-MM-DD），僅對「破 PB」類型有效
 * @returns {Promise<Object>} 訓練計劃物件
 */
export const generateTrainingPlan = async ({ planType = null, weeks = 4, targetPB = null, targetRaceDate = null }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'workoutGenerator', operation: 'generateTrainingPlan' });
    throw error;
  }

  try {
    const userProfile = (await getUserProfile()) || { goal: '健康' };
    const recentLogs = await getAIContext();

    // 如果沒有指定計劃類型，基於用戶資料推薦
    if (!planType) {
      planType = recommendPlanType(userProfile, recentLogs);
    }

    const planTemplate = PLAN_TYPES[planType];
    if (!planTemplate) {
      throw new Error(`未知的訓練計劃類型: ${planType}`);
    }

    // 生成計劃提示詞
    const prompt = generatePlanPrompt(userProfile, recentLogs, planType, planTemplate, weeks, {
      targetPB,
      targetRaceDate
    });
    const response = await runGemini(prompt, apiKey);
    const planData = parseLLMJson(response, { rootType: 'object' });

    // 後處理：確保 workouts 是結構化數據，清理可能的文字說明
    const processedWorkouts = (planData.workouts || []).map(workout => {
      // 如果 title 或 notes 太長（可能是文字說明），截斷
      const processed = { ...workout };
      if (processed.title && processed.title.length > 20) {
        processed.title = processed.title.substring(0, 20);
      }
      if (processed.notes && processed.notes.length > 100) {
        processed.notes = processed.notes.substring(0, 100);
      }
      
      // 確保跑步訓練有必要的數值欄位
      if (processed.type === 'run') {
        if (!processed.runDistance && !processed.runDuration) {
          // 如果沒有數據，嘗試從 notes 或 title 提取（備用方案）
          console.warn('跑步訓練缺少距離/時間數據:', processed);
        }
      }
      
      // 確保力量訓練有 exercises
      if (processed.type === 'strength' && (!processed.exercises || processed.exercises.length === 0)) {
        console.warn('力量訓練缺少 exercises:', processed);
      }
      
      return processed;
    });

    // 限制 tips 長度和數量
    const processedTips = (planData.tips || [])
      .slice(0, 5) // 最多 5 條
      .map(tip => tip.length > 30 ? tip.substring(0, 30) : tip);

    return {
      type: planType,
      name: planTemplate.name,
      description: planTemplate.description,
      duration: planTemplate.duration,
      weeks: weeks,
      workouts: processedWorkouts,
      schedule: planData.schedule || [],
      tips: processedTips
    };
  } catch (error) {
    handleError(error, { context: 'workoutGenerator', operation: 'generateTrainingPlan' });
    throw error;
  }
};

/**
 * 基於用戶資料推薦訓練計劃類型
 * @param {Object} userProfile - 用戶資料
 * @param {Object} recentLogs - 最近訓練記錄
 * @returns {string} 推薦的計劃類型
 */
const recommendPlanType = (userProfile, recentLogs) => {
  const goal = userProfile.goal?.toLowerCase() || '';
  const experience = userProfile.experience?.toLowerCase() || 'beginner';

  // 根據目標推薦
  if (goal.includes('半馬') || goal.includes('half')) {
    return 'running_half_marathon_finish';
  }
  if (goal.includes('全馬') || goal.includes('馬拉松') || goal.includes('full')) {
    return 'running_full_marathon_finish';
  }
  if (goal.includes('力量') || goal.includes('strength')) {
    return experience === 'beginner' ? '5x5' : 'push_pull_legs';
  }
  if (goal.includes('跑步') || goal.includes('running') || goal.includes('跑')) {
    return experience === 'beginner' ? 'running_beginner' : 'running_5k';
  }
  if (goal.includes('增肌') || goal.includes('muscle')) {
    return 'push_pull_legs';
  }
  if (goal.includes('減脂') || goal.includes('weight')) {
    return 'upper_lower';
  }

  // 預設推薦
  return experience === 'beginner' ? 'full_body' : 'upper_lower';
};

/**
 * 生成訓練計劃提示詞（精簡版，加速生成）
 * @param {Object} userProfile - 用戶資料
 * @param {Object} recentLogs - 最近訓練記錄
 * @param {string} planType - 計劃類型
 * @param {Object} planTemplate - 計劃模板
 * @param {number} weeks - 週數
 * @param {Object} [options] - 額外選項（例如破 PB 目標）
 * @param {string} [options.targetPB] - 目標 PB（字串，如 3:30:00）
 * @param {string} [options.targetRaceDate] - 目標賽事日期（YYYY-MM-DD）
 * @returns {string} 提示詞
 */
const generatePlanPrompt = (userProfile, recentLogs, planType, planTemplate, weeks, options = {}) => {
  const { targetPB, targetRaceDate } = options;
  
  // 壓縮用戶資料（只保留關鍵資訊）
  const userInfo = `目標:${userProfile.goal || '健康'},經驗:${userProfile.experience || '初學者'},年齡:${userProfile.age || '未知'}`;
  
  // 壓縮最近訓練記錄（只保留摘要）
  let recentSummary = '';
  if (recentLogs && typeof recentLogs === 'string') {
    // 如果 recentLogs 是字串，只取前 200 字
    recentSummary = recentLogs.substring(0, 200);
  } else if (recentLogs) {
    recentSummary = '已有訓練記錄';
  }

  // 構建目標資訊
  let goalInfo = '';
  if (planTemplate.raceGoalDescription) {
    goalInfo += `目標:${planTemplate.raceGoalDescription}`;
  }
  const isPBPlan = planType === 'running_half_marathon_pb' || planType === 'running_full_marathon_pb';
  if (isPBPlan) {
    if (targetPB) goalInfo += `,目標PB:${targetPB}`;
    if (targetRaceDate) goalInfo += `,賽事日期:${targetRaceDate}`;
  }

  return `生成${weeks}週「${planTemplate.name}」訓練計劃。

用戶:${userInfo}${recentSummary ? `,近期:${recentSummary}` : ''}
要求:每週${planTemplate.frequency}次${goalInfo ? `,${goalInfo}` : ''}

輸出結構化課表數據（非文字說明）：
- workouts: 每週每天具體訓練數據
  * 力量訓練: 必須有 exercises 陣列，每個動作包含 name, sets, reps, weight, rest
  * 跑步訓練: 必須有 runDistance(km), runDuration(分鐘), runPace(格式如"5:30/km"), runHeartRate
  * title: 簡短標題（10字內）
  * notes: 訓練重點（1-2句，非長篇說明）
- tips: 3-5條簡短建議（每條20字內）

JSON格式:
{
  "workouts": [
    {
      "week": 1,
      "day": 1,
      "type": "strength",
      "title": "胸背訓練",
      "exercises": [{"name": "深蹲", "sets": 5, "reps": 5, "weight": "80kg", "rest": "90秒"}],
      "notes": "注意動作標準"
    },
    {
      "week": 1,
      "day": 2,
      "type": "run",
      "title": "輕鬆跑",
      "runDistance": 8,
      "runDuration": 45,
      "runPace": "5:30/km",
      "runHeartRate": 140,
      "notes": "Zone 2 心率區間"
    }
  ],
  "tips": ["建議1", "建議2"]
}

重要: 只輸出 JSON，不要文字說明。workouts 必須是具體數據，不是描述性文字。`;
};