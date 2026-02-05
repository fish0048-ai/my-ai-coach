/**
 * 定期備份提醒橫幅
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { getCurrentUser } from '../../services/authService';
import { downloadBackup, getBackupReminder } from '../../services/backup/backupService';
import { handleError } from '../../services/core/errorService';

export default function BackupBanner({ reminder, onDismiss, onUpdate }) {
  if (!reminder?.shouldRemind) return null;

  const handleBackup = async () => {
    try {
      await downloadBackup();
      const user = getCurrentUser();
      if (user) onUpdate?.(getBackupReminder(user.uid, 30));
      handleError('備份檔案已下載完成！', { context: 'BackupBanner', operation: 'downloadBackup' });
    } catch (error) {
      handleError(error, { context: 'BackupBanner', operation: 'downloadBackup' });
    }
  };

  return (
    <div className="bg-yellow-900/30 border border-yellow-500/40 text-yellow-100 px-4 py-3 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-yellow-400 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="font-semibold text-sm">建議定期下載備份，保護您的訓練資料。</p>
          <p className="text-xs text-yellow-100/80 mt-1">
            {reminder.lastDate
              ? `上次備份日期：${reminder.lastDate}（約 ${reminder.daysSince} 天前）`
              : '尚未偵測到備份紀錄，建議先建立第一份備份檔案。'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={handleBackup}
          className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-xs font-semibold rounded-lg transition-colors"
        >
          立即備份
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-yellow-200/80 hover:text-yellow-100 underline-offset-2 hover:underline"
        >
          稍後再提醒
        </button>
      </div>
    </div>
  );
}
