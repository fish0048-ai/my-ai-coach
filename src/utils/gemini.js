export async function runGemini(prompt, apiKey) {
    // 檢查是否提供了 API Key
    if (!apiKey) {
      return "請點擊右上角的設定圖示 ⚙️，輸入您的 Google Gemini API Key 才能開始對話喔！";
    }
  
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
  
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      return text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return `連線發生錯誤：${error.message}。請檢查您的 API Key 是否正確。`;
    }
  }