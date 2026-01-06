import React from 'react';

// 肌肉群組件：顯示單個部位的疲勞度
const MuscleGroup = ({ name, fatigue = 0, x, y }) => {
  // 根據疲勞度決定顏色：綠(低) -> 黃(中) -> 紅(高)
  const getColor = (level) => {
    if (level < 3) return '#22c55e'; // Green
    if (level < 7) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <div 
      className="absolute flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer"
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      title={`${name}: ${fatigue}/10`}
    >
      <div 
        className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-gray-700 flex items-center justify-center shadow-lg bg-opacity-90"
        style={{ backgroundColor: getColor(fatigue) }}
      >
        <span className="text-[10px] md:text-xs font-bold text-white">{fatigue}</span>
      </div>
      <span className="text-[10px] text-gray-400 mt-1 bg-gray-900/80 px-1 rounded whitespace-nowrap">{name}</span>
    </div>
  );
};

export default function BodyHeatmap({ data }) {
  // 定義肌肉位置 (x, y 為百分比)
  const muscles = [
    { id: 'chest', name: '胸肌', x: 50, y: 25 },
    { id: 'shoulders', name: '左肩', x: 30, y: 25 },
    { id: 'shoulders', name: '右肩', x: 70, y: 25 }, // 簡化：共用 ID
    { id: 'arms', name: '左手', x: 20, y: 45 },
    { id: 'arms', name: '右手', x: 80, y: 45 },
    { id: 'abs', name: '核心', x: 50, y: 45 },
    { id: 'legs', name: '左腿', x: 40, y: 75 },
    { id: 'legs', name: '右腿', x: 60, y: 75 },
    { id: 'back', name: '背部', x: 50, y: 15 }, // 示意位置
  ];

  return (
    <div className="relative w-full h-full bg-gray-900/50 rounded-lg overflow-hidden border border-gray-800">
      {/* 背景人體輪廓示意圖 (SVG) */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 200" className="h-full text-gray-500 fill-current">
          <path d="M50,10 C60,10 65,15 65,25 C65,30 60,35 50,35 C40,35 35,30 35,25 C35,15 40,10 50,10 M25,40 C10,40 10,60 15,80 C20,100 25,60 25,60 L25,100 C25,120 15,140 15,180 L35,180 C35,140 45,120 45,110 L45,180 L55,180 L55,110 C55,120 65,140 65,180 L85,180 C85,140 75,120 75,100 L75,60 C75,60 80,100 85,80 C90,60 90,40 75,40 Z" />
        </svg>
      </div>

      {/* 渲染肌肉節點 */}
      {muscles.map((m, idx) => (
        <MuscleGroup 
          key={`${m.id}-${idx}`}
          name={m.name}
          x={m.x}
          y={m.y}
          fatigue={data?.[m.id] || 0} 
        />
      ))}
    </div>
  );
}