export async function runGemini(prompt, apiKey) {
  // 檢查是否提供了 API Key
  if (!apiKey) {
    return "請點擊右上角的設定圖示 ⚙️，輸入您的 Google Gemini API Key 才能開始對話喔！";
  }

  try {
    // 改用 gemini-1.5-flash，這是目前最穩定且快速的版本
    // 如果您有付費版 Key，也可以嘗試 gemini-1.5-pro
    const model = 'gemini-1.5-flash';
    
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