/**
 * 多平台資料同步服務 (Strava / Garmin / Apple Health)
 * 目前以本地檔案匯入 (CSV/FIT) 為主，預留 API 串接擴充點
 */

/**
 * 將 Strava 匯出的 CSV 文字解析為統一的跑步紀錄格式
 * @param {string} csvText
 * @returns {Array<Object>} 正規化後的訓練資料
 */
export const parseStravaCSV = (csvText) => {
  if (!csvText) return [];
  const lines = csvText.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf('start_date') !== -1 ? header.indexOf('start_date') : header.indexOf('date');
  const distIdx = header.indexOf('distance');
  const timeIdx = header.indexOf('moving_time') !== -1 ? header.indexOf('moving_time') : header.indexOf('elapsed_time');

  const workouts = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (!cols[0]) continue;

    const dateRaw = cols[dateIdx] || '';
    const date = dateRaw.split('T')[0] || dateRaw; // 取 YYYY-MM-DD
    const distanceMeters = parseFloat(cols[distIdx] || '0');
    const durationSec = parseFloat(cols[timeIdx] || '0');

    workouts.push({
      date,
      type: 'run',
      status: 'completed',
      title: 'Strava 匯入',
      runDistance: (distanceMeters / 1000).toFixed(2),
      runDuration: Math.round(durationSec / 60),
      source: 'strava_csv'
    });
  }

  return workouts;
};

/**
 * 將 Garmin 等平台的泛用 CSV 解析為統一格式
 * @param {string} csvText
 * @returns {Array<Object>}
 */
export const parseGenericRunCSV = (csvText) => {
  if (!csvText) return [];
  const lines = csvText.split('\n').filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf('date') !== -1 ? header.indexOf('date') : header.indexOf('start time');
  const distIdx = header.indexOf('distance') !== -1 ? header.indexOf('distance') : header.indexOf('distance (km)');
  const timeIdx = header.indexOf('duration') !== -1 ? header.indexOf('duration') : header.indexOf('elapsed time');

  const workouts = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (!cols[0]) continue;

    const dateRaw = cols[dateIdx] || '';
    const date = dateRaw.split(' ')[0]; // 取日期部分
    const distanceKm = parseFloat(cols[distIdx] || '0');
    const durationMin = parseFloat(cols[timeIdx] || '0');

    workouts.push({
      date,
      type: 'run',
      status: 'completed',
      title: '裝置匯入',
      runDistance: distanceKm.toFixed(2),
      runDuration: Math.round(durationMin),
      source: 'generic_csv'
    });
  }

  return workouts;
};

/**
 * 預留：透過平台 API 同步資料（Strava / Garmin / Apple Health）
 * 實際使用時需要申請各平台 API 金鑰與 OAuth 流程
 * 此處僅保留介面與註解，避免阻塞前端開發
 */
export const syncFromPlatformAPI = async (platform, options = {}) => {
  // TODO: 串接各平台 API
  // - Strava: https://developers.strava.com/
  // - Garmin: 需申請合作夥伴
  // - Apple Health: 需透過手機端或第三方中介
  console.warn(`多平台同步尚未完成實際 API 串接 (${platform})`, options);
  return {
    platform,
    imported: 0,
    message: '目前僅支援檔案匯入，API 同步將於未來版本提供'
  };
};

