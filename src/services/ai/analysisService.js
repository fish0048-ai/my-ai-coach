import { getApiKey } from '../apiKeyService';
import { runGemini } from '../../utils/gemini';
import { handleError } from '../errorService';
import { MOVEMENT_ANALYSIS_RULES } from './localAnalysisRules';

/**
 * 產生重訓動作 AI 分析建議
 * 先跑本地規則，再視需要呼叫 Gemini。
 *
 * @param {Object} params
 * @param {'bench'|'squat'} params.mode
 * @param {number} params.score
 * @param {Object} params.metrics
 * @returns {Promise<string>}
 */
export const generateStrengthAnalysisFeedback = async ({ mode, score, metrics }) => {
  // 先使用本地規則生成基礎反饋
  const localFeedback = MOVEMENT_ANALYSIS_RULES.getLocalFeedback(score, metrics, mode);

  if (!localFeedback.needsAI && localFeedback.feedback) {
    return localFeedback.feedback;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'analysisService', operation: 'generateStrengthAnalysisFeedback' });
    throw error;
  }

  const prompt = `
      角色：專業肌力與體能教練 (CSCS)。
      任務：分析以下「${mode === 'bench' ? '臥推' : '深蹲'}」資料。
      評分：${score} 分。
      資料：${JSON.stringify(metrics)}
      
      請給出評分理由與 3-5 條具體優化建議，200 字內，繁體中文。
    `;

  try {
    const response = await runGemini(prompt, apiKey);
    return response;
  } catch (error) {
    handleError(error, { context: 'analysisService', operation: 'generateStrengthAnalysisFeedback' });
    throw error;
  }
};

/**
 * 產生跑姿 AI 分析建議
 *
 * @param {Object} params
 * @param {number} params.score
 * @param {Object} params.metrics
 * @returns {Promise<string>}
 */
export const generateRunAnalysisFeedback = async ({ score, metrics }) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'analysisService', operation: 'generateRunAnalysisFeedback' });
    throw error;
  }

  const prompt = `
      角色：專業生物力學分析師。
      任務：跑姿評分與診斷。
      綜合評分：${score} 分。
      數據：${JSON.stringify(metrics)}
      
      請依據評分給予鼓勵或警告，並針對低分項目提供 2-3 個修正訓練 (Drill)，以條列方式輸出，300 字內，繁體中文。
    `;

  try {
    const response = await runGemini(prompt, apiKey);
    return response;
  } catch (error) {
    handleError(error, { context: 'analysisService', operation: 'generateRunAnalysisFeedback' });
    throw error;
  }
};

