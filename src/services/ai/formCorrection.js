/**
 * 動作糾正助手服務
 * 分析動作偏差，提供具體糾正建議和訓練計劃
 */

import { getApiKey } from '../apiKeyService';
import { runGemini } from '../../utils/gemini';
import { handleError } from '../errorService';
import { FORM_CORRECTION_RULES } from './localAnalysisRules';

/**
 * 標準動作角度範圍（根據運動科學研究）
 */
const STANDARD_ANGLES = {
  bench: {
    elbowAngle: { min: 75, max: 90, ideal: 82 }, // 臥推時手肘角度
    barPath: { max: 2.0 } // 槓鈴軌跡偏移（cm）
  },
  squat: {
    kneeAngle: { min: 80, max: 100, ideal: 90 }, // 深蹲時膝蓋角度
    hipDepth: 'low' // 髖關節深度
  }
};

/**
 * 計算角度偏差
 * @param {number} currentAngle - 當前角度
 * @param {Object} standard - 標準角度範圍 {min, max, ideal}
 * @returns {Object} 偏差資訊 {deviation, severity, direction}
 */
const calculateAngleDeviation = (currentAngle, standard) => {
  if (!standard || !currentAngle) return null;

  const { min, max, ideal } = standard;
  let deviation = 0;
  let direction = 'normal';
  let severity = 'none';

  if (currentAngle < min) {
    deviation = min - currentAngle;
    direction = 'too_small';
    severity = deviation > 15 ? 'severe' : deviation > 8 ? 'moderate' : 'mild';
  } else if (currentAngle > max) {
    deviation = currentAngle - max;
    direction = 'too_large';
    severity = deviation > 15 ? 'severe' : deviation > 8 ? 'moderate' : 'mild';
  } else {
    deviation = Math.abs(currentAngle - ideal);
    direction = 'normal';
    severity = deviation > 5 ? 'mild' : 'none';
  }

  return { deviation, severity, direction, currentAngle, ideal };
};

/**
 * 分析動作偏差
 * @param {Object} metrics - 動作指標
 * @param {string} mode - 動作模式 ('bench' | 'squat')
 * @returns {Object} 偏差分析結果
 */
export const analyzeFormDeviations = (metrics, mode) => {
  if (!metrics || !mode) return null;

  const standard = STANDARD_ANGLES[mode];
  if (!standard) return null;

  const deviations = {};

  if (mode === 'bench') {
    const elbowAngle = parseFloat(metrics.elbowAngle?.value);
    if (elbowAngle) {
      deviations.elbowAngle = calculateAngleDeviation(elbowAngle, standard.elbowAngle);
    }

    const barPath = parseFloat(metrics.barPath?.value);
    if (barPath && standard.barPath) {
      const pathDeviation = barPath - standard.barPath.max;
      deviations.barPath = {
        deviation: pathDeviation > 0 ? pathDeviation : 0,
        severity: pathDeviation > 3 ? 'severe' : pathDeviation > 1.5 ? 'moderate' : 'mild',
        direction: pathDeviation > 0 ? 'too_large' : 'normal',
        currentValue: barPath,
        maxAllowed: standard.barPath.max
      };
    }

    const eccentricTime = parseFloat(metrics.eccentricTime?.value);
    if (eccentricTime) {
      const idealTime = 2.0; // 理想離心時間 2 秒
      const timeDeviation = Math.abs(eccentricTime - idealTime);
      deviations.eccentricTime = {
        deviation: timeDeviation,
        severity: timeDeviation > 1.0 ? 'severe' : timeDeviation > 0.5 ? 'moderate' : 'mild',
        direction: eccentricTime < idealTime ? 'too_fast' : 'too_slow',
        currentValue: eccentricTime,
        ideal: idealTime
      };
    }
  } else if (mode === 'squat') {
    const kneeAngle = parseFloat(metrics.kneeAngle?.value);
    if (kneeAngle) {
      deviations.kneeAngle = calculateAngleDeviation(kneeAngle, standard.kneeAngle);
    }

    const hipDepth = metrics.hipDepth?.value;
    if (hipDepth && standard.hipDepth) {
      deviations.hipDepth = {
        deviation: hipDepth !== standard.hipDepth ? 1 : 0,
        severity: hipDepth !== standard.hipDepth ? 'moderate' : 'none',
        direction: hipDepth === 'high' ? 'too_high' : 'normal',
        currentValue: hipDepth,
        ideal: standard.hipDepth
      };
    }
  }

  // 計算總體偏差嚴重程度
  const severities = Object.values(deviations).map(d => d?.severity).filter(Boolean);
  const overallSeverity = severities.includes('severe') ? 'severe' :
                         severities.includes('moderate') ? 'moderate' :
                         severities.includes('mild') ? 'mild' : 'none';

  return {
    deviations,
    overallSeverity,
    hasIssues: overallSeverity !== 'none'
  };
};

