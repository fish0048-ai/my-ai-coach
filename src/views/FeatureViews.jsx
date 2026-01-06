import React from 'react';
import { User, Settings, Dumbbell } from 'lucide-react';

export default function FeatureViews({ view, userData }) {
  if (view === 'training') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="text-blue-500" />
          訓練計畫
        </h1>
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell size={32} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">您的專屬菜單</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            AI 教練正在分析您的身體數據以生成最佳化課表。請稍後再回來查看，或直接詢問右下角的 AI 教練。
          </p>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-purple-500" />
          個人檔案
        </h1>
        
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
              {userData?.name?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{userData?.name || 'User'}</h2>
              <p className="text-gray-400">{userData?.email || 'user@example.com'}</p>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg">
                <label className="text-xs text-gray-500 block mb-1">身高</label>
                <span className="text-white font-medium">{userData?.height || '-'} cm</span>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg">
                <label className="text-xs text-gray-500 block mb-1">體重</label>
                <span className="text-white font-medium">{userData?.weight || '-'} kg</span>
              </div>
            </div>
            
            <button className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Settings size={18} />
              編輯個人資料
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}