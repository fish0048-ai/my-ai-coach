/**
 * 表單驗證工具
 * 統一的表單驗證邏輯，提供可重用的驗證規則和函數
 */

/**
 * 驗證規則類型定義
 * @typedef {Object} ValidationRule
 * @property {string} type - 驗證類型 ('required', 'number', 'email', 'min', 'max', 'range', 'pattern', 'custom')
 * @property {*} value - 驗證值（用於 min, max, range, pattern）
 * @property {string} message - 驗證失敗時的錯誤訊息
 * @property {Function} validator - 自訂驗證函數（用於 'custom' 類型）
 */

/**
 * 驗證結果
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - 驗證是否通過
 * @property {string} error - 錯誤訊息（如果驗證失敗）
 */

/**
 * 單個欄位驗證
 * @param {*} value - 要驗證的值
 * @param {ValidationRule|ValidationRule[]} rules - 驗證規則（單個或陣列）
 * @returns {ValidationResult} 驗證結果
 */
export const validateField = (value, rules) => {
  // 如果沒有規則，預設通過
  if (!rules || (Array.isArray(rules) && rules.length === 0)) {
    return { isValid: true, error: null };
  }

  // 統一轉換為陣列
  const ruleArray = Array.isArray(rules) ? rules : [rules];

  // 依序驗證每個規則
  for (const rule of ruleArray) {
    const result = validateRule(value, rule);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true, error: null };
};

/**
 * 執行單個驗證規則
 * @param {*} value - 要驗證的值
 * @param {ValidationRule} rule - 驗證規則
 * @returns {ValidationResult} 驗證結果
 */
const validateRule = (value, rule) => {
  const { type, value: ruleValue, message, validator } = rule;

  switch (type) {
    case 'required':
      return validateRequired(value, message);

    case 'number':
      return validateNumber(value, message);

    case 'email':
      return validateEmail(value, message);

    case 'min':
      return validateMin(value, ruleValue, message);

    case 'max':
      return validateMax(value, ruleValue, message);

    case 'range':
      return validateRange(value, ruleValue.min, ruleValue.max, message);

    case 'minLength':
      return validateMinLength(value, ruleValue, message);

    case 'maxLength':
      return validateMaxLength(value, ruleValue, message);

    case 'pattern':
      return validatePattern(value, ruleValue, message);

    case 'custom':
      return validateCustom(value, validator, message);

    default:
      console.warn(`Unknown validation type: ${type}`);
      return { isValid: true, error: null };
  }
};

/**
 * 必填驗證
 * @param {*} value - 要驗證的值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateRequired = (value, message = '此欄位為必填') => {
  const isValid = value !== null && value !== undefined && value !== '' && 
                  (typeof value === 'string' ? value.trim() !== '' : true);
  return {
    isValid,
    error: isValid ? null : (message || '此欄位為必填')
  };
};

/**
 * 數字驗證
 * @param {*} value - 要驗證的值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateNumber = (value, message = '請輸入有效的數字') => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null }; // 空值由 required 規則處理
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const isValid = !isNaN(numValue) && isFinite(numValue);
  return {
    isValid,
    error: isValid ? null : (message || '請輸入有效的數字')
  };
};

/**
 * 電子郵件驗證
 * @param {*} value - 要驗證的值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateEmail = (value, message = '請輸入有效的電子郵件地址') => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null }; // 空值由 required 規則處理
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = typeof value === 'string' && emailRegex.test(value.trim());
  return {
    isValid,
    error: isValid ? null : (message || '請輸入有效的電子郵件地址')
  };
};

/**
 * 最小值驗證
 * @param {*} value - 要驗證的值
 * @param {number} min - 最小值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateMin = (value, min, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const isValid = !isNaN(numValue) && numValue >= min;
  return {
    isValid,
    error: isValid ? null : (message || `值不能小於 ${min}`)
  };
};

/**
 * 最大值驗證
 * @param {*} value - 要驗證的值
 * @param {number} max - 最大值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateMax = (value, max, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const isValid = !isNaN(numValue) && numValue <= max;
  return {
    isValid,
    error: isValid ? null : (message || `值不能大於 ${max}`)
  };
};

/**
 * 範圍驗證
 * @param {*} value - 要驗證的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateRange = (value, min, max, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const isValid = !isNaN(numValue) && numValue >= min && numValue <= max;
  return {
    isValid,
    error: isValid ? null : (message || `值必須在 ${min} 到 ${max} 之間`)
  };
};

/**
 * 最小長度驗證
 * @param {*} value - 要驗證的值
 * @param {number} minLength - 最小長度
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateMinLength = (value, minLength, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const strValue = String(value);
  const isValid = strValue.length >= minLength;
  return {
    isValid,
    error: isValid ? null : (message || `長度不能少於 ${minLength} 個字元`)
  };
};

/**
 * 最大長度驗證
 * @param {*} value - 要驗證的值
 * @param {number} maxLength - 最大長度
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateMaxLength = (value, maxLength, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const strValue = String(value);
  const isValid = strValue.length <= maxLength;
  return {
    isValid,
    error: isValid ? null : (message || `長度不能超過 ${maxLength} 個字元`)
  };
};

/**
 * 正則表達式驗證
 * @param {*} value - 要驗證的值
 * @param {RegExp|string} pattern - 正則表達式
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validatePattern = (value, pattern, message) => {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, error: null };
  }
  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  const isValid = regex.test(String(value));
  return {
    isValid,
    error: isValid ? null : (message || '格式不符合要求')
  };
};

/**
 * 自訂驗證函數
 * @param {*} value - 要驗證的值
 * @param {Function} validator - 驗證函數，應返回 boolean
 * @param {string} message - 錯誤訊息
 * @returns {ValidationResult}
 */