/**
 * 生成動作糾正建議
 * @param {Object} params - 參數物件
 * @param {Object} params.metrics - 動作指標
 * @param {Object} params.deviationAnalysis - 偏差分析結果
 * @param {string} params.mode - 動作模式
 * @param {number} params.score - 動作評分
 * @returns {Promise<Object>} 糾正建議物件
 */
export const generateFormCorrection = async ({
  metrics,
  deviationAnalysis,
  mode,
  score
}) => {
  // 先使用本地規則生成基礎建議
  const localCorrection = FORM_CORRECTION_RULES.getLocalCorrections(deviationAnalysis, mode);
  
  // 判斷是否需要 AI 深度分析
  // 條件：嚴重偏差、多項問題、或本地建議不足
  const needsAI = 
    !localCorrection || // 本地無法生成建議
    deviationAnalysis.overallSeverity === 'severe' || // 嚴重偏差
    Object.keys(deviationAnalysis.deviations).filter(k => 
      deviationAnalysis.deviations[k]?.severity !== 'none'
    ).length > 2; // 多項問題

  // 如果不需要 AI，直接返回本地分析結果
  if (!needsAI && localCorrection) {
    return {
      ...localCorrection,
      deviationAnalysis,
      timestamp: new Date().toISOString(),
      source: 'local'
    };
  }

  // 需要 AI 深度分析
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error('請先設定 API Key');
    handleError(error, { context: 'formCorrection', operation: 'generateFormCorrection' });
    throw error;
  }

  try {
    const exerciseName = mode === 'bench' ? '臥推' : '深蹲';
    
    // 構建偏差描述
    let deviationText = '';
    if (deviationAnalysis && deviationAnalysis.deviations) {
      const issues = [];
      Object.entries(deviationAnalysis.deviations).forEach(([key, dev]) => {
        if (dev && dev.severity !== 'none') {
          let issueDesc = '';
          if (key === 'elbowAngle') {
            issueDesc = `手肘角度${dev.currentAngle}°，${dev.direction === 'too_small' ? '過小' : '過大'}（理想${dev.ideal}°）`;
          } else if (key === 'kneeAngle') {
            issueDesc = `膝蓋角度${dev.currentAngle}°，${dev.direction === 'too_small' ? '過小' : '過大'}（理想${dev.ideal}°）`;
          } else if (key === 'barPath') {
            issueDesc = `槓鈴軌跡偏移${dev.currentValue}cm，超過標準${dev.maxAllowed}cm`;
          } else if (key === 'eccentricTime') {
            issueDesc = `離心時間${dev.currentValue}秒，${dev.direction === 'too_fast' ? '過快' : '過慢'}（理想${dev.ideal}秒）`;
          } else if (key === 'hipDepth') {
            issueDesc = `髖關節深度${dev.currentValue === 'high' ? '不足' : '正常'}`;
          }
          if (issueDesc) {
            issues.push(`${issueDesc}（${dev.severity === 'severe' ? '嚴重' : dev.severity === 'moderate' ? '中等' : '輕微'}偏差）`);
          }
        }
      });
      deviationText = issues.join('；');
    }

    const prompt = `你是一位專業的肌力與體能教練 (CSCS)。請分析${exerciseName}動作並提供具體糾正建議。

動作評分：${score}/100
${deviationText ? `發現問題：${deviationText}` : '動作基本標準'}

請提供：
1. 3-5條具體糾正建議（每條30字內，繁體中文，針對發現的問題）
2. 2-3個糾正訓練動作（包含動作名稱、組數、次數、重點提示）
3. 訓練計劃建議（如何將糾正動作融入日常訓練）

輸出格式（JSON）：
{
  "corrections": ["建議1", "建議2", "建議3"],
  "correctiveExercises": [
    {
      "name": "動作名稱",
      "sets": 3,
      "reps": "10-12",
      "focus": "重點提示",
      "description": "動作說明"
    }
  ],
  "trainingPlan": "如何融入訓練的建議（100字內）"
}

IMPORTANT: Output ONLY raw JSON.`;

    const response = await runGemini(prompt, apiKey);

    // 清理 JSON 回應
    let cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const startIndex = cleanJson.indexOf('{');
    const endIndex = cleanJson.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      cleanJson = cleanJson.substring(startIndex, endIndex + 1);
    }

    const correction = JSON.parse(cleanJson);

    return {
      ...correction,
      deviationAnalysis,
      timestamp: new Date().toISOString(),
      source: 'ai'
    };
  } catch (error) {
    handleError(error, { context: 'formCorrection', operation: 'generateFormCorrection' });
    throw error;
  }
};
