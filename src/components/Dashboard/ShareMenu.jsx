/**
 * 分享/匯出選單
 */
import React from 'react';
import { FileText, Image, Download } from 'lucide-react';
import { exportTrainingDataJSON, exportTrainingDataCSV, copyReportToClipboard, downloadReportImage, downloadReportPDF } from '../../utils/reportGenerator';
import { handleError } from '../../services/errorService';

export default function ShareMenu({ onClose, onSharingChange }) {
  const runWithSharing = async (fn, successMsg) => {
    onSharingChange?.(true);
    try {
      await fn();
      handleError(successMsg, { context: 'ShareMenu', operation: 'share' });
    } catch (error) {
      handleError(error, { context: 'ShareMenu', operation: 'share' });
    } finally {
      onSharingChange?.(false);
      onClose?.();
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-48 bg-surface-800 border border-gray-800 rounded-lg shadow-xl z-50">
      <button
        onClick={() => runWithSharing(async () => {
          const ok = await copyReportToClipboard();
          if (!ok) throw new Error('複製失敗');
        }, '報告已複製到剪貼簿！')}
        className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
      >
        <FileText size={16} />
        複製文字報告
      </button>
      <button
        onClick={() => runWithSharing(downloadReportImage, '報告圖片已下載！')}
        className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
      >
        <Image size={16} />
        下載圖片報告
      </button>
      <button
        onClick={() => runWithSharing(downloadReportPDF, 'PDF 報告已下載！')}
        className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
      >
        <FileText size={16} />
        下載 PDF 報告
      </button>
      <button
        onClick={() => runWithSharing(exportTrainingDataJSON, 'JSON 資料已下載！')}
        className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors"
      >
        <Download size={16} />
        匯出 JSON
      </button>
      <button
        onClick={() => runWithSharing(exportTrainingDataCSV, 'CSV 資料已下載！')}
        className="w-full px-4 py-2 text-left text-white hover:bg-surface-800 flex items-center gap-2 transition-colors border-t border-gray-800"
      >
        <Download size={16} />
        匯出 CSV
      </button>
    </div>
  );
}
