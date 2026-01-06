import React, { useState } from 'react';
import { User, Settings, Dumbbell, Calendar, ChevronRight, Save } from 'lucide-react';

export default function FeatureViews({ view, userData }) {
  // 模擬一些編輯狀態 (UI用途)
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    height: userData?.height || 175,
    weight: userData?.weight || 70,
    goal: '增肌'
  });

  if (view === 'training') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="text-blue-500" />
            本週訓練計畫
          </h1>
          <button className="text-sm text-blue-400 hover:text-blue-300">查看歷史紀錄</button>
        </div>

        {/* 訓練卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {['胸肌與三頭', '背部與二頭', '腿部轟炸', '核心與有氧'].map((plan, idx) => (
            <div key={idx} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-gray-900 rounded-lg text-blue-500 group-hover:text-white group-hover:bg-blue-600 transition-colors">
                  <Dumbbell size={24} />
                </div>
                <span className="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">Day {idx + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{plan}</h3>
              <p className="text-sm text-gray-400 mb-4">預計時間: 45-60 分鐘</p>
              
              <div className="space-y-2">
                <div className="flex items-center text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  臥推 4組 x 10下
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                  啞鈴飛鳥 3組 x 12下
                </div>
                {/* 更多項目... */}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between text-sm text-blue-400 font-medium">
                開始訓練
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>

        {/* AI 建議區塊 */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 border border-blue-500/30">
          <h3 className="text-lg font-bold text-white mb-2">AI 教練建議</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            根據你上週的表現，建議本週加強 <span className="text-white font-bold">上胸</span> 的訓練量。
            你的腿部恢復狀況良好，可以嘗試增加深蹲的重量約 2.5kg。
          </p>
        </div>
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-purple-500" />
          個人檔案
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左側：頭像與基本資訊 */}
          <div className="col-span-1 bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4 ring-4 ring-gray-800 shadow-xl">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button className="absolute bottom-4 right-0 p-1.5 bg-gray-700 rounded-full text-white hover:bg-gray-600 border border-gray-900">
                <Settings size={14} />
              </button>
            </div>
            <h2 className="text-xl font-bold text-white">{userData?.name || '健身夥伴'}</h2>
            <p className="text-gray-400 text-sm mb-4">{userData?.email}</p>
            <div className="flex gap-2 w-full">
               <span className="flex-1 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">新手</span>
               <span className="flex-1 py-1 bg-purple-500/10 text-purple-400 text-xs rounded border border-purple-500/20">增肌期</span>
            </div>
          </div>

          {/* 右側：詳細數據表單 */}
          <div className="col-span-1 md:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-white">身體數據</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isEditing ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {isEditing ? <><Save size={16}/> 儲存</> : <><Settings size={16}/> 編輯</>}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-semibold">身高 (cm)</label>
                <input 
                  type="number" 
                  value={profile.height}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({...profile, height: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-semibold">體重 (kg)</label>
                <input 
                  type="number" 
                  value={profile.weight}
                  disabled={!isEditing}
                  onChange={(e) => setProfile({...profile, weight: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-semibold">體脂率 (%)</label>
                <input 
                  type="number" 
                  defaultValue="18"
                  disabled={!isEditing}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase font-semibold">主要目標</label>
                <select 
                  disabled={!isEditing}
                  value={profile.goal}
                  onChange={(e) => setProfile({...profile, goal: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
                >
                  <option value="增肌">增肌 (Muscle Gain)</option>
                  <option value="減脂">減脂 (Fat Loss)</option>
                  <option value="維持">維持 (Maintain)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}