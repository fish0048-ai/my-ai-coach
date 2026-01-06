export async function runGemini(prompt, apiKey) {
  // 檢查是否提供了 API Key
  if (!apiKey) {
    return "請點擊右上角的設定圖示 ⚙️，輸入您的 Google Gemini API Key 才能開始對話喔！";
  }

  try {
    // 您目前使用的是 gemini-2.5-flash (或是最新的 flash 模型)
    // 建議使用 'gemini-1.5-flash' 作為穩定版，或 'gemini-2.0-flash-exp' (實驗版)
    // 若您的 API Key 支援 2.5，請填入 'gemini-2.5-flash'
    // 這裡預設先改回最通用的 'gemini-1.5-flash' 以確保 100% 可用，
    // 如果您確定有權限使用 2.5，請將下方字串改為 'gemini-2.5-flash-preview' 或正確的型號名稱
    const model = 'gemini-2.5-flash'; 
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error Details:", errorData);
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 防呆：確認回傳資料結構正確
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
       throw new Error("AI 沒有回傳任何內容，請稍後再試。");
    }

    const text = data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `連線發生錯誤：${error.message}。\n請檢查您的 API Key 是否正確，或是模型名稱是否支援。`;
  }
}