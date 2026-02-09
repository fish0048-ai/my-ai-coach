import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * 錯誤提示組件
 * 監聽全局錯誤事件並顯示用戶友好的錯誤提示
 */
export default function ErrorToast() {
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 監聽全局錯誤事件
    const handleError = (event) => {
      const { message, context, operation } = event.detail;
      setError({ message, context, operation });
      setIsVisible(true);

      // 3 秒后自动隐藏
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);

      // 清理函数
      return () => clearTimeout(timer);
    };

    window.addEventListener('app-error', handleError);

    return () => {
      window.removeEventListener('app-error', handleError);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setError(null);
  };

  if (!error || !isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-slide-in" role="alert" aria-live="assertive">
      <div className="card-base rounded-card border-[3px] border-game-heart shadow-card p-4 max-w-md flex items-start gap-3">
        <AlertCircle className="text-game-heart flex-shrink-0 mt-0.5" size={20} aria-hidden />
        <div className="flex-1">
          <h4 className="text-game-heart font-bold mb-1">錯誤</h4>
          <p className="text-gray-900 text-sm font-medium">{error.message}</p>
        </div>
        <button onClick={handleClose} type="button" className="min-h-[44px] min-w-[44px] flex items-center justify-center text-game-heart hover:bg-game-heart/20 rounded-game transition-colors flex-shrink-0 -mr-2 font-bold" aria-label="關閉錯誤提示">
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
