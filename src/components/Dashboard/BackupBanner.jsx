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
    <div className="bg-game-coin/20 border-[3px] border-game-coin/60 text-game-outline px-4 py-3 rounded-game flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-game-coin mt-0.5 flex-shrink-0" size={20} aria-hidden />
        <div>
          <p className="font-semibold text-sm">建議定期下載備份，保護您的訓練資料。</p>
          <p className="text-xs text-game-outline/90 mt-1">
            {reminder.lastDate
              ? `上次備份日期：${reminder.lastDate}（約 ${reminder.daysSince} 天前）`
              : '尚未偵測到備份紀錄，建議先建立第一份備份檔案。'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={handleBackup} className="btn-primary px-3 py-1.5 text-xs font-semibold min-h-[36px]">
          立即備份
        </button>
        <button type="button" onClick={onDismiss} className="text-xs text-game-outline/90 hover:text-game-outline underline-offset-2 hover:underline">
          稍後再提醒
        </button>
      </div>
    </div>
  );
}
