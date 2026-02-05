/**
 * Agentic RAG Phase 3-3：歷史對話壓縮（摘要機制）
 * 每 5 輪對話將前文壓縮成 50~100 字的摘要，降低 Token 消耗
 */

import { runGemini } from '../../utils/gemini';

const RECENT_EXCHANGES = 4;

/**
 * 將 messages 陣列解析為 [ { user, model }, ... ] 交換對
 * 跳過首條（問候），只組合成完整的 (user, model) 對（不含尚未回覆的 user）
 */
function parseExchanges(messages) {
  const exchanges = [];
  for (let i = 1; i < messages.length - 1; ) {
    const userMsg = messages[i];
    const modelMsg = messages[i + 1];
    if (userMsg?.role === 'user' && modelMsg?.role === 'model') {
      exchanges.push({ user: userMsg.text, model: modelMsg.text });
      i += 2;
    } else {
      i += 1;
    }
  }
  return exchanges;
}

function formatExchanges(exchanges) {
  return exchanges
    .map((e, i) => `[${i + 1}] 用戶：${e.user}\n教練：${e.model}`)
    .join('\n\n');
}

/**
 * 呼叫 LLM 將對話壓縮為 50~100 字摘要
 */
export async function summarizeConversation(exchangesText, apiKey) {
  if (!exchangesText?.trim()) return '';
  const prompt = `請將以下訓練教練與用戶的對話，壓縮成 50～100 字的摘要。保留與訓練、目標、傷痛、課表、跑量相關的重點。使用繁體中文。

對話內容：
${exchangesText}

摘要：`;
  try {
    const result = await runGemini(prompt, apiKey);
    return (result || '').trim();
  } catch (e) {
    console.warn('對話摘要失敗，改用原始文字前 200 字:', e);
    return exchangesText.slice(0, 200) + (exchangesText.length > 200 ? '...' : '');
  }
}

/**
 * 根據 messages 建立對話上下文字串
 * - 若交換數 ≤ 4：回傳完整近期對話
 * - 若交換數 > 4：將較早的壓縮成摘要 + 最近 4 輪完整內容
 * @param {Array} messages - CoachChat 的 messages 陣列
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function buildConversationContext(messages, apiKey) {
  const exchanges = parseExchanges(messages);
  if (exchanges.length === 0) return '';

  if (exchanges.length <= RECENT_EXCHANGES) {
    return `[先前對話]\n${formatExchanges(exchanges)}`;
  }

  const older = exchanges.slice(0, -RECENT_EXCHANGES);
  const recent = exchanges.slice(-RECENT_EXCHANGES);
  const summary = await summarizeConversation(formatExchanges(older), apiKey);

  return `[先前對話摘要] ${summary}\n\n[近期對話]\n${formatExchanges(recent)}`;
}
