import { getApiKey } from '../config/apiKeyService';
import { runGeminiWithTools } from '../../utils/gemini';
import { handleError } from '../errorService';
import { buildCoachPrompt } from './prompts/coachPrompts';
import { listCalendarWorkoutsByDateRange } from '../calendarService';
import { calculateStats } from '../../utils/statsCalculator';

const GET_TRAINING_STATS_DECLARATION = {
  name: 'get_training_stats',
  description:
    '查詢使用者在指定日期範圍內的訓練統計（週跑量、平均心率、總訓練時間、跑步次數、平均配速等）',
  parameters: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: '起始日期，格式 YYYY-MM-DD',
      },
      end_date: {
        type: 'string',
        description: '結束日期，格式 YYYY-MM-DD',
      },
      field: {
        type: 'string',
        enum: [
          'avg_heart_rate',
          'total_distance',
          'total_duration',
          'run_count',
          'avg_pace_min_per_km',
        ],
        description:
          '要查詢的統計欄位：avg_heart_rate(平均心率bpm)、total_distance(總跑量km)、total_duration(總訓練時間min)、run_count(跑步次數)、avg_pace_min_per_km(平均配速min/km)',
      },
    },
    required: ['start_date', 'end_date', 'field'],
  },
};

const TOOLS = [{ functionDeclarations: [GET_TRAINING_STATS_DECLARATION] }];

/**
 * 送出教練訊息，回傳模型回覆文字（支援 Function Calling）
 * @param {Object} params
 * @param {string} params.userMessage
 * @param {string} [params.userContext]
 * @param {string} [params.knowledgeContext]
 * @param {string} [params.conversationContext] - 歷史對話摘要或近期對話（rag-p3-3）
 * @returns {Promise<string>}
 */
export const sendCoachMessage = async ({ userMessage, userContext, knowledgeContext, conversationContext }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('請先設定 API Key');
    handleError(err, { context: 'coachService', operation: 'sendCoachMessage' });
    throw err;
  }

  const prompt = buildCoachPrompt({ userMessage, userContext, knowledgeContext, conversationContext });
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  const executeTool = async (name, args) => {
    if (name !== 'get_training_stats') {
      return { error: `未知工具: ${name}` };
    }
    const { start_date, end_date, field } = args;
    if (!start_date || !end_date || !field) {
      return { error: '缺少必要參數 start_date, end_date, field' };
    }
    try {
      const workouts = await listCalendarWorkoutsByDateRange(start_date, end_date);
      const value = calculateStats(workouts, start_date, end_date, field);
      if (value == null) {
        return { field, value: null, message: '該期間無符合的跑步紀錄' };
      }
      return { field, value, unit: getUnitForField(field) };
    } catch (e) {
      return { error: e.message || '查詢失敗' };
    }
  };

  try {
    return await runGeminiWithTools(contents, TOOLS, executeTool, apiKey);
  } catch (error) {
    handleError(error, { context: 'coachService', operation: 'sendCoachMessage' });
    throw error;
  }
};

function getUnitForField(field) {
  const units = {
    avg_heart_rate: 'bpm',
    total_distance: 'km',
    total_duration: 'min',
    run_count: '次',
    avg_pace_min_per_km: 'min/km',
  };
  return units[field] ?? '';
}

