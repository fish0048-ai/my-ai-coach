/**
 * 数值处理工具函数
 * 统一的数值清理和格式化逻辑
 */

/**
 * 清理数值字符串，转换为数字或返回空字符串
 * @param {string|number} val - 输入值
 * @returns {number|string} 清理后的数字，如果无效则返回空字符串
 */
export const cleanNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val.replace(/[^\d.]/g, '')) || '';
    return '';
};

/**
 * 解析配速字符串为小数格式（分钟/公里）
 * 例如 "5'30\"" -> 5.5
 * @param {string} paceStr - 配速字符串，格式如 "5'30\"" 或 "5:30"
 * @returns {number} 小数格式的配速（分钟/公里），如果无效则返回 0
 */
export const parsePaceToDecimal = (paceStr) => {
    if (!paceStr) return 0;
    const match = paceStr.match(/(\d+)'(\d+)"/);
    if (match) {
        return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
    }
    return 0;
};
