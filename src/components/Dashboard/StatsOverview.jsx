/**
 * 總覽統計卡片區
 */
import React from 'react';
import { Activity, Flame, Timer, Gauge, Trophy } from 'lucide-react';

export default function StatsOverview({ stats, userData }) {
  const items = [
    { icon: Activity, bg: 'bg-primary-500/10', text: 'text-primary-400', label: '近30天訓練', value: stats?.totalWorkouts },
    { icon: Flame, bg: 'bg-orange-500/10', text: 'text-orange-400', label: '消耗熱量 (估)', value: `${stats?.caloriesBurned || 0}`, suffix: 'kcal' },
    { icon: Timer, bg: 'bg-purple-500/10', text: 'text-purple-400', label: '訓練時數 (估)', value: `${stats?.totalHours || 0}`, suffix: 'h' },
    { icon: Gauge, bg: 'bg-green-500/10', text: 'text-green-400', label: '訓練負荷', value: stats?.trainingLoad || 0, suffix: `(${stats?.avgTrainingLoad || 0}/次)` },
    { icon: Trophy, bg: 'bg-amber-500/10', text: 'text-amber-400', label: '達成目標', value: userData?.goal || '未設定', span: true },
  ];

  return (
    <section className="card-base overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4">
        {items.map(({ icon: Icon, bg, text, label, value, suffix, span }) => (
          <div key={label} className={`flex items-center gap-3 p-4 ${span ? 'col-span-2 lg:col-span-1' : ''}`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={text} size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-lg font-bold text-white tabular-nums">
                {value}
                {suffix && <span className="text-sm font-medium text-gray-500 ml-0.5"> {suffix}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
