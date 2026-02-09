import React from 'react';
import { Pill } from 'lucide-react';

/**
 * 補品清單組件
 */
export default function SupplementsList({ supplements, isEditing, onSupplementsChange }) {
  if (!isEditing && !supplements) return null;

  return (
    <div className="card-base rounded-game border-[3px] border-game-outline p-6">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="text-game-grass" />
        <h3 className="font-bold text-gray-900">目前使用補品 (Supplements)</h3>
      </div>
      <div className="space-y-2">
        {!isEditing && supplements ? (
          <div className="flex flex-wrap gap-2">
            {supplements.split('\n').map((item, idx) => (
              item.trim() && (
                <span key={idx} className="px-3 py-1.5 bg-game-grass/15 text-gray-900 text-sm font-medium rounded-game border-2 border-game-outline/50">
                  {item}
                </span>
              )
            ))}
          </div>
        ) : (
          <>
            <label className="text-xs text-gray-700 uppercase font-semibold">記錄您正在使用的補品 (一行一項)</label>
            <textarea 
              value={supplements || ''}
              disabled={!isEditing}
              onChange={(e) => onSupplementsChange(e.target.value)}
              className="input-base w-full h-32 resize-none disabled:opacity-50"
              placeholder="例如：&#10;乳清蛋白 30g/天&#10;肌酸 5g/天&#10;魚油 1顆/餐"
            />
          </>
        )}
      </div>
    </div>
  );
}
