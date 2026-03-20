/**
 * AI 訓練課表生成服務
 * 封裝 AI 生成單日和週課表的邏輯
 */

import { z } from 'zod';
import { getApiKey } from '../config/apiKeyService';
import { getUserProfile } from '../userService';
import { getAIContext } from '../../utils/contextManager';
import { getHeadCoachPrompt, getWeeklySchedulerPrompt } from '../../utils/aiPrompts';
import { runGeminiJsonValidated } from '../../utils/gemini';
import { formatDate, getWeekDates } from '../../utils/date';
import { cleanNumber } from '../../utils/number';
import { handleError } from '../core/errorService';
import { fetchWorkoutsByDateRange } from '../../api/workouts';
import { getKnowledgeContextForQuery } from './knowledgeBaseService';

/** 將 LLM 常用別名對齊為 distance(km)、duration(min)、calories(kcal) */
export const normalizeAiWorkoutPayload = (raw) => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const o = { ...raw };
  if (o.distance == null && o.runDistance != null) o.distance = o.runDistance;
  if (o.duration == null && o.runDuration != null) o.duration = o.runDuration;
  if (o.calories == null && o.caloriesBurned != null) o.calories = o.caloriesBurned;
  return o;
};

const nonNegMetricNumber = z.preprocess((v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}, z.number().min(0));

const workoutTypeEnum = z.enum(['run', 'strength', 'rest', 'analysis']);

const runTypeMetricsRefine = (data, ctx) => {
  if (data.type === 'run') {
    const dist = Number(data.distance) || 0;
    const dur = Number(data.duration) || 0;
    if (dist <= 0 && dur <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'type 為 run 時，distance(km) 與 duration(min) 至少一項須大於 0',
        path: ['distance'],
      });
    }
  }
};

/**
 * 單日總教練 JSON 之 Zod 防護（distance:km, duration:min, calories:kcal + type 列舉）
 * 亦接受 runDistance / runDuration，於 preprocess 合併。
 */
export const workoutPlanSchema = z.preprocess(
  normalizeAiWorkoutPayload,
  z
    .object({
      type: workoutTypeEnum,
      distance: nonNegMetricNumber,
      duration: nonNegMetricNumber,
      calories: nonNegMetricNumber,
    })
    .passthrough()
    .superRefine(runTypeMetricsRefine),
);

/** 週課表陣列單筆 */
export const weeklyWorkoutPlanItemSchema = z.preprocess(
  normalizeAiWorkoutPayload,
  z
    .object({
      type: workoutTypeEnum,
      date: z.string().optional(),
      distance: nonNegMetricNumber,
      duration: nonNegMetricNumber,
      calories: nonNegMetricNumber,
    })
    .passthrough()
    .superRefine(runTypeMetricsRefine),
);

export const weeklyWorkoutPlanArraySchema = z.array(weeklyWorkoutPlanItemSchema);

/** 訓練計劃推薦 root */
export const trainingPlanWorkoutItemSchema = z.preprocess(
  normalizeAiWorkoutPayload,
  z
    .object({
      type: workoutTypeEnum,
      week: z.preprocess((v) => (v === undefined || v === null ? undefined : v), z.coerce.number().optional()),
      day: z.preprocess((v) => (v === undefined || v === null ? undefined : v), z.coerce.number().optional()),
      distance: nonNegMetricNumber,
      duration: nonNegMetricNumber,
      calories: nonNegMetricNumber,
    })
    .passthrough()
    .superRefine(runTypeMetricsRefine),
);

export const trainingPlanResponseSchema = z
  .object({
    workouts: z.array(trainingPlanWorkoutItemSchema),
    tips: z.array(z.preprocess((v) => (v == null ? '' : String(v)), z.string())).optional(),
  })
  .passthrough();

/**
 * 生成單日訓練課表
 * @param {Object} params - 參數物件
 * @param {Date|string} params.selectedDate - 選擇的日期
 * @param {number} params.monthlyMileage - 本月跑量
 * @param {string} [params.preferredRunType] - 偏好的跑步類型 (Easy/Interval/LSD/MP)，可選
 * @returns {Promise<Object>} 生成的訓練計畫物件，包含 type, title, advice, exercises, runDistance, runDuration, runPace, runHeartRate
 */
