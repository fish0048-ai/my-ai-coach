/**
 * 訓練報告生成工具
 * 生成訓練日誌報告、PDF、圖片分享等
 */

import { listCalendarWorkouts, listCalendarWorkoutsByDateRange } from '../services/calendarService';
import { getUserProfile } from '../services/userService';
import { formatDate } from './date';
import jsPDF from 'jspdf';

/**
 * 生成訓練報告 JSON 資料
 * @param {Object} params - 參數物件
 * @param {string} [params.startDate] - 開始日期 (YYYY-MM-DD)，預設為最近 30 天
 * @param {string} [params.endDate] - 結束日期 (YYYY-MM-DD)，預設為今天
 * @returns {Promise<Object>} 報告資料物件
 */
export const generateTrainingReport = async ({ startDate = null, endDate = null } = {}) => {
  try {
    // 計算日期範圍
    const today = new Date();
    const end = endDate ? new Date(endDate) : today;
    const start = startDate ? new Date(startDate) : new Date(today);
    start.setDate(start.getDate() - 30); // 預設 30 天

    const startStr = formatDate(start);
    const endStr = formatDate(end);

    // 獲取訓練資料
    const workouts = await listCalendarWorkoutsByDateRange(startStr, endStr);
    const completedWorkouts = workouts.filter(w => w.status === 'completed');

    // 獲取用戶資料
    const userProfile = await getUserProfile();

    // 統計資料
    const stats = {
      totalWorkouts: completedWorkouts.length,
      strengthWorkouts: completedWorkouts.filter(w => w.type === 'strength').length,
      runningWorkouts: completedWorkouts.filter(w => w.type === 'run').length,
      totalDistance: completedWorkouts
        .filter(w => w.type === 'run')
        .reduce((sum, w) => sum + (parseFloat(w.runDistance) || 0), 0),
      totalCalories: completedWorkouts.reduce((sum, w) => sum + (parseFloat(w.calories) || 0), 0),
      period: { start: startStr, end: endStr }
    };

    return {
      user: {
        name: userProfile?.name || 'User',
        goal: userProfile?.goal || '健康',
        tdee: userProfile?.tdee || 2000
      },
      stats,
      workouts: completedWorkouts.map(w => ({
        date: w.date,
        type: w.type,
        title: w.title,
        distance: w.runDistance || null,
        duration: w.runDuration || null,
        exercises: w.exercises || [],
        calories: w.calories || null
      })),
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('生成訓練報告失敗:', error);
    throw error;
  }
};

/**
 * 匯出訓練資料為 JSON
 * @param {Object} reportData - 報告資料（可選，如果不提供則自動生成）
 * @returns {Promise<void>}
 */
export const exportTrainingDataJSON = async (reportData = null) => {
  try {
    const data = reportData || await generateTrainingReport();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training_report_${formatDate(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('匯出 JSON 失敗:', error);
    throw error;
  }
};

/**
 * 匯出訓練資料為 CSV
 * @param {Object} reportData - 報告資料（可選，如果不提供則自動生成）
 * @returns {Promise<void>}
 */
export const exportTrainingDataCSV = async (reportData = null) => {
  try {
    const data = reportData || await generateTrainingReport();
    
    // CSV 標題
    const headers = ['日期', '類型', '標題', '距離(km)', '時間(分鐘)', '熱量(kcal)', '動作數'];
    const rows = [headers.join(',')];

    // 資料行
    data.workouts.forEach(workout => {
      const row = [
        workout.date,
        workout.type === 'run' ? '跑步' : '力量',
        `"${workout.title || ''}"`,
        workout.distance || '',
        workout.duration || '',
        workout.calories || '',
        workout.exercises?.length || 0
      ];
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `training_report_${formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('匯出 CSV 失敗:', error);
    throw error;
  }
};

/**
 * 生成訓練報告文字摘要（用於分享）
 * @param {Object} reportData - 報告資料（可選，如果不提供則自動生成）
 * @returns {Promise<string>} 文字摘要
 */
export const generateReportSummary = async (reportData = null) => {
  try {
    const data = reportData || await generateTrainingReport();
    const { stats, user } = data;

    const summary = `
🏋️ 訓練報告 - ${stats.period.start} 至 ${stats.period.end}

👤 ${user.name}
🎯 目標：${user.goal}

📊 統計資料：
• 總訓練次數：${stats.totalWorkouts} 次
• 力量訓練：${stats.strengthWorkouts} 次
• 跑步訓練：${stats.runningWorkouts} 次
• 總跑量：${stats.totalDistance.toFixed(1)} km
• 總消耗熱量：${stats.totalCalories} kcal

💪 繼續加油！
    `.trim();

    return summary;
  } catch (error) {
    console.error('生成報告摘要失敗:', error);
    throw error;
  }
};

/**
 * 複製報告摘要到剪貼簿
 * @param {Object} reportData - 報告資料（可選）
 * @returns {Promise<boolean>} 是否成功
 */
export const copyReportToClipboard = async (reportData = null) => {
  try {
    const summary = await generateReportSummary(reportData);
    await navigator.clipboard.writeText(summary);
    return true;
  } catch (error) {
    console.error('複製到剪貼簿失敗:', error);
    return false;
  }
};

/**
 * 生成訓練報告圖片（使用 Canvas）
 * @param {Object} reportData - 報告資料（可選）
 * @returns {Promise<string>} 圖片 Data URL
 */
export const generateReportImage = async (reportData = null) => {
  try {
    const data = reportData || await generateTrainingReport();
    const { stats, user } = data;

    // 創建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 標題
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('訓練報告', canvas.width / 2, 50);

    // 用戶資訊
    ctx.font = '20px Arial';
    ctx.fillText(`${user.name} - ${user.goal}`, canvas.width / 2, 90);

    // 統計資料
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    let y = 150;
    ctx.fillText(`總訓練次數：${stats.totalWorkouts} 次`, 50, y);
    y += 35;
    ctx.fillText(`力量訓練：${stats.strengthWorkouts} 次`, 50, y);
    y += 35;
    ctx.fillText(`跑步訓練：${stats.runningWorkouts} 次`, 50, y);
    y += 35;
    ctx.fillText(`總跑量：${stats.totalDistance.toFixed(1)} km`, 50, y);
    y += 35;
    ctx.fillText(`總消耗熱量：${stats.totalCalories} kcal`, 50, y);

    // 日期範圍
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText(`${stats.period.start} 至 ${stats.period.end}`, canvas.width / 2, canvas.height - 30);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('生成報告圖片失敗:', error);
    throw error;
  }
};

/**
 * 下載訓練報告圖片
 * @param {Object} reportData - 報告資料（可選）
 * @returns {Promise<void>}
 */
export const downloadReportImage = async (reportData = null) => {
  try {
    const imageDataUrl = await generateReportImage(reportData);
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `training_report_${formatDate(new Date())}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('下載報告圖片失敗:', error);
    throw error;
  }
};

/**
 * 生成並下載訓練報告 PDF
 * 使用 jsPDF，內容以目前的統計資訊為主，搭配簡單版面
 * @param {Object} reportData - 報告資料（可選）
 * @returns {Promise<void>}
 */
export const downloadReportPDF = async (reportData = null) => {
  try {
    const data = reportData || await generateTrainingReport();
    const { stats, user } = data;

    const doc = new jsPDF();

    // 標題
    doc.setFontSize(18);
    doc.text('訓練報告', 105, 20, { align: 'center' });

    // 使用者資訊
    doc.setFontSize(12);
    doc.text(`姓名：${user.name}`, 20, 32);
    doc.text(`目標：${user.goal}`, 20, 40);
    doc.text(`TDEE：約 ${user.tdee} kcal`, 20, 48);

    // 期間
    doc.text(`期間：${stats.period.start} 至 ${stats.period.end}`, 20, 58);

    // 統計區塊
    doc.setFontSize(14);
    doc.text('統計摘要', 20, 72);
    doc.setFontSize(12);
    const lines = [
      `總訓練次數：${stats.totalWorkouts} 次`,
      `力量訓練：${stats.strengthWorkouts} 次`,
      `跑步訓練：${stats.runningWorkouts} 次`,
      `總跑量：${stats.totalDistance.toFixed(1)} km`,
      `總消耗熱量：約 ${stats.totalCalories} kcal`
    ];
    let y = 80;
    lines.forEach((line) => {
      doc.text(line, 26, y);
      y += 8;
    });

    // 簡短說明
    doc.setFontSize(10);
    doc.text(
      '此報告由 My AI Coach 自動生成，建議搭配行事曆與 AI 教練建議一同參考。',
      20,
      120,
      { maxWidth: 170 }
    );

    // 下載
    const fileName = `training_report_${formatDate(new Date())}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('下載 PDF 報告失敗:', error);
    throw error;
  }
};

/**
 * 下載「半馬配速手環」PDF
 * 搭配比賽配速策略（Race Strategy Generator）使用
 * @param {Object} strategy - 由 generateHalfMarathonStrategy 產生的策略物件
 * @param {Object} [options]
 * @param {string} [options.raceName] - 比賽名稱（例如：2025 台北馬 半馬）
 * @param {string} [options.targetTime] - 目標時間（預設使用 strategy.targetTime）
 * @returns {Promise<void>}
 */
export const downloadHalfMarathonPaceBandPDF = async (strategy, options = {}) => {
  if (!strategy) return;

  try {
    const doc = new jsPDF('landscape'); // 橫向，方便裁剪成手環

    const title = options.raceName || '半馬配速手環';
    const targetTime = options.targetTime || strategy.targetTime;

    // 標題區
    doc.setFontSize(16);
    doc.text(title, 148, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`目標時間：${targetTime}（約 ${strategy.averagePacePerKm}/km）`, 148, 24, { align: 'center' });

    // 表頭
    const startY = 35;
    doc.setFontSize(10);
    doc.text('公里', 20, startY);
    doc.text('累積時間', 50, startY);
    doc.text('區間時間', 90, startY);
    doc.text('備註', 130, startY);

    // 生成每公里配速手環列（粗略以平均配速展開，重點在手上有一份可對照的時間表）
    const totalKm = Math.round(strategy.distanceKm);
    const avgPaceSeconds = strategy.averagePacePerKm
      .split(':')
      .reduce((acc, v) => acc * 60 + parseInt(v, 10), 0);

    let currentSeconds = 0;
    let y = startY + 8;

    for (let km = 1; km <= totalKm; km++) {
      currentSeconds += avgPaceSeconds;
      const lapTime = avgPaceSeconds;

      const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
      };

      doc.text(`${km}`, 20, y);
      doc.text(formatTime(currentSeconds), 50, y);
      doc.text(formatTime(lapTime), 90, y);

      y += 6;
      if (y > 190 && km < totalKm) {
        // 換頁
        doc.addPage('landscape');
        y = 20;
      }
    }

    // 底部提示
    doc.setFontSize(8);
    doc.text(
      '提示：此配速手環為概略參考，實際比賽請依當天狀況與教練建議調整。',
      148,
      200,
      { align: 'center' }
    );

    const fileName = `half_marathon_pace_band_${formatDate(new Date())}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('下載半馬配速手環 PDF 失敗:', error);
    throw error;
  }
};
