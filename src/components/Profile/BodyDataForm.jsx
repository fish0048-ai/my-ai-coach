import React from 'react';
import { Calculator, Settings, Save, Loader } from 'lucide-react';

/**
 * 身體資料表單組件
 * 包含身高、體重、體脂率、肌肉率、BMR、最大心率、年齡、性別、活動量、訓練目標等輸入欄位
 */
export default function BodyDataForm({ profile, isEditing, isSaving, calculatedTDEE, onProfileChange, onSave, onEdit }) {
  return (
    <div className="card-base p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Calculator size={18} className="text-game-coin" aria-hidden />
          身體資料與 TDEE 分析
        </h3>
        {isEditing ? (
          <button type="button" onClick={onSave} disabled={isSaving} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50">
            {isSaving ? <Loader size={16} className="animate-spin" aria-hidden /> : <Save size={16} aria-hidden />}
            儲存變更
          </button>
        ) : (
          <button type="button" onClick={onEdit} className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm font-medium">
            <Settings size={16} aria-hidden /> 編輯資料
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">身高 (cm)</label>
          <input type="number" value={profile.height} disabled={!isEditing} onChange={(e) => onProfileChange({...profile, height: e.target.value})} className="input-base w-full disabled:opacity-50" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">體重 (kg)</label>
          <input type="number" value={profile.weight} disabled={!isEditing} onChange={(e) => onProfileChange({...profile, weight: e.target.value})} className="input-base w-full disabled:opacity-50" />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold flex items-center justify-between">
            體脂率 (Body Fat)
            <span className="text-xs text-gray-600 lowercase">%</span>
          </label>
          <input type="number" step="0.1" value={profile.bodyFat} disabled={!isEditing} onChange={(e) => onProfileChange({...profile, bodyFat: e.target.value})} className="input-base w-full disabled:opacity-50" placeholder="例如: 18.5" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold flex items-center justify-between">
            肌肉率 (Muscle Mass)
            <span className="text-xs text-gray-600 lowercase">%</span>
          </label>
          <input 
            type="number" 
            step="0.1"
            value={profile.muscleRate}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, muscleRate: e.target.value})}
            className="input-base w-full disabled:opacity-50"
            placeholder="例如: 32.5"
          />
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold flex items-center justify-between">
            基礎代謝 (BMR) 
            <span className="text-xs text-gray-600 lowercase">kcal/day</span>
          </label>
          <input 
            type="number" 
            value={profile.bmr}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, bmr: e.target.value})}
            placeholder={calculatedTDEE && !profile.bmr ? `自動估算: ${Math.round(calculatedTDEE / parseFloat(profile.activity))}` : "InBody 測量值"}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 placeholder-gray-600"
          />
        </div>

        {/* 最大心率 (手動輸入) */}
        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold flex items-center justify-between">
            最大心率 (Max HR)
            <span className="text-xs text-gray-600 lowercase">bpm</span>
          </label>
          <input 
            type="number" 
            value={profile.maxHeartRate}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, maxHeartRate: e.target.value})}
            placeholder={profile.age ? `自動估算: ${220 - parseInt(profile.age)}` : "實測值"}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 placeholder-gray-600"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">年齡</label>
          <input 
            type="number" 
            value={profile.age}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, age: e.target.value})}
            className="input-base w-full disabled:opacity-50"
            placeholder="25"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">性別</label>
          <select 
            value={profile.gender}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, gender: e.target.value})}
            className="input-base w-full disabled:opacity-50 appearance-none"
          >
            <option value="male">男性 (Male)</option>
            <option value="female">女性 (Female)</option>
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">日常活動量</label>
          <select 
            value={profile.activity}
            disabled={!isEditing}
            onChange={(e) => onProfileChange({...profile, activity: e.target.value})}
            className="input-base w-full disabled:opacity-50 appearance-none"
          >
            <option value="1.2">久坐 (辦公室工作，少運動)</option>
            <option value="1.375">輕度活動 (每週運動 1-3 天)</option>
            <option value="1.55">中度活動 (每週運動 3-5 天)</option>
            <option value="1.725">高度活動 (每週運動 6-7 天)</option>
            <option value="1.9">超高度活動 (勞力工作 + 每天訓練)</option>
          </select>
        </div>

        <div className="col-span-1 sm:col-span-2 space-y-2">
          <label className="text-xs text-gray-700 uppercase font-semibold">訓練目標</label>
          <select 
            disabled={!isEditing}
            value={profile.goal}
            onChange={(e) => onProfileChange({...profile, goal: e.target.value})}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none disabled:opacity-50 appearance-none"
          >
            <option value="增肌">增肌 (Muscle Gain) - 建議盈餘</option>
            <option value="減脂">減脂 (Fat Loss) - 建議赤字</option>
            <option value="維持">維持 (Maintain) - 保持平衡</option>
          </select>
        </div>
      </div>
    </div>
  );
}
