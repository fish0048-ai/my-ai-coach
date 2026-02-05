// 檢查是否提供了 API Key
const checkApiKey = (apiKey) => {
  if (!apiKey) {
    throw new Error("請點擊右上角的設定圖示 ⚙️，輸入您的 Google Gemini API Key 才能開始對話喔！");
  }
};

// 輔助：將檔案轉為 Base64
const fileToGenerativePart = async (file) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export async function runGemini(prompt, apiKey) {
  try {
    checkApiKey(apiKey);
    // 更新為 gemini-2.5-flash
    const model = 'gemini-2.5-flash'; 
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) throw new Error("AI 無回應");

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `錯誤：${error.message}`;
  }
}

/**
 * 支援 Function Calling 的 Gemini 呼叫
 * @param {Array<{role: 'user'|'model', parts: Array}>} contents - 對話內容
 * @param {Array} tools - Gemini tools 陣列 [{ functionDeclarations: [...] }]
 * @param {(name: string, args: object) => Promise<any>} executeTool - 執行工具的函數
 * @param {string} apiKey
 * @returns {Promise<string>} 最終文字回覆
 */
export async function runGeminiWithTools(contents, tools, executeTool, apiKey) {
  try {
    checkApiKey(apiKey);
    const model = 'gemini-2.5-flash';

    let currentContents = JSON.parse(JSON.stringify(contents));

    while (true) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: currentContents,
            tools,
            generationConfig: { temperature: 0.3 },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('AI 無回應');
      }

      const candidate = data.candidates[0];
      const modelContent = candidate.content;
      const parts = modelContent?.parts || [];

      const functionCallPart = parts.find((p) => p.functionCall);
      if (functionCallPart) {
        const { name, args } = functionCallPart.functionCall;
        const result = await executeTool(name, args || {});

        currentContents.push({
          role: 'model',
          parts: modelContent.parts,
        });
        currentContents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: { result },
              },
            },
          ],
        });
        continue;
      }

      const textPart = parts.find((p) => p.text);
      if (textPart?.text) {
        return textPart.text;
      }

      throw new Error('AI 回覆格式異常');
    }
  } catch (error) {
    console.error('Gemini Function Calling Error:', error);
    throw error;
  }
}

// 支援圖片的 Vision API
export async function runGeminiVision(prompt, file, apiKey) {
  try {
    checkApiKey(apiKey);
    // 更新為 gemini-2.5-flash (支援 Multimodal)
    const model = 'gemini-2.5-flash'; 
    const imagePart = await fileToGenerativePart(file);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              imagePart
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) throw new Error("AI 無法辨識圖片");

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
}