const validateCustom = (value, validator, message) => {
  if (typeof validator !== 'function') {
    console.warn('Custom validator must be a function');
    return { isValid: true, error: null };
  }
  const isValid = validator(value);
  return {
    isValid,
    error: isValid ? null : (message || '驗證失敗')
  };
};

/**
 * 驗證整個表單
 * @param {Object} formData - 表單資料物件
 * @param {Object} validationRules - 驗證規則物件，key 為欄位名稱，value 為 ValidationRule 或規則陣列
 * @returns {Object} 驗證結果物件，key 為欄位名稱，value 為 ValidationResult
 */
export const validateForm = (formData, validationRules) => {
  const results = {};
  let isFormValid = true;

  for (const fieldName in validationRules) {
    const value = formData[fieldName];
    const rules = validationRules[fieldName];
    const result = validateField(value, rules);
    
    results[fieldName] = result;
    if (!result.isValid) {
      isFormValid = false;
    }
  }

  return {
    isValid: isFormValid,
    errors: results
  };
};

/**
 * 常用驗證規則預設值
 */
export const commonRules = {
  required: (message) => ({ type: 'required', message }),
  number: (message) => ({ type: 'number', message }),
  email: (message) => ({ type: 'email', message }),
  min: (value, message) => ({ type: 'min', value, message }),
  max: (value, message) => ({ type: 'max', value, message }),
  range: (min, max, message) => ({ type: 'range', value: { min, max }, message }),
  minLength: (value, message) => ({ type: 'minLength', value, message }),
  maxLength: (value, message) => ({ type: 'maxLength', value, message }),
  pattern: (pattern, message) => ({ type: 'pattern', value: pattern, message }),
};

/**
 * 示例：使用驗證規則
 * 
 * // 單個欄位驗證
 * const result = validateField(formData.email, [
 *   { type: 'required', message: '請輸入電子郵件' },
 *   { type: 'email', message: '請輸入有效的電子郵件地址' }
 * ]);
 * 
 * // 整個表單驗證
 * const formRules = {
 *   email: [
 *     { type: 'required', message: '請輸入電子郵件' },
 *     { type: 'email', message: '請輸入有效的電子郵件地址' }
 *   ],
 *   age: [
 *     { type: 'required', message: '請輸入年齡' },
 *     { type: 'number', message: '年齡必須為數字' },
 *     { type: 'range', value: { min: 1, max: 120 }, message: '年齡必須在 1 到 120 之間' }
 *   ]
 * };
 * const formResult = validateForm(formData, formRules);
 */
