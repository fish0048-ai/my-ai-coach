/**
 * 訓練周期分析工具
 * 分析用戶的訓練周期（增肌期、減脂期、恢復期），提供周期建議
 */

/**
 * 計算訓練周期階段
 * @param {Object} params - 參數物件
 * @param {Array} params.bodyLogs - 身體資料記錄陣列，包含 {date, weight, bodyFat}
 * @param {Array} params.workouts - 訓練記錄陣列，包含 {date, type, exercises, runDistance, runDuration, calories}
 * @param {number} params.weeks - 分析週數（預設 12 週）
 * @returns {Object} 周期分析結果，包含 {currentPhase, trend, recommendation, phases}
 */
export const analyzeTrainingCycle = ({ bodyLogs = [], workouts = [], weeks = 12 }) => {
  // 1. 計算時間範圍
  const now = new Date();
  const weeksAgo = new Date(now);
  weeksAgo.setDate(weeksAgo.getDate() - (weeks * 7));
  const startDateStr = weeksAgo.toISOString().split('T')[0];

  // 2. 過濾資料（只取最近 N 週）
  const recentBodyLogs = (Array.isArray(bodyLogs) ? bodyLogs : [])
    .filter(log => log && log.date && log.date >= startDateStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const recentWorkouts = (Array.isArray(workouts) ? workouts : [])
    .filter(workout => workout && workout.date && workout.date >= startDateStr && workout.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date));

  // 3. 計算關鍵指標
  
  // 3.1 體重和體脂率趨勢
  const weightTrendData = recentBodyLogs.map(log => ({
    date: log.date,
    value: parseFloat(log.weight) || 0
  }));
  const weightTrend = calculateTrend(weightTrendData);
  
  const bodyFatTrendData = recentBodyLogs.map(log => ({
    date: log.date,
    value: parseFloat(log.bodyFat) || 0
  }));
  const bodyFatTrend = calculateTrend(bodyFatTrendData);

  // 3.2 訓練頻率和強度
  const trainingFrequency = calculateTrainingFrequency(recentWorkouts, weeks);
  const trainingIntensity = calculateTrainingIntensity(recentWorkouts);

  // 3.3 熱量攝入估算（如果有營養資料）
  // 這裡簡化處理，實際應該從營養資料計算
  const avgCalorieBurn = calculateAvgCalorieBurn(recentWorkouts);

  // 4. 判斷當前周期階段
  const currentPhase = determinePhase({
    weightTrend,
    bodyFatTrend,
    trainingFrequency,
    trainingIntensity,
    avgCalorieBurn
  });

  // 5. 生成建議
  const recommendation = generateRecommendation(currentPhase, {
    weightTrend,
    bodyFatTrend,
    trainingFrequency,
    trainingIntensity
  });

  // 6. 歷史周期階段（用於可視化）
  const phases = generatePhaseHistory(recentBodyLogs, recentWorkouts, weeks);

  const result = {
    currentPhase,
    trend: {
      weight: weightTrend,
      bodyFat: bodyFatTrend,
      frequency: trainingFrequency,
      intensity: trainingIntensity
    },
    recommendation,
    phases
  };

  return result;
};

/**
 * 計算趨勢（簡單線性回歸斜率）
 * @param {Array} data - 資料陣列 [{date, value}, ...]
 * @returns {Object} 趨勢結果 {slope, direction, strength}
 */
