import React, { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * 错误提示组件
 * 监听全局错误事件并显示用户友好的错误提示
 */
export default function ErrorToast() {
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 监听全局错误事件
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
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-red-900/90 border border-red-700 rounded-lg shadow-lg p-4 max-w-md flex items-start gap-3">
        <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="text-red-300 font-semibold mb-1">错误</h4>
          <p className="text-red-200 text-sm">{error.message}</p>
        </div>
        <button
          onClick={handleClose}
          className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
