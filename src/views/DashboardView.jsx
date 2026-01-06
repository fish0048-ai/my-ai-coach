import React from 'react';
// 修正重點：這裡加上 .jsx 副檔名
import BodyHeatmap from '../components/BodyHeatmap.jsx'; 
import { Activity, Flame, Trophy, Timer } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }) => (
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

export default function DashboardView({ userData }) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">
            歡迎回來，{userData?.name || '健身夥伴'}
          </h1>
          <p className="text-gray-400">這是您今天的訓練概況</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Activity} 
          label="總訓練次數" 
          value={userData?.totalWorkouts || 0} 
          color="bg-blue-500" 
        />
        <StatCard 
          icon={Flame} 
          label="消耗熱量" 
          value={`${userData?.caloriesBurned || 0} kcal`} 
          color="bg-orange-500" 
        />
        <StatCard 
          icon={Timer} 
          label="訓練時數" 
          value={`${userData?.totalHours || 0} h`} 
          color="bg-purple-500" 
        />
        <StatCard 
          icon={Trophy} 
          label="達成目標" 
          value={userData?.completedGoals || 0} 
          color="bg-yellow-500" 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Heatmap or Charts */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">肌肉疲勞度熱圖</h3>
          <div className="h-64 flex items-center justify-center bg-gray-900 rounded-lg">
             <BodyHeatmap data={userData?.muscleFatigue} />
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">近期活動</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">胸肌訓練 A</h4>
                  <p className="text-xs text-gray-500">2 天前</p>
                </div>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">完成</span>
              </div>
            </div>
            {/* 更多項目... */}
            <p className="text-center text-sm text-gray-500 mt-4">尚無更多紀錄</p>
          </div>
        </div>
      </div>
    </div>
  );
}