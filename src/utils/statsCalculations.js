/**
 * 統計計算工具函數
 * 統一的統計數據計算邏輯，用於 Dashboard 和 Training Dashboard
 */

/**
 * 輔助函式：取得本地 YYYY-MM-DD 字串
 * @param {Date} date - Date 物件
 * @returns {string} YYYY-MM-DD 格式字串
 */
export const getLocalDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 生成圖表 X 軸數據
 * @param {string} period - 期間類型 ('week' | 'month' | 'year')
 * @returns {Array} 圖表數據陣列 [{label, date, value, monthIndex?}]
 */
export const generateChartAxis = (period) => {
  const chartData = [];
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  if (period === 'week') {
    // 過去 7 天 (包含今天)
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const dayLabel = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
      const label = dateStr === todayStr ? '今天' : dayLabel;
      chartData.push({ label, date: dateStr, value: 0 });
    }
  } else if (period === 'month') {
    // 本月所有日期
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      chartData.push({ label: `${i}`, date: dateStr, value: 0 });
    }
  } else if (period === 'year') {
    // 今年 12 個月
    for (let i = 0; i < 12; i++) {
      chartData.push({ label: `${i+1}月`, monthIndex: i, value: 0 });
    }
  }

  return chartData;
};

/**
 * 處理訓練統計數據
 * @param {Array} docs - 訓練記錄陣列
 * @param {string} period - 期間類型 ('week' | 'month' | 'year')
 * @returns {Object} 統計結果 {totalWorkouts, totalDuration, totalDistance, strengthCount, runCount, chartData}
 */
export const processWorkoutStats = (docs, period) => {
  let totalWorkouts = 0;
  let totalDuration = 0;
  let totalDistance = 0;
  let strengthCount = 0;
  let runCount = 0;
  
  const chartData = generateChartAxis(period);
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  // 遍歷資料進行統計
  docs.forEach(doc => {
    // 1. 資料相容性處理：如果沒有 status 欄位，預設視為 'completed' (舊資料)
    const status = doc.status || 'completed';
    
    // 2. 過濾條件：只計算已完成，且排除純分析紀錄 (type: 'analysis')
    if (status !== 'completed' || doc.type === 'analysis') return;

    const docDateStr = doc.date; // 假設格式為 YYYY-MM-DD
    if (!docDateStr) return;

    // 判斷這筆資料是否在我們需要的圖表區間內
    let matchIndex = -1;

    if (period === 'year') {
      const docDate = new Date(docDateStr);
      if (docDate.getFullYear() === now.getFullYear()) {
        matchIndex = docDate.getMonth();
      }
    } else {
      // Week & Month 直接比對字串，解決時區問題
      matchIndex = chartData.findIndex(d => d.date === docDateStr);
    }

    // 如果這筆資料在區間內，進行累加
    if (matchIndex !== -1) {
      chartData[matchIndex].value += 1; // 累積次數

      // 累積總體數據
      totalWorkouts++;
      if (doc.type === 'run') {
        runCount++;
        totalDistance += parseFloat(doc.runDistance || 0);
        totalDuration += parseFloat(doc.runDuration || 0);
      } else {
        strengthCount++;
      }
    }
  });

  return {
    totalWorkouts,
    totalDuration: Math.round(totalDuration),
    totalDistance: totalDistance.toFixed(1),
    strengthCount,
    runCount,
    chartData
  };
};

/**
 * 計算肌肉疲勞度分數
 * @param {Object} muscleScore - 肌肉組別的組數累計 {muscleName: sets}
 * @returns {Object} 正規化後的疲勞度分數 {muscleName: heat(0-10)}
 */
export const calculateMuscleFatigue = (muscleScore) => {
  const normalizedFatigue = {};
  Object.keys(muscleScore).forEach(muscle => {
    const score = muscleScore[muscle];
    let heat = Math.min(Math.round((score / 20) * 10), 10);
    if (score > 0 && heat === 0) heat = 1;
    normalizedFatigue[muscle] = heat;
  });
  return normalizedFatigue;
};

/**
 * 依訓練類型取得預設 RPE（1~10），用於無紀錄 RPE 時的 ACWR 估算
 * @param {Object} doc - 單筆行事曆訓練
 * @returns {number}
 */
