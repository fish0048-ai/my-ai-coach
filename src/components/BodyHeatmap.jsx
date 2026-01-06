import React from 'react';
import { BODY_PATHS, MUSCLE_MAPPING } from '../data/bodyData';

const BodyHeatmap = ({ muscleVolumes }) => {
    // 找出最大訓練量，用於正規化顏色深淺
    const maxVol = Math.max(...Object.values(muscleVolumes), 1);

    // 根據部位名稱取得顏色
    const getMuscleStyle = (partKey) => {
        // 反向查找：SVG partKey 屬於哪個大肌群 (例如 'chest_left' 屬於 '胸部')
        const muscleGroup = Object.keys(MUSCLE_MAPPING).find(key => 
            MUSCLE_MAPPING[key].includes(partKey)
        );

        const volume = muscleVolumes[muscleGroup] || 0;
        
        if (volume === 0) {
            return { fill: "#334155", opacity: 0.3 }; // 未訓練：深灰 + 低透明度
        }

        // 計算熱力強度 (0.4 ~ 1.0)
        const intensity = 0.4 + (volume / maxVol) * 0.6;
        
        return { 
            fill: "#10b981", 
            opacity: intensity,
            className: "transition-all duration-500 hover:brightness-125 cursor-help"
        };
    };

    const renderPaths = (view) => {
        return Object.entries(BODY_PATHS[view]).map(([key, pathData]) => {
            const style = getMuscleStyle(key);
            const groupName = Object.keys(MUSCLE_MAPPING).find(g => MUSCLE_MAPPING[g].includes(key));
            const tooltip = groupName ? `${groupName}: ${(muscleVolumes[groupName] || 0).toLocaleString()} kg` : '';

            return (
                <path 
                    key={key}
                    d={pathData}
                    fill={style.fill}
                    opacity={style.opacity}
                    className={style.className}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.5"
                >
                    {tooltip && <title>{tooltip}</title>}
                </path>
            );
        });
    };

    return (
        <div className="flex justify-center gap-8 w-full h-80 py-4 select-none">
            {/* 正面 */}
            <div className="relative h-full aspect-[1/2]">
                <svg viewBox="0 0 100 200" className="h-full w-full overflow-visible drop-shadow-xl">
                    <g>{renderPaths('front')}</g>
                    <text x="50" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="2">正面</text>
                </svg>
            </div>

            {/* 背面 */}
            <div className="relative h-full aspect-[1/2]">
                <svg viewBox="0 0 100 200" className="h-full w-full overflow-visible drop-shadow-xl">
                    <g>{renderPaths('back')}</g>
                    <text x="50" y="195" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" letterSpacing="2">背面</text>
                </svg>
            </div>
        </div>
    );
};

export default BodyHeatmap;