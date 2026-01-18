/**
 * 日期工具函數
 * 統一的日期處理邏輯，避免重複定義
 */

/**
 * 將 Date 物件格式化為 YYYY-MM-DD 字串
 * @param {Date|null|undefined} date - Date 物件
 * @returns {string} YYYY-MM-DD 格式的字串，無效日期回傳空字串
 */
export const formatDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 取得指定日期所屬週的 7 天日期陣列 (週一為起始日)
 * @param {Date|string} baseDate - 基準日期
 * @returns {string[]} 日期字串陣列 [YYYY-MM-DD, ...]
 */
export const getWeekDates = (baseDate) => {
  const current = new Date(baseDate);
  const day = current.getDay(); 
  const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(current.setDate(diff));
  
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(formatDate(d));
  }
  return weekDates;
};