const calculateTrend = (data) => {
  // 防禦性檢查：確保 data 是陣列且有效
  if (!Array.isArray(data) || data.length < 2) {
    return { slope: 0, direction: 'stable', strength: 'weak', relativeSlope: 0 };
  }

  try {
    // 簡單線性回歸
    const n = data.length;
    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => (d && typeof d.value !== 'undefined') ? parseFloat(d.value) || 0 : 0);
    
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0 || isNaN(denominator)) {
      return { slope: 0, direction: 'stable', strength: 'weak', relativeSlope: 0 };
    }
    
    const slope = (n * sumXY - sumX * sumY) / denominator;
    const avgValue = sumY / n;
    const relativeSlope = (avgValue !== 0 && !isNaN(avgValue)) ? slope / avgValue : 0; // 相對斜率

    let direction = 'stable';
    let strength = 'weak';
    
    if (Math.abs(relativeSlope) < 0.01 || isNaN(relativeSlope)) {
      direction = 'stable';
      strength = 'weak';
    } else if (relativeSlope > 0) {
      direction = 'increasing';
      strength = Math.abs(relativeSlope) > 0.05 ? 'strong' : 'moderate';
    } else {
      direction = 'decreasing';
      strength = Math.abs(relativeSlope) > 0.05 ? 'strong' : 'moderate';
    }

    return { slope: isNaN(slope) ? 0 : slope, direction, strength, relativeSlope: isNaN(relativeSlope) ? 0 : relativeSlope };
  } catch (error) {
    // 如果計算出錯，返回預設值
    return { slope: 0, direction: 'stable', strength: 'weak', relativeSlope: 0 };
  }
};

/**
 * 計算訓練頻率（每週訓練次數）
 * @param {Array} workouts - 訓練記錄陣列
 * @param {number} weeks - 週數
 * @returns {Object} 頻率統計 {perWeek, consistency}
 */
const calculateTrainingFrequency = (workouts, weeks) => {
  if (!Array.isArray(workouts) || workouts.length === 0 || !weeks || weeks === 0) {
    return { perWeek: 0, consistency: 'low', weeklyCounts: {} };
  }

  try {
    // 按日期分組
    const dates = new Set(workouts.filter(w => w && w.date).map(w => w.date));
    const perWeek = dates.size / weeks;

    // 一致性（標準差）
    const weeklyCounts = {};
    workouts.forEach(w => {
      if (w && w.date) {
        try {
          const weekNum = getWeekNumber(w.date);
          weeklyCounts[weekNum] = (weeklyCounts[weekNum] || 0) + 1;
        } catch (e) {
          // 忽略無效日期
        }
      }
    });

    const counts = Object.values(weeklyCounts);
    if (counts.length === 0) {
      return { perWeek: 0, consistency: 'low', weeklyCounts: {} };
    }
    
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    if (avg === 0 || isNaN(avg)) {
      return { perWeek: 0, consistency: 'low', weeklyCounts: {} };
    }
    
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    
    const consistency = stdDev / avg < 0.3 ? 'high' : (stdDev / avg < 0.6 ? 'moderate' : 'low');

    return { perWeek: isNaN(perWeek) ? 0 : perWeek, consistency, weeklyCounts };
  } catch (error) {
    return { perWeek: 0, consistency: 'low', weeklyCounts: {} };
  }
};

/**
 * 計算訓練強度
 * @param {Array} workouts - 訓練記錄陣列
 * @returns {Object} 強度統計 {avgVolume, avgIntensity, trend}
 */
const calculateTrainingIntensity = (workouts) => {
  if (!Array.isArray(workouts) || workouts.length === 0) {
    return { avgVolume: 0, avgIntensity: 'low', strengthCount: 0, runCount: 0 };
  }

  try {
    // 計算總訓練量
    let totalVolume = 0;
    let strengthCount = 0;
    let runCount = 0;

    workouts.forEach(workout => {
      if (!workout) return;
      
      if (workout.type === 'strength' && Array.isArray(workout.exercises)) {
        // 力量訓練：組數 × 次數 × 重量
        const volume = workout.exercises.reduce((sum, ex) => {
          if (!ex) return sum;
          const sets = parseInt(ex.sets) || 0;
          const reps = parseInt(ex.reps) || 0;
          const weight = parseFloat(ex.weight) || 0;
          return sum + (sets * reps * weight);
        }, 0);
        totalVolume += volume;
        strengthCount++;
      } else if (workout.type === 'run') {
        // 跑步：距離 × 時間
        const distance = parseFloat(workout.runDistance) || 0;
        const duration = parseFloat(workout.runDuration) || 0;
        totalVolume += distance * duration; // 簡化計算（距離 × 時間）
        runCount++;
      }
    });

    const avgVolume = workouts.length > 0 ? totalVolume / workouts.length : 0;

    // 強度分級
    let avgIntensity = 'low';
    if (avgVolume > 5000) avgIntensity = 'high';
    else if (avgVolume > 2000) avgIntensity = 'moderate';

    return { avgVolume: isNaN(avgVolume) ? 0 : avgVolume, avgIntensity, strengthCount, runCount };
  } catch (error) {
    return { avgVolume: 0, avgIntensity: 'low', strengthCount: 0, runCount: 0 };
  }
};