export const getDefaultRPEForACWR = (doc) => {
  const type = doc?.type;
  if (type === 'run') {
    const rt = doc.runType || '';
    if (rt === 'Interval' || rt === '10-20-30') return 8;
    if (rt === 'Easy') return 4;
    if (rt === 'LSD') return 6;
    if (rt === 'MP') return 7;
    return 5;
  }
  if (type === 'strength') return 7;
  return 5;
};

/**
 * 單筆訓練負荷 Load (AU) = RPE × duration(min)
 * @param {Object} doc
 * @returns {number}
 */
const getSessionLoadAU = (doc) => {
  const status = doc.status || 'completed';
  if (status !== 'completed' || doc.type === 'analysis') return 0;

  const duration = parseFloat(doc.runDuration ?? doc.duration ?? 0);
  if (!Number.isFinite(duration) || duration <= 0) return 0;

  let rpe = parseFloat(doc.rpe ?? doc.runRPE ?? NaN);
  if (!Number.isFinite(rpe)) {
    rpe = getDefaultRPEForACWR(doc);
  }
  rpe = Math.min(10, Math.max(1, rpe));

  return rpe * duration;
};

/**
 * 將 YYYY-MM-DD 加減天數（本地日曆）
 * @param {string} dateStr
 * @param {number} deltaDays
 * @returns {string}
 */
const shiftLocalDateStr = (dateStr, deltaDays) => {
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return '';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + deltaDays);
  return getLocalDateStr(d);
};

/**
 * ACWR (Acute:Chronic Workload Ratio) — 以 RPE×時間估算負荷的簡化版傷痛預警
 *
 * - 每日負荷加總後，急性負荷 = 過去 7 天 Load 總和 (AU)
 * - 慢性負荷 = 過去 28 天 Load 總和 ÷ 4（平均每週）(AU)
 * - ACWR = 急性 / 慢性；慢性為 0 時無法計算
 *
 * @param {Array<Object>} workouts - 行事曆訓練紀錄（需含 date: YYYY-MM-DD）
 * @returns {{
 *   acwrValue: number|null,
 *   status: string,
 *   isDanger: boolean,
 *   acuteLoad: number,
 *   chronicLoad: number
 * }}
 */
export const calculateACWR = (workouts) => {
  const emptyResult = {
    acwrValue: null,
    status: 'Insufficient Data',
    isDanger: false,
    acuteLoad: 0,
    chronicLoad: 0,
  };

  if (!Array.isArray(workouts) || workouts.length === 0) {
    return emptyResult;
  }

  /** @type {Record<string, number>} */
  const dailyLoads = {};
  for (const doc of workouts) {
    const load = getSessionLoadAU(doc);
    if (load <= 0) continue;
    const ds = doc.date;
    if (!ds) continue;
    dailyLoads[ds] = (dailyLoads[ds] || 0) + load;
  }

  const todayStr = getLocalDateStr(new Date());

  let acuteLoad = 0;
  for (let i = 0; i < 7; i++) {
    const ds = shiftLocalDateStr(todayStr, -i);
    acuteLoad += dailyLoads[ds] || 0;
  }

  let chronicSum28 = 0;
  for (let i = 0; i < 28; i++) {
    const ds = shiftLocalDateStr(todayStr, -i);
    chronicSum28 += dailyLoads[ds] || 0;
  }

  const chronicLoad = chronicSum28 / 4;

  if (chronicLoad <= 0) {
    return {
      ...emptyResult,
      acuteLoad: Math.round(acuteLoad * 10) / 10,
      chronicLoad: 0,
    };
  }

  const acwrRaw = acuteLoad / chronicLoad;
  const acwrValue = Math.round(acwrRaw * 100) / 100;

  let status = 'Sweet Spot';
  let isDanger = false;

  if (acwrValue < 0.8) {
    status = 'Under-training';
  } else if (acwrValue <= 1.3) {
    status = 'Sweet Spot';
  } else if (acwrValue <= 1.5) {
    status = 'Caution';
  } else {
    status = 'Danger Zone';
    isDanger = true;
  }

  return {
    acwrValue,
    status,
    isDanger,
    acuteLoad: Math.round(acuteLoad * 10) / 10,
    chronicLoad: Math.round(chronicLoad * 10) / 10,
  };
};
