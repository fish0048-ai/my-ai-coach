import React from 'react';

/**
 * 骨架屏組件
 * 用於顯示載入狀態，提供更好的用戶體驗
 */

/**
 * 基礎骨架屏元素
 * @param {Object} props - 組件屬性
 * @param {string} props.className - 額外的 CSS 類名
 * @param {number} props.height - 高度（可選）
 * @param {number} props.width - 寬度（可選，預設 100%）
 */
export const Skeleton = ({ className = '', height, width = '100%' }) => {
  const style = {
    height: height || '1rem',
    width: width,
  };

  return (
    <div 
      className={`bg-gray-700/70 animate-pulse rounded ${className}`}
      style={style}
    />
  );
};

/**
 * 卡片骨架屏
 */
export const CardSkeleton = () => (
  <div className="bg-surface-800 rounded-xl border border-gray-800 p-6 space-y-4 shadow-inner shadow-black/40">
    <Skeleton height="1.5rem" width="60%" />
    <Skeleton height="1rem" />
    <Skeleton height="1rem" width="80%" />
  </div>
);

/**
 * 列表骨架屏
 * @param {number} rows - 行數（預設 3）
 */
export const ListSkeleton = ({ rows = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4">
        <Skeleton height="3rem" width="3rem" className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton height="1rem" width="60%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * 表格骨架屏
 * @param {number} rows - 行數（預設 5）
 * @param {number} cols - 列數（預設 4）
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="space-y-2">
    {/* 表頭 */}
    <div className="flex gap-4 pb-2 border-b border-gray-700">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height="1rem" className="flex-1" />
      ))}
    </div>
    {/* 表行 */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 py-2">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} height="1rem" className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

/**
 * 統計卡片骨架屏
 */
export const StatCardSkeleton = () => (
  <div className="card-base p-6 flex items-center gap-4">
    <Skeleton height="3rem" width="3rem" className="rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton height="0.875rem" width="50%" />
      <Skeleton height="1.5rem" width="30%" />
    </div>
  </div>
);

/**
 * 圖表骨架屏
 * @param {number} height - 高度（預設 300px）
 */
export const ChartSkeleton = ({ height = 300 }) => (
  <div className="bg-surface-800 rounded-xl border border-gray-800 p-6 shadow-lg shadow-black/40">
    <Skeleton height="1.5rem" width="40%" className="mb-4" />
    <div style={{ height: `${height}px` }} className="space-y-2 flex items-end justify-between">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton 
          key={i} 
          height={`${30 + Math.random() * 70}%`}
          width="12%"
          className="rounded-t"
        />
      ))}
    </div>
  </div>
);

export default Skeleton;
