/**
 * AI JSON 解析工具
 * 將 LLM 回傳的字串（可能包含 ```json 區塊與前後雜訊）
 * 安全地擷取出 JSON 並解析。
 */

/**
 * 從 LLM 回應中擷取並解析 JSON
 * @param {string} raw - 原始回應字串
 * @param {Object} [options]
 * @param {'object'|'array'} [options.rootType='object'] - 預期的 JSON 根節點型別
 * @returns {any} 解析後的 JSON 物件
 * @throws {Error} 當無法成功解析時拋出錯誤
 */
export const parseLLMJson = (raw, { rootType = 'object' } = {}) => {
  if (typeof raw !== 'string') {
    throw new Error('LLM 回應格式錯誤：預期為字串');
  }

  // 移除 ```json ... ``` 包裹與多餘空白
  let clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 根據預期類型擷取第一個完整 JSON 區塊
  const openChar = rootType === 'array' ? '[' : '{';
  const closeChar = rootType === 'array' ? ']' : '}';

  const startIndex = clean.indexOf(openChar);
  const endIndex = clean.lastIndexOf(closeChar);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    clean = clean.substring(startIndex, endIndex + 1);
  }

  try {
    return JSON.parse(clean);
  } catch (error) {
    // 將原始字串長度與部分內容帶入錯誤資訊，方便除錯
    const preview = clean.slice(0, 200);
    throw new Error(`LLM JSON 解析失敗：${error.message}｜內容預覽: ${preview}`);
  }
};

