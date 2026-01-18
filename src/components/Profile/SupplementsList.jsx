import React from 'react';
import { Pill } from 'lucide-react';

/**
 * 補品清單組件
 */
export default function SupplementsList({ supplements, isEditing, onSupplementsChange }) {
  if (!isEditing && !supplements) return null;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="text-blue-500" />
        <h3 className="font-bold text-white">目前使用補品 (Supplements)</h3>
      </div>
      <div className="space-y-2">
        {!isEditing && supplements ? (
          <div className="flex flex-wrap gap-2">
            {supplements.split('\n').map((item, idx) => (
              item.trim() && (
                <span key={idx} className="px-3 py-1 bg-blue-500/10 text-blue-300 text-sm rounded-full border border-blue-500/20">
                  {item}
                </span>
              )
            ))}
          </div>
        ) : (
          <>
            <label className="text-xs text-gray-500 uppercase font-semibold">記錄您正在使用的補品 (一行一項)</label>
            <textarea 
              value={supplements || ''}
              disabled={!isEditing}
              onChange={(e) => onSupplementsChange(e.target.value)}
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 resize-none"
              placeholder="例如：&#10;乳清蛋白 30g/天&#10;肌酸 5g/天&#10;魚油 1顆/餐"
            />
          </>
        )}
      </div>
    </div>
  );
}
