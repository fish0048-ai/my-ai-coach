import { getApiKey } from '../config/apiKeyService';
import { runGemini } from '../../utils/gemini';
import { handleError } from '../errorService';
import { buildCoachPrompt } from './prompts/coachPrompts';

/**
 * 送出教練訊息，回傳模型回覆文字
 * @param {Object} params
 * @param {string} params.userMessage
 * @param {string} [params.userContext]
 * @param {string} [params.knowledgeContext]
 * @returns {Promise<string>}
 */
export const sendCoachMessage = async ({ userMessage, userContext, knowledgeContext }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('請先設定 API Key');
    handleError(err, { context: 'coachService', operation: 'sendCoachMessage' });
    throw err;
  }

  const prompt = buildCoachPrompt({ userMessage, userContext, knowledgeContext });

  try {
    const response = await runGemini(prompt, apiKey);
    return response;
  } catch (error) {
    handleError(error, { context: 'coachService', operation: 'sendCoachMessage' });
    throw error;
  }
};

