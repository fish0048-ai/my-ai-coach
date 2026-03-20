import { ZodError } from 'zod';
import { parseLLMJson } from './aiJson';

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

/**
 * 呼叫 Gemini 並回傳純文字（失敗時拋錯，供需重試/驗證的流程使用）
 * @param {string} prompt
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function fetchGeminiText(prompt, apiKey) {
  checkApiKey(apiKey);
  const model = 'gemini-2.5-flash';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    let message = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData.error?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('AI 無回應');
  }

  const text = data.candidates[0].content.parts[0].text;
  if (typeof text !== 'string') {
    throw new Error('AI 回覆格式異常');
  }
  return text;
}

/**
 * 呼叫 Gemini → JSON.parse（經 parseLLMJson）→ Zod schema.parse；失敗時將錯誤附加於原始 Prompt 自動重試。
 * @param {string} prompt
 * @param {string} apiKey
 * @param {Object} options
 * @param {import('zod').ZodType} options.schema
 * @param {'object'|'array'} [options.rootType='object']
 * @param {number} [options.maxRetries=2] 最大「重試」次數（不含首次；共最多 1+maxRetries 次請求）
 * @returns {Promise<import('zod').infer<typeof options.schema>>}
 */
export async function runGeminiJsonValidated(prompt, apiKey, { schema, rootType = 'object', maxRetries = 2 }) {
  if (!schema || typeof schema.parse !== 'function') {
    throw new Error('runGeminiJsonValidated 需要有效的 Zod schema');
  }

  const basePrompt = prompt;
  let currentPrompt = prompt;
  let lastErrMsg = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const responseText = await fetchGeminiText(currentPrompt, apiKey);

    let parsed;
    try {
      parsed = parseLLMJson(responseText, { rootType });
    } catch (parseErr) {
      lastErrMsg = parseErr?.message || String(parseErr);
      if (attempt >= maxRetries) {
        const err = new Error(`Gemini JSON 解析或驗證失敗（已重試 ${maxRetries} 次）: ${lastErrMsg}`);
        err.code = 'GEMINI_JSON_VALIDATION';
        throw err;
      }
      currentPrompt = `${basePrompt}\n\n[系統驗證] 上一次回應無法解析為有效 JSON。錯誤：${lastErrMsg}\n請只輸出符合先前指示之原始 JSON（勿 Markdown）。`;
      continue;
    }

    try {
      return schema.parse(parsed);
    } catch (e) {
      if (e instanceof ZodError) {
        lastErrMsg = e.issues
          .map((issue) => `${issue.path.length ? issue.path.join('.') : '(root)'}: ${issue.message}`)
          .join('; ');
        if (attempt >= maxRetries) {
          const err = new Error(`Gemini JSON 驗證失敗（已重試 ${maxRetries} 次）: ${lastErrMsg}`);
          err.code = 'GEMINI_ZOD_VALIDATION';
          err.cause = e;
          throw err;
        }
        currentPrompt = `${basePrompt}\n\n[系統驗證] Zod 結構/型別驗證未通過。錯誤：${lastErrMsg}\n請修正：type 僅能為 run、strength、rest、analysis；distance 必須為數字（公里 km）；duration 為數字（分鐘 min）；calories 為數字（大卡 kcal）。可併用 runDistance/runDuration 對應 distance/duration。僅輸出 JSON。`;
        continue;
      }
      throw e;
    }
  }

  const err = new Error(`Gemini JSON 驗證失敗: ${lastErrMsg || '未知錯誤'}`);
  err.code = 'GEMINI_JSON_VALIDATION';
  throw err;
}

export async function runGemini(prompt, apiKey) {
  try {
    return await fetchGeminiText(prompt, apiKey);
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