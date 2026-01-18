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
    
    // 清理 JSON 回應
    let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIndex = cleanJson.indexOf('{');
    const endIndex = cleanJson.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleanJson = cleanJson.substring(startIndex, endIndex + 1);
    }
    
    const plan = JSON.parse(cleanJson);

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
    
    // 清理 JSON 回應
    let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIndex = cleanJson.indexOf('[');
    const endIndex = cleanJson.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1) {
      cleanJson = cleanJson.substring(startIndex, endIndex + 1);
    }

    const plans = JSON.parse(cleanJson);

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
        updatedAt: new Date().toISOString()
      }));
  } catch (error) {
    handleError(error, { context: 'workoutGenerator', operation: 'generateWeeklyWorkout' });
    throw error;
  }
};

/**
 * 训练计划模板类型
 */
export const PLAN_TYPES = {
  '5x5': {
    name: '5x5 力量训练',
    description: '经典的力量训练计划，每周3次，每次5组5次',
    duration: '4-6 周',
    frequency: 3,
    focus: 'strength'
  },
  'push_pull_legs': {
    name: '推/拉/腿 (PPL)',
    description: '每周6次训练，分为推、拉、腿三个循环',
    duration: '持续',
    frequency: 6,
    focus: 'hypertrophy'
  },
  'upper_lower': {
    name: '上下半身分离',
    description: '每周4次训练，分为上半身和下半身',
    duration: '持续',
    frequency: 4,
    focus: 'balanced'
  },
  'full_body': {
    name: '全身训练',
    description: '每周3次，每次训练全身肌群',
    duration: '持续',
    frequency: 3,
    focus: 'general'
  },
  'running_beginner': {
    name: '跑步新手计划',
    description: '适合初学者的跑步计划，逐步增加距离',
    duration: '8-12 周',
    frequency: 3,
    focus: 'endurance'
  },
  'running_5k': {
    name: '5K 训练计划',
    description: '针对5公里跑步的训练计划',
    duration: '8-10 周',
    frequency: 4,
    focus: 'speed'
  }
};

/**
 * 生成训练计划推荐
 * @param {Object} params - 参数对象
 * @param {string} [params.planType] - 计划类型（可选，如果不提供则基于用户数据推荐）
 * @param {number} [params.weeks] - 计划周数，默认4周
 * @returns {Promise<Object>} 训练计划对象
 */
export const generateTrainingPlan = async ({ planType = null, weeks = 4 }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'workoutGenerator', operation: 'generateTrainingPlan' });
    throw error;
  }

  try {
    const userProfile = (await getUserProfile()) || { goal: '健康' };
    const recentLogs = await getAIContext();

    // 如果没有指定计划类型，基于用户数据推荐
    if (!planType) {
      planType = recommendPlanType(userProfile, recentLogs);
    }

    const planTemplate = PLAN_TYPES[planType];
    if (!planTemplate) {
      throw new Error(`未知的训练计划类型: ${planType}`);
    }

    // 生成计划提示词
    const prompt = generatePlanPrompt(userProfile, recentLogs, planType, planTemplate, weeks);
    const response = await runGemini(prompt, apiKey);

    // 清理 JSON 回应
    let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIndex = cleanJson.indexOf('{');
    const endIndex = cleanJson.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleanJson = cleanJson.substring(startIndex, endIndex + 1);
    }

    const planData = JSON.parse(cleanJson);

    return {
      type: planType,
      name: planTemplate.name,
      description: planTemplate.description,
      duration: planTemplate.duration,
      weeks: weeks,
      workouts: planData.workouts || [],
      schedule: planData.schedule || [],
      tips: planData.tips || []
    };
  } catch (error) {
    handleError(error, { context: 'workoutGenerator', operation: 'generateTrainingPlan' });
    throw error;
  }
};

/**
 * 基于用户数据推荐训练计划类型
 * @param {Object} userProfile - 用户资料
 * @param {Object} recentLogs - 最近训练记录
 * @returns {string} 推荐的计划类型
 */
const recommendPlanType = (userProfile, recentLogs) => {
  const goal = userProfile.goal?.toLowerCase() || '';
  const experience = userProfile.experience?.toLowerCase() || 'beginner';

  // 根据目标推荐
  if (goal.includes('力量') || goal.includes('strength')) {
    return experience === 'beginner' ? '5x5' : 'push_pull_legs';
  }
  if (goal.includes('跑步') || goal.includes('running') || goal.includes('跑')) {
    return experience === 'beginner' ? 'running_beginner' : 'running_5k';
  }
  if (goal.includes('增肌') || goal.includes('muscle')) {
    return 'push_pull_legs';
  }
  if (goal.includes('减脂') || goal.includes('weight')) {
    return 'upper_lower';
  }

  // 默认推荐
  return experience === 'beginner' ? 'full_body' : 'upper_lower';
};

/**
 * 生成训练计划提示词
 * @param {Object} userProfile - 用户资料
 * @param {Object} recentLogs - 最近训练记录
 * @param {string} planType - 计划类型
 * @param {Object} planTemplate - 计划模板
 * @param {number} weeks - 周数
 * @returns {string} 提示词
 */
const generatePlanPrompt = (userProfile, recentLogs, planType, planTemplate, weeks) => {
  return `你是一位专业的健身教练。请为用户生成一个${weeks}周的"${planTemplate.name}"训练计划。

用户信息：
- 目标：${userProfile.goal || '健康'}
- 经验：${userProfile.experience || '初学者'}
- 年龄：${userProfile.age || '未知'}
- 性别：${userProfile.gender || '未知'}

计划要求：
- 类型：${planTemplate.name}
- 描述：${planTemplate.description}
- 频率：每周${planTemplate.frequency}次
- 持续时间：${weeks}周

请生成一个详细的训练计划，包括：
1. 每周的训练安排（日期、训练类型、动作、组数、次数）
2. 渐进式增加强度
3. 休息日安排
4. 训练建议和注意事项

输出格式（JSON）：
{
  "workouts": [
    {
      "week": 1,
      "day": 1,
      "type": "strength",
      "title": "训练标题",
      "exercises": [
        {"name": "动作名称", "sets": 5, "reps": 5, "weight": "建议重量", "rest": "90秒"}
      ],
      "notes": "训练说明"
    }
  ],
  "schedule": [
    {"week": 1, "days": ["周一", "周三", "周五"]}
  ],
  "tips": ["建议1", "建议2"]
}

IMPORTANT: Output ONLY raw JSON.`;
};