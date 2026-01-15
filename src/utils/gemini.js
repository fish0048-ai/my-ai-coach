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