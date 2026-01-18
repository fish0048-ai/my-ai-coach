import React from 'react';

/**
 * 統計卡片組件
 * 用於 Dashboard 顯示各種統計數據
 */
export default function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
      </div>
    </div>
  );
}
