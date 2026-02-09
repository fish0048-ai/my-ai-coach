import React from 'react';

/**
 * 統計卡片組件
 * 用於 Dashboard 顯示各種統計數據
 */
export default function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card-base p-6 flex items-center gap-4">
      <div className={`p-3 rounded-game border-2 border-game-outline/50 ${color} bg-opacity-20`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} aria-hidden />
      </div>
      <div>
        <p className="text-gray-700 text-sm font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );
}
