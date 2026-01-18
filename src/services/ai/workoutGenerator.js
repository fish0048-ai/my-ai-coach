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
