/**
 * 多平台資料同步服務 (Strava / Garmin / Apple Health)
 * 目前以本地檔案匯入 (CSV/FIT) 為主，預留 API 串接擴充點
 */

/**
 * @typedef {'strava' | 'garmin' | 'apple_health'} PlatformType
 */

/**
 * @typedef {Object} PlatformSyncOptions
 * @property {boolean} [dryRun]                - 是否僅試跑，不實際寫入資料庫
 * @property {string|Date} [since]             - 同步起始時間（含），例如 '2024-01-01'
 * @property {string|Date} [until]             - 同步結束時間（含）
 * @property {number} [limit]                  - 最多同步幾筆紀錄，用於控制一次呼叫負載
 * @property {Object} [credentials]            - 平台授權資訊（accessToken / refreshToken 等）
 * @property {AbortSignal} [signal]            - 可選的 AbortSignal，供呼叫端取消同步
 */

/**
 * @typedef {Object} PlatformSyncError
 * @property {string} code                     - 錯誤代碼，例如 'not-implemented'、'invalid-platform'
 * @property {string} message                  - 給開發者看的錯誤描述
 * @property {Object} [detail]                 - 附加細節（原始錯誤、平台回傳內容等）
 */

/**
 * @typedef {Object} PlatformSyncResult
 * @property {PlatformType|null} platform      - 同步的平台
 * @property {boolean} ok                      - 此次同步是否成功（即使部分失敗也可視情況設為 true）
 * @property {number} importedCount            - 新增的訓練筆數
 * @property {number} updatedCount             - 更新的訓練筆數
 * @property {number} skippedCount             - 因重複或條件不符而略過的筆數
 * @property {PlatformSyncError[]} errors      - 結構化錯誤列表
 * @property {string|null} nextSyncCursor      - 可選，供之後增量同步使用的游標或時間點
 * @property {Object} meta                     - 其他中立性資訊（不含敏感憑證）
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
/**
 * 多平台 API 同步的統一入口
 *
 * ⚠️ 注意：目前僅實作「介面＋錯誤回報結構」，尚未串接實際平台 API。
 * 之後接 Strava / Garmin / Apple Health 時，請在不破壞回傳結構的前提下填入實作。
 *
 * @param {PlatformType} platform              - 目標平台（'strava' | 'garmin' | 'apple_health'）
 * @param {PlatformSyncOptions} [options]      - 同步選項（時間範圍、dryRun 等）
 * @returns {Promise<PlatformSyncResult>}
 */
export const syncFromPlatformAPI = async (platform, options = {}) => {
  const supportedPlatforms = ['strava', 'garmin', 'apple_health'];

  /** @type {PlatformSyncError[]} */
  const errors = [];

  // 基本輸入驗證
  if (!platform || !supportedPlatforms.includes(platform)) {
    errors.push({
      code: 'invalid-platform',
      message: `不支援的平台類型：${String(platform)}，目前僅支援：${supportedPlatforms.join(', ')}`,
      detail: { platform }
    });

    return {
      platform: null,
      ok: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors,
      nextSyncCursor: null,
      meta: {
        supportedPlatforms,
        receivedOptions: sanitizeOptions(options)
      }
    };
  }

  // 檢查是否有基本授權資訊（實際欄位之後串接時再具體化）
  if (!options.credentials) {
    errors.push({
      code: 'missing-credentials',
      message: '尚未設定平台授權憑證（credentials），無法呼叫遠端 API',
      detail: { platform }
    });
  }

  // 支援 dryRun，在尚未實作前一律當作乾跑模式
  const isDryRun = options.dryRun !== false; // 預設 true，避免誤以為已經會真的同步

  // TODO: 未來在這裡依據 platform 分派到真正的同步實作：
  // - Strava: https://developers.strava.com/
  // - Garmin: 需申請合作夥伴
  // - Apple Health: 需透過手機端或第三方中介（通常由手機 App 提供資料）

  console.info(
    `[PlatformSync] API 同步尚未實作，僅回傳結構化結果 (platform=${platform}, dryRun=${isDryRun})`,
    sanitizeOptions(options)
  );

  // 即使未實作，也回傳完整結構，讓前端可以先串 UI / 錯誤顯示
  return {
    platform,
    ok: errors.length === 0 && isDryRun,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    errors: [
      ...errors,
      {
        code: 'not-implemented',
        message: '多平台 API 同步尚未實作，目前僅支援檔案匯入與本地匯入流程',
        detail: { platform }
      }
    ],
    nextSyncCursor: null,
    meta: {
      supportedPlatforms,
      dryRun: isDryRun,
      receivedOptions: sanitizeOptions(options)
    }
  };
};

/**
 * 將選項中的敏感資訊（例如 token）過濾掉，避免被 log 或 UI 直接顯示
 * @param {PlatformSyncOptions} options
 * @returns {Object}
 */
const sanitizeOptions = (options) => {
  if (!options || typeof options !== 'object') return {};

  const { credentials, ...rest } = options;

  return {
    ...rest,
    hasCredentials: !!credentials
  };
};

