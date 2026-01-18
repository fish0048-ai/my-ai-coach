/**
 * 趨勢數據處理工具函數
 * 統一的數據趨勢分析邏輯，包括移動平均、週彙整等
 */

/**
 * 處理數據用於趨勢圖表顯示
 * 包括數據轉換、週彙整、移動平均計算
 * @param {Array} rawData - 原始數據陣列
 * @param {string} metric - 指標類型 ('pace', 'distance', 'weight', 'sets', 'volume', 等)
 * @param {string} timeScale - 時間尺度 ('daily' | 'weekly')
 * @returns {Array} 處理後的圖表數據，每個項目包含 {date, value, trend}
 */
export const processTrendData = (rawData, metric, timeScale) => {
  if (!rawData || rawData.length === 0) return [];

  // 1. 轉換為標準格式
  let data = rawData.map(d => {
    let val = 0;
    if (metric === 'pace') val = d.pace || 0;
    else if (metric === 'sets') val = d.sets || 0;
    else if (metric === 'volume') val = d.volume || 0;
    else val = parseFloat(d[metric]) || 0;
    
    return { date: d.date, value: val, original: d };
  }).filter(d => !isNaN(d.value) && d.value !== 0);

  // 2. 如果是週模式，進行彙整
  if (timeScale === 'weekly') {
    const weeklyMap = {};
    data.forEach(d => {
      const dateObj = new Date(d.date);
      const day = dateObj.getDay();
      const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dateObj.setDate(diff)).toISOString().split('T')[0];

      if (!weeklyMap[monday]) weeklyMap[monday] = { sum: 0, count: 0, values: [] };
      weeklyMap[monday].sum += d.value;
      weeklyMap[monday].count += 1;
      weeklyMap[monday].values.push(d.value);
    });

    const isSumType = ['distance', 'sets', 'volume'].includes(metric);

    data = Object.keys(weeklyMap).sort().map(week => {
      const info = weeklyMap[week];
      const finalVal = isSumType ? info.sum : (info.sum / info.count);
      return { date: week, value: finalVal };
    });
  }

  // 3. 計算移動平均 (Trend Line)
  const windowSize = timeScale === 'daily' ? 7 : 4;
  data = data.map((item, idx, arr) => {
    const start = Math.max(0, idx - windowSize + 1);
    const subset = arr.slice(start, idx + 1);
    const avg = subset.reduce((a, b) => a + b.value, 0) / subset.length;
    return { ...item, trend: avg };
  });

  return data;
};
