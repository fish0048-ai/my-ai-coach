/**
 * 錯誤處理服務
 * 統一錯誤處理邏輯，包括錯誤日誌記錄、使用者友善的錯誤訊息轉換等
 */

/**
 * 錯誤類型對照表 - 將技術錯誤轉換為使用者友善的訊息
 */
const ERROR_MESSAGES = {
  // Firebase 錯誤
  'permission-denied': '權限不足 (Firebase Rules)。請確保您的帳戶已正確建立，且 Firebase 安全規則允許讀寫該路徑',
  'unauthenticated': '未登入，請先登入',
  'not-found': '資料不存在',
  'already-exists': '資料已存在',
  'failed-precondition': '操作失敗，請檢查資料狀態',
  'aborted': '操作已取消',
  'out-of-range': '資料超出範圍',
  'unimplemented': '功能暫未實作',
  'internal': '伺服器內部錯誤，請稍後重試',
  'unavailable': '服務暫時不可用，請稍後重試',
  'data-loss': '資料遺失，請重新操作',
  'deadline-exceeded': '操作逾時，請稍後重試',
  
  // 網路錯誤
  'network-error': '網路連線失敗，請檢查網路設定',
  'timeout': '請求逾時，請稍後重試',
  
  // 業務錯誤
  'api-key-missing': 'API Key 未設定，請在設定中配置',
  'api-key-invalid': 'API Key 無效，請檢查設定',
  'validation-error': '資料驗證失敗，請檢查輸入',
  'file-upload-error': '檔案上傳失敗，請重試',
  'file-format-error': '檔案格式不支援',
};

/**
 * 取得使用者友善的錯誤訊息
 * @param {Error|string} error - 錯誤物件或錯誤訊息
 * @param {Object} context - 錯誤上下文資訊
 * @returns {string} 使用者友善的錯誤訊息
 */
const getUserFriendlyMessage = (error, context = {}) => {
  if (typeof error === 'string') {
    return error;
  }

  // 檢查是否為 Firebase 錯誤
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // 檢查錯誤訊息中是否包含已知錯誤類型
  const errorMessage = error?.message || String(error);
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key)) {
      return message;
    }
  }

  // 檢查是否為網路錯誤
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return ERROR_MESSAGES['network-error'];
  }

  // 預設回傳原始訊息或通用錯誤訊息
  return errorMessage || '操作失敗，請稍後重試';
};

/**
 * 處理錯誤
 * @param {Error|string} error - 錯誤物件或錯誤訊息
 * @param {Object} options - 錯誤處理選項
 * @param {string} options.context - 錯誤發生的上下文（如元件名）
 * @param {string} options.operation - 操作名稱（如 'fetchWorkouts'）
 * @param {boolean} options.showToast - 是否顯示錯誤提示（預設 true）
 * @param {boolean} options.logError - 是否記錄錯誤日誌（預設 true）
 * @returns {string} 使用者友善的錯誤訊息
 */
export const handleError = (error, options = {}) => {
  const {
    context = 'Unknown',
    operation = 'unknown',
    showToast = true,
    logError = true,
  } = options;

  // 取得使用者友善的錯誤訊息
  const userMessage = getUserFriendlyMessage(error, { context, operation });

  // 記錄錯誤日誌
  if (logError) {
    const errorDetails = {
      message: error?.message || String(error),
      stack: error?.stack,
      context,
      operation,
      timestamp: new Date().toISOString(),
    };
    console.error(`[${context}] ${operation}:`, errorDetails);
  }

  // 顯示錯誤提示（透過事件系統，由 ErrorToast 元件監聽）
  if (showToast) {
    const event = new CustomEvent('app-error', {
      detail: {
        message: userMessage,
        context,
        operation,
      },
    });
    window.dispatchEvent(event);
  }

  return userMessage;
};

/**
 * 建立錯誤物件
 * @param {string} message - 錯誤訊息
 * @param {string} code - 錯誤代碼
 * @param {Object} details - 錯誤詳情
 * @returns {Error} 錯誤物件
 */
export const createError = (message, code, details = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
};
