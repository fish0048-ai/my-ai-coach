/**
 * 错误处理服务
 * 统一错误处理逻辑，包括错误日志记录、用户友好的错误消息转换等
 */

/**
 * 错误类型映射 - 将技术错误转换为用户友好的消息
 */
const ERROR_MESSAGES = {
  // Firebase 错误
  'permission-denied': '权限不足，请检查您的账户权限',
  'unauthenticated': '未登录，请先登录',
  'not-found': '数据不存在',
  'already-exists': '数据已存在',
  'failed-precondition': '操作失败，请检查数据状态',
  'aborted': '操作已取消',
  'out-of-range': '数据超出范围',
  'unimplemented': '功能暂未实现',
  'internal': '服务器内部错误，请稍后重试',
  'unavailable': '服务暂时不可用，请稍后重试',
  'data-loss': '数据丢失，请重新操作',
  'deadline-exceeded': '操作超时，请稍后重试',
  
  // 网络错误
  'network-error': '网络连接失败，请检查网络设置',
  'timeout': '请求超时，请稍后重试',
  
  // 业务错误
  'api-key-missing': 'API Key 未设置，请在设置中配置',
  'api-key-invalid': 'API Key 无效，请检查配置',
  'validation-error': '数据验证失败，请检查输入',
  'file-upload-error': '文件上传失败，请重试',
  'file-format-error': '文件格式不支持',
};

/**
 * 获取用户友好的错误消息
 * @param {Error|string} error - 错误对象或错误消息
 * @param {Object} context - 错误上下文信息
 * @returns {string} 用户友好的错误消息
 */
const getUserFriendlyMessage = (error, context = {}) => {
  if (typeof error === 'string') {
    return error;
  }

  // 检查是否是 Firebase 错误
  if (error?.code && ERROR_MESSAGES[error.code]) {
    return ERROR_MESSAGES[error.code];
  }

  // 检查错误消息中是否包含已知错误类型
  const errorMessage = error?.message || String(error);
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.toLowerCase().includes(key)) {
      return message;
    }
  }

  // 检查是否是网络错误
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return ERROR_MESSAGES['network-error'];
  }

  // 默认返回原始消息或通用错误消息
  return errorMessage || '操作失败，请稍后重试';
};

/**
 * 处理错误
 * @param {Error|string} error - 错误对象或错误消息
 * @param {Object} options - 错误处理选项
 * @param {string} options.context - 错误发生的上下文（如组件名）
 * @param {string} options.operation - 操作名称（如 'fetchWorkouts'）
 * @param {boolean} options.showToast - 是否显示错误提示（默认 true）
 * @param {boolean} options.logError - 是否记录错误日志（默认 true）
 * @returns {string} 用户友好的错误消息
 */
export const handleError = (error, options = {}) => {
  const {
    context = 'Unknown',
    operation = 'unknown',
    showToast = true,
    logError = true,
  } = options;

  // 获取用户友好的错误消息
  const userMessage = getUserFriendlyMessage(error, { context, operation });

  // 记录错误日志
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

  // 显示错误提示（通过事件系统，由 ErrorToast 组件监听）
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
 * 创建错误对象
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {Object} details - 错误详情
 * @returns {Error} 错误对象
 */
export const createError = (message, code, details = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
};