/**
 * 計算平均熱量消耗
 * @param {Array} workouts - 訓練記錄陣列
 * @returns {number} 平均熱量消耗（kcal/次）
 */
const calculateAvgCalorieBurn = (workouts) => {
  if (workouts.length === 0) return 0;

  const totalCalories = workouts.reduce((sum, w) => {
    return sum + (parseFloat(w.calories) || 0);
  }, 0);

  return Math.round(totalCalories / workouts.length);
};

/**
 * 判斷當前周期階段
 * @param {Object} indicators - 指標物件
 * @returns {string} 周期階段 ('bulking' | 'cutting' | 'maintenance' | 'recovery')
 */
const determinePhase = ({ weightTrend, bodyFatTrend, trainingFrequency, trainingIntensity }) => {
  // 判斷邏輯：
  // 1. 增肌期（bulking）：體重增加 + 體脂率穩定或略增 + 高訓練強度
  // 2. 減脂期（cutting）：體重下降 + 體脂率下降 + 中等以上訓練強度
  // 3. 維持期（maintenance）：體重穩定 + 體脂率穩定 + 中等訓練頻率
  // 4. 恢復期（recovery）：低訓練頻率或強度

  // 防禦性檢查：確保所有參數都存在
  if (!weightTrend || !bodyFatTrend || !trainingFrequency || !trainingIntensity) {
    return 'maintenance'; // 默認返回維持期
  }

  const weightIncreasing = weightTrend.direction === 'increasing' && weightTrend.strength !== 'weak';
  const weightDecreasing = weightTrend.direction === 'decreasing' && weightTrend.strength !== 'weak';
  const weightStable = weightTrend.direction === 'stable';
  
  const bodyFatDecreasing = bodyFatTrend.direction === 'decreasing' && bodyFatTrend.strength !== 'weak';
  const bodyFatStable = bodyFatTrend.direction === 'stable';

  const highFrequency = (trainingFrequency.perWeek || 0) >= 4;
  const lowFrequency = (trainingFrequency.perWeek || 0) < 2;
  const highIntensity = trainingIntensity.avgIntensity === 'high';

  // 恢復期：低頻率或低強度
  if (lowFrequency || trainingIntensity.avgIntensity === 'low') {
    return 'recovery';
  }

  // 減脂期：體重下降 + 體脂率下降
  if (weightDecreasing && bodyFatDecreasing) {
    return 'cutting';
  }

  // 增肌期：體重增加 + 體脂率穩定或略增 + 高強度
  if (weightIncreasing && (bodyFatStable || (bodyFatTrend.direction === 'increasing')) && highIntensity) {
    return 'bulking';
  }

  // 維持期：其他情況
  return 'maintenance';
};

/**
 * 生成周期建議
 * @param {string} currentPhase - 當前周期階段
 * @param {Object} trends - 趨勢數據
 * @returns {Object} 建議物件 {message, actions}
 */
