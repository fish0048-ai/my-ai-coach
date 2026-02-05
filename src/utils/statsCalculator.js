/**
 * Agentic RAG - 前端統計計算
 * 與 backend/stats.py 邏輯一致，供 Coach Function Calling 使用
 */

function _parseFloat(val) {
  if (val == null) return 0.0;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  let s = String(val).trim();
  if (s.includes('-') && !s.startsWith('-')) {
    s = s.split('-')[0].trim();
  }
  for (const suffix of ['bpm', 'BPM', ' ']) {
    s = s.replace(suffix, '');
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0.0 : n;
}

function _inDateRange(workout, startDate, endDate) {
  const date = workout.date || workout.dateStr || '';
  if (!date) return false;
  return startDate <= date && date <= endDate;
}

function _filterRunWorkouts(workouts, startDate, endDate) {
  return workouts.filter(
    (w) =>
      w.type === 'run' &&
      w.status === 'completed' &&
      _inDateRange(w, startDate, endDate)
  );
}

/**
 * 計算指定日期範圍內的訓練統計
 * @param {Array} workouts - 訓練紀錄陣列
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @param {string} field - avg_heart_rate | total_distance | total_duration | run_count | avg_pace_min_per_km
 * @returns {number|null}
 */
export function calculateStats(workouts, startDate, endDate, field) {
  const runs = _filterRunWorkouts(workouts || [], startDate, endDate);
  if (!runs.length) return null;

  if (field === 'run_count') return runs.length;

  if (field === 'total_distance') {
    const total = runs.reduce((sum, w) => sum + _parseFloat(w.runDistance), 0);
    return total > 0 ? Math.round(total * 100) / 100 : null;
  }

  if (field === 'total_duration') {
    const total = runs.reduce((sum, w) => sum + _parseFloat(w.runDuration), 0);
    return total > 0 ? Math.round(total * 10) / 10 : null;
  }

  if (field === 'avg_heart_rate') {
    const hrs = runs
      .map((w) => _parseFloat(w.runHeartRate))
      .filter((hr) => hr > 0);
    if (!hrs.length) return null;
    return Math.round((hrs.reduce((a, b) => a + b, 0) / hrs.length) * 10) / 10;
  }

  if (field === 'avg_pace_min_per_km') {
    const paces = [];
    for (const w of runs) {
      const paceStr = w.runPace || '';
      const dist = _parseFloat(w.runDistance);
      const dur = _parseFloat(w.runDuration);
      if (dist > 0 && dur > 0) {
        paces.push(dur / dist);
      } else if (paceStr && paceStr.includes(':')) {
        const parts = paceStr.replace(/\/km/g, '').replace(/"/g, '').split(':');
        if (parts.length >= 2) {
          const mins = parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
          if (!Number.isNaN(mins)) paces.push(mins);
        }
      }
    }
    if (!paces.length) return null;
    const avg = paces.reduce((a, b) => a + b, 0) / paces.length;
    return Math.round(avg * 100) / 100;
  }

  return null;
}