export const generateDailyWorkout = async ({ selectedDate, monthlyMileage, preferredRunType = null }) => {
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
    const knowledgeContext = await getKnowledgeContextForQuery('訓練 課表 恢復 傷痛 目標');
    
    let prompt = getHeadCoachPrompt(userProfile, recentLogs, targetDateStr, monthlyStats, preferredRunType, knowledgeContext);
    prompt += "\n\nIMPORTANT: Output ONLY raw JSON.";
    const plan = await runGeminiJsonValidated(prompt, apiKey, {
      schema: workoutPlanSchema,
      rootType: 'object',
      maxRetries: 2,
    });

    // 轉換為表單格式
    return {
      status: 'planned',
      type: plan.type === 'run' ? 'run' : 'strength',
      title: plan.title || '',
      notes: `[總教練建議]\n${plan.advice || ''}`,
      exercises: plan.exercises || [],
      runDistance: cleanNumber(plan.runDistance ?? plan.distance),
      runDuration: cleanNumber(plan.runDuration ?? plan.duration),
      runPace: plan.runPace || '',
      runHeartRate: plan.runHeartRate || '',
      runType: plan.runType || '',
      runIntervalSets: plan.runIntervalSets ? String(plan.runIntervalSets) : '',
      runIntervalPace: plan.runIntervalPace || '', // 每組配速
      runIntervalDuration: plan.runIntervalDuration ? String(plan.runIntervalDuration) : '', // 維持時間（秒）
      runIntervalRest: plan.runIntervalRest ? String(plan.runIntervalRest) : '', // 休息時間（秒）
      runIntervalPower: plan.runIntervalPower ? String(plan.runIntervalPower) : '', // 間歇功率
      caloriesBurned: cleanNumber(plan.calories),
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

    // 查詢本週已完成的訓練
    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];
    const weekWorkouts = await fetchWorkoutsByDateRange(weekStart, weekEnd);
    const completedThisWeek = weekWorkouts.filter(w => (w.status || 'completed') === 'completed');

    // 查詢最近 30 天的訓練（用於整體評估）
    const now = new Date();
    const todayStr = formatDate(now);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);
    const recent30DaysWorkouts = await fetchWorkoutsByDateRange(thirtyDaysAgoStr, todayStr);
    const completed30Days = recent30DaysWorkouts.filter(w => (w.status || 'completed') === 'completed');

    // 計算最近 30 天的統計
    let totalRunDist = 0;
    let totalRunCount = 0;
    let totalStrengthCount = 0;
    let totalWorkouts = 0;
    const runTypes = { LSD: 0, Interval: 0, Easy: 0, MP: 0 };
    const weeklyRunDist = [0, 0, 0, 0]; // 最近 4 週的跑量

    // 計算本週起始日（週一）用於計算週跑量
    const day = now.getDay() || 7;
    const weekStartDate = new Date(now);
    weekStartDate.setDate(now.getDate() - day + 1);
    weekStartDate.setHours(0, 0, 0, 0);

    completed30Days.forEach(w => {
      if (w.type === 'run' && w.runDistance) {
        const dist = parseFloat(w.runDistance) || 0;
        totalRunDist += dist;
        totalRunCount++;
        const runType = w.runType || '';
        if (runType in runTypes) runTypes[runType]++;
        
        // 計算週跑量（以週一為起始）
        if (w.date) {
          const workoutDate = new Date(w.date + 'T00:00:00');
          const daysDiff = Math.floor((workoutDate - weekStartDate) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysDiff / 7);
          // weekIndex: 0=本週, 1=上週, 2=上上週, 3=上上上週
          if (weekIndex >= 0 && weekIndex < 4) {
            weeklyRunDist[weekIndex] += dist;
          }
        }
      } else if (w.type === 'strength') {
        totalStrengthCount++;
      }
      totalWorkouts++;
    });

    // 格式化本週已完成的訓練資訊
    const completedSummary = completedThisWeek.map(w => {
      const date = w.date || '';
      if (w.type === 'run') {
        return `${date}: ${w.title || '跑步'} - ${w.runDistance || 0}km @ ${w.runPace || ''} (${w.runType || ''})`;
      } else if (w.type === 'strength') {
        const exerciseCount = Array.isArray(w.exercises) ? w.exercises.length : 0;
        return `${date}: ${w.title || '重訓'} - ${exerciseCount}個動作`;
      }
      return `${date}: ${w.title || '訓練'}`;
    }).join('\n');

    // 格式化最近 30 天統計摘要
    const recent30DaysSummary = {
      totalWorkouts,
      totalRunDist: totalRunDist.toFixed(1),
      totalRunCount,
      totalStrengthCount,
      avgWeeklyRunDist: (totalRunDist / 4).toFixed(1),
      runTypeDistribution: Object.entries(runTypes)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `${type}:${count}次`)
        .join(', ') || '無',
      weeklyRunDist: weeklyRunDist.map((dist, i) => `第${4-i}週:${dist.toFixed(1)}km`).join(', ')
    };

    const userProfile = (await getUserProfile()) || { goal: '健康' };
    const recentLogs = await getAIContext();
    const monthlyStats = { currentDist: monthlyMileage };
    const knowledgeContext = await getKnowledgeContextForQuery('本週課表 跑量 重訓 恢復 傷痛');

    let prompt = getWeeklySchedulerPrompt(userProfile, recentLogs, planningDates, weeklyPrefs, monthlyStats, completedSummary, recent30DaysSummary, knowledgeContext);
    prompt += "\n\nIMPORTANT: Output ONLY raw JSON Array.";
    const plans = await runGeminiJsonValidated(prompt, apiKey, {
      schema: weeklyWorkoutPlanArraySchema,
      rootType: 'array',
      maxRetries: 2,
    });

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
        runDistance: cleanNumber(plan.runDistance ?? plan.distance),
        runDuration: cleanNumber(plan.runDuration ?? plan.duration),
        runPace: plan.runPace || '',
        runHeartRate: plan.runHeartRate || '',
        runType: plan.runType || '',
        runIntervalSets: plan.runIntervalSets ? String(plan.runIntervalSets) : '',
        runIntervalRest: plan.runIntervalRest ? String(plan.runIntervalRest) : '',
        runIntervalPace: plan.runIntervalPace || '', // 每組配速
        runIntervalPower: plan.runIntervalPower ? String(plan.runIntervalPower) : '', // 間歇功率
        caloriesBurned: cleanNumber(plan.calories),
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

    const knowledgeContext = await getKnowledgeContextForQuery('訓練 課表 目標 賽事 傷痛');
    const prompt = generatePlanPrompt(userProfile, recentLogs, planType, planTemplate, weeks, {
      targetPB,
      targetRaceDate
    }, knowledgeContext);
    const planData = await runGeminiJsonValidated(prompt, apiKey, {
      schema: trainingPlanResponseSchema,
      rootType: 'object',
      maxRetries: 2,
    });

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
      
      // 確保跑步訓練有必要的數值欄位（Zod 已要求 distance/duration；此處相容舊欄位名）
      if (processed.type === 'run') {
        const dist = processed.runDistance ?? processed.distance;
        const dur = processed.runDuration ?? processed.duration;
        if (!dist && !dur) {
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
 * @param {string} [knowledgeContext] - 個人知識庫檢索結果
 * @returns {string} 提示詞
 */
const generatePlanPrompt = (userProfile, recentLogs, planType, planTemplate, weeks, options = {}, knowledgeContext = '') => {
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
${knowledgeContext ? `${knowledgeContext}` : ''}

輸出結構化課表數據（非文字說明）：
- workouts: 每週每天具體訓練數據
  * 每一筆**必須**含 type: "run"|"strength"|"rest"|"analysis"，以及數字欄位 distance(公里 km)、duration(分鐘 min)、calories(大卡 kcal)；力量／休息日可填 0；跑步至少 distance 或 duration 一項 >0。可併用 runDistance/runDuration 對齊 distance/duration。
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
      "distance": 0,
      "duration": 55,
      "calories": 280,
      "title": "胸背訓練",
      "exercises": [{"name": "深蹲", "sets": 5, "reps": 5, "weight": "80kg", "rest": "90秒"}],
      "notes": "注意動作標準"
    },
    {
      "week": 1,
      "day": 2,
      "type": "run",
      "distance": 8,
      "duration": 45,
      "calories": 420,
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