const generateRecommendation = (currentPhase, trends) => {
  const recommendations = {
    bulking: {
      message: '您目前處於增肌期，建議繼續保持高強度訓練和充足營養攝入。',
      actions: [
        '維持訓練強度（每週 4-5 次）',
        '確保蛋白質攝入充足（每公斤體重 1.6-2.2g）',
        '監控體脂率變化（建議不超過 20%）'
      ],
      color: 'blue'
    },
    cutting: {
      message: '您目前處於減脂期，建議保持熱量缺口並維持訓練強度。',
      actions: [
        '保持訓練頻率（每週 3-4 次）',
        '控制熱量攝入（TDEE 的 80-90%）',
        '監控體重下降速度（每週 0.5-1kg 為佳）'
      ],
      color: 'green'
    },
    maintenance: {
      message: '您目前處於維持期，建議保持當前訓練節奏和飲食習慣。',
      actions: [
        '維持訓練頻率（每週 3-5 次）',
        '保持熱量平衡',
        '定期監測體重和體脂率'
      ],
      color: 'yellow'
    },
    recovery: {
      message: '您目前處於恢復期，建議適度休息並逐漸增加訓練強度。',
      actions: [
        '增加訓練頻率（目標每週 3 次以上）',
        '從低強度開始，逐漸提升',
        '確保充足睡眠和營養恢復'
      ],
      color: 'gray'
    }
  };

  return recommendations[currentPhase] || recommendations.maintenance;
};

/**
 * 生成歷史周期階段（用於可視化）
 * @param {Array} bodyLogs - 身體數據記錄
 * @param {Array} workouts - 訓練記錄
 * @param {number} weeks - 週數
 * @returns {Array} 週期階段陣列 [{week, phase, weight, bodyFat}, ...]
 */
const generatePhaseHistory = (bodyLogs, workouts, weeks) => {
  const phases = [];
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weeks - i) * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // 該週的身體數據（取最後一筆）
    const weekBodyLogs = bodyLogs.filter(log => 
      log.date >= weekStartStr && log.date <= weekEndStr
    );
    const lastLog = weekBodyLogs[weekBodyLogs.length - 1];

    // 該週的訓練記錄
    const weekWorkouts = workouts.filter(w => 
      w.date >= weekStartStr && w.date <= weekEndStr
    );

    // 計算該週的周期階段
    const weekTrends = {
      weight: calculateTrend(weekBodyLogs.map(log => ({
        date: log.date,
        value: parseFloat(log.weight) || 0
      }))),
      bodyFat: calculateTrend(weekBodyLogs.map(log => ({
        date: log.date,
        value: parseFloat(log.bodyFat) || 0
      }))),
      frequency: calculateTrainingFrequency(weekWorkouts, 1),
      intensity: calculateTrainingIntensity(weekWorkouts)
    };

    const weekPhase = determinePhase(weekTrends);

    phases.push({
      week: i + 1,
      date: weekStartStr,
      phase: weekPhase,
      weight: lastLog ? parseFloat(lastLog.weight) : null,
      bodyFat: lastLog ? parseFloat(lastLog.bodyFat) : null,
      workoutCount: weekWorkouts.length
    });
  }

  return phases;
};

/**
 * 取得週數（從年初開始計算）
 * @param {string} dateStr - 日期字串 YYYY-MM-DD
 * @returns {number} 週數
 */
const getWeekNumber = (dateStr) => {
  try {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
    return Math.floor(days / 7);
  } catch (error) {
    return 0;
  }
};

/**
 * 取得周期階段的中文名稱
 * @param {string} phase - 周期階段
 * @returns {string} 中文名稱
 */
export const getPhaseName = (phase) => {
  const names = {
    bulking: '增肌期',
    cutting: '減脂期',
    maintenance: '維持期',
    recovery: '恢復期'
  };
  return names[phase] || '未知';
};

/**
 * 取得周期階段的顏色
 * @param {string} phase - 周期階段
 * @returns {string} 顏色類名
 */
export const getPhaseColor = (phase) => {
  const colors = {
    bulking: 'text-blue-400 bg-blue-900/20 border-blue-700',
    cutting: 'text-green-400 bg-green-900/20 border-green-700',
    maintenance: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
    recovery: 'text-gray-400 bg-gray-900/20 border-gray-700'
  };
  return colors[phase] || 'text-gray-400 bg-gray-900/20 border-gray-700';
};
