/**
 * CoachChat Prompt 組裝
 * 將語氣、上下文、使用者提問整合為單一字串。
 */

export const buildCoachPrompt = ({ userMessage, userContext, knowledgeContext }) => {
  const contextSection = `
[使用者目前狀態與近期訓練]
${userContext || '目前無詳細資料'}
${knowledgeContext || ''}
  `.trim();

  return `
你是一位專業健身教練，風格：繁體中文、幽默鼓勵、極度精簡(50字內)。
${contextSection}

用戶問題：${userMessage}
請用 50 字內回答，聚焦可行建議。
  `.trim();
};

