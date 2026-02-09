/**
 * 分數圈圈元件（重訓/跑步分析共用）
 */
import React from 'react';

export default function ScoreGauge({ score, showBlue = false }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  let color = 'text-red-500';
  if (score >= 70) color = 'text-yellow-500';
  if (score >= 85) color = 'text-green-500';
  if (showBlue && score >= 95) color = 'text-blue-500';

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-700" />
        <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${color} transition-all duration-1000 ease-out`} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] font-bold text-gray-800">SCORE</span>
      </div>
    </div>
  );
}
