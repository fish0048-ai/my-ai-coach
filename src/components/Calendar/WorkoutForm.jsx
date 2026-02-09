import React from 'react';
// 修正：加入 Zap
import { Dumbbell, Activity, Sparkles, Loader, Plus, Trash2, Timer, Flame, Heart, BarChart2, AlignLeft, ShoppingBag, Tag, Gauge, Zap } from 'lucide-react';

// RPE 描述文字
const getRPEDescription = (rpe) => {
  const descriptions = {
    1: '極輕鬆 - 幾乎沒有感覺',
    2: '很輕鬆 - 可以持續很久',
    3: '輕鬆 - 呼吸平穩',
    4: '有點輕鬆 - 開始流汗',
    5: '中等 - 可以說話',
    6: '有點累 - 說話有點困難',
    7: '累 - 需要努力維持',
    8: '很累 - 接近極限',
    9: '極累 - 幾乎無法完成',
    10: '極限 - 完全力竭'
  };
  return descriptions[rpe] || '';
};

export default function WorkoutForm({ editForm, setEditForm, gears, handleHeadCoachGenerate, isGenerating, handleExerciseNameChange }) {
  return (
    <div className="space-y-6">
        {/* 1. 頂部：類型切換 */}
        <div className="toggle-group flex p-1">
            <button
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))}
                aria-pressed={editForm.type === 'strength'}
                className={`flex-1 py-2 rounded-game text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'strength' ? 'bg-game-grass text-game-outline' : 'text-gray-700 hover:text-gray-900'}`}
            >
                <Dumbbell size={16} aria-hidden /> 重量訓練
            </button>
            <button
                type="button"
                onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))}
                aria-pressed={editForm.type === 'run'}
                className={`flex-1 py-2 rounded-game text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'run' ? 'bg-game-coin text-game-outline' : 'text-gray-700 hover:text-gray-900'}`}
            >
                <Activity size={16} aria-hidden /> 跑步有氧
            </button>
        </div>

        {/* 2. 標題與 AI 按鈕 */}
        <div className="space-y-3">
            <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({...editForm, title: e.target.value})}
                placeholder={editForm.type === 'run' ? "標題 (例：晨跑 5K)" : "標題 (例：腿部轟炸日)"}
                className="input-base w-full text-lg font-bold"
            />
            
            {/* 跑步類型選擇（僅在跑步模式下顯示） */}
            {editForm.type === 'run' && (
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 flex items-center gap-1">選擇跑步類型（AI 將依此生成課表）</label>
                    <div className="grid grid-cols-5 gap-2">
                            {[
                                { value: 'Easy', label: '👟 輕鬆', color: 'bg-green-600', selected: editForm.runType === 'Easy' },
                                { value: 'Interval', label: '🐇 間歇', color: 'bg-red-600', selected: editForm.runType === 'Interval' },
                                { value: '10-20-30', label: '⏱️ 10-20-30', color: 'bg-pink-600', selected: editForm.runType === '10-20-30' },
                                { value: 'LSD', label: '🐢 LSD', color: 'bg-orange-600', selected: editForm.runType === 'LSD' },
                                { value: 'MP', label: '🔥 MP', color: 'bg-yellow-600', selected: editForm.runType === 'MP' }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => {
                                        const newForm = { ...editForm, runType: type.value };
                                        if (type.value === '10-20-30') {
                                            newForm.runIntervalDuration = '60';
                                            if (!newForm.runIntervalRest) newForm.runIntervalRest = '120';
                                        }
                                        setEditForm(newForm);
                                    }}
                                    className={`py-2 rounded-game text-xs font-bold transition-all border-[3px] min-h-[44px] ${
                                        type.selected 
                                            ? `${type.color} text-white shadow-lg border-transparent` 
                                            : 'bg-[#fafaf8] text-gray-900 border-game-outline hover:bg-game-outline/10'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                    </div>
                    <div className="text-xs font-bold text-gray-800 bg-game-outline/10 p-3 rounded-game border-[3px] border-game-outline">
                        {editForm.runType 
                            ? `已選擇：${
                                editForm.runType === 'Easy' ? '輕鬆跑' : 
                                editForm.runType === 'Interval' ? '間歇跑' : 
                                editForm.runType === '10-20-30' ? '10-20-30 間歇跑' :
                                editForm.runType === 'LSD' ? '長距離跑' : 
                                '馬拉松配速跑'
                            }`
                            : '可選：不選擇則由 AI 自動決定'
                        }
                    </div>
                </div>
            )}
            
            <button
                type="button"
                onClick={() => handleHeadCoachGenerate(editForm.runType)}
                disabled={isGenerating}
                className="btn-primary w-full px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isGenerating ? <Loader size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />}
                {isGenerating ? 'AI 正在思考課表...' : '✨ 請 AI 總教練安排今日課表'}
            </button>
        </div>

        {/* 3. 核心數據區塊 (根據類型切換) */}
        <div className="bg-[#fafaf8] p-4 rounded-game border-[3px] border-game-outline">
            <h4 className="text-xs text-gray-900 uppercase font-bold mb-3 flex items-center gap-1">
                <Gauge size={12} className="text-gray-800" aria-hidden /> 核心資料
            </h4>

            {editForm.type === 'strength' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-800 px-2 uppercase tracking-wider font-bold">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">動作名稱</div>
                        <div className="col-span-2 text-center">組數</div>
                        <div className="col-span-2 text-center">次數</div>
                        <div className="col-span-2 text-center">重量</div>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {editForm.exercises.map((ex, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white/70 p-2 rounded-game border-2 border-game-outline/50 group hover:border-game-grass transition-colors">
                            <div className="col-span-1 w-5 h-5 bg-game-outline/20 rounded-full flex items-center justify-center text-gray-900 font-mono text-xs font-bold mx-auto">{idx + 1}</div>
                            <div className="col-span-5 relative">
                                <input placeholder="動作名稱" value={ex.name} onChange={e => handleExerciseNameChange(idx, e.target.value)} className="input-base w-full text-sm py-1.5" />
                                {ex.targetMuscle && <span className="absolute -bottom-2 left-0 text-[9px] font-bold text-gray-800 bg-game-grass/20 px-1 rounded border border-game-outline/50 flex items-center gap-0.5"><Tag size={8} /> {ex.targetMuscle}</span>}
                            </div>
                            <div className="col-span-2"><input placeholder="3" value={ex.sets} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].sets = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="input-base w-full text-sm text-center py-1.5" /></div>
                            <div className="col-span-2"><input placeholder="10" value={ex.reps} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].reps = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="input-base w-full text-sm text-center py-1.5" /></div>
                            <div className="col-span-2 relative group">
                                <input placeholder="kg" value={ex.weight} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].weight = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="input-base w-full text-sm text-center py-1.5" />
                                <button onClick={() => { const newEx = editForm.exercises.filter((_, i) => i !== idx); setEditForm({...editForm, exercises: newEx}); }} className="absolute -right-6 top-1.5 opacity-0 group-hover:opacity-100 p-1 text-game-heart hover:bg-game-heart/10 rounded transition-all font-bold" aria-label="刪除此動作"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                    <button onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', targetMuscle: '' }] }))} className="w-full py-2.5 border-[3px] border-dashed border-game-outline text-gray-900 hover:border-game-grass hover:bg-game-grass/10 rounded-game text-sm font-bold flex items-center justify-center gap-2 transition-all min-h-[44px]"><Plus size={16} /> 新增動作</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 跑步類型選擇 */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1">跑步類型</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { value: 'Easy', label: '👟 輕鬆', color: 'bg-green-600' },
                                { value: 'Interval', label: '🐇 間歇', color: 'bg-red-600' },
                                { value: '10-20-30', label: '⏱️ 10-20-30', color: 'bg-pink-600' },
                                { value: 'LSD', label: '🐢 LSD', color: 'bg-orange-600' },
                                { value: 'MP', label: '🔥 MP', color: 'bg-yellow-600' }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => {
                                        const newForm = { ...editForm, runType: type.value };
                                        if (type.value === '10-20-30') {
                                            newForm.runIntervalDuration = '60';
                                            if (!newForm.runIntervalRest) newForm.runIntervalRest = '120';
                                        }
                                        setEditForm(newForm);
                                    }}
                                    className={`py-2 rounded-game text-xs font-bold transition-all border-[3px] min-h-[44px] ${
                                        editForm.runType === type.value 
                                            ? `${type.color} text-white shadow-lg border-transparent` 
                                            : 'bg-[#fafaf8] text-gray-900 border-game-outline hover:bg-game-outline/10'
                                    }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 基本資料 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1">距離 (km)</label>
                            <input type="number" step="0.01" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} placeholder="0.00" className="input-base px-3 py-2 text-xl font-bold font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-800 flex items-center gap-1">時間 (分鐘)</label>
                            <input type="number" step="1" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} placeholder="0" className="input-base px-3 py-2 text-xl font-bold font-mono" />
                        </div>
                        <div className="col-span-2 bg-game-outline/10 p-3 rounded-game border-[3px] border-game-outline flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-800">平均配速</span>
                            <div className="flex items-center gap-2 text-gray-900 font-mono font-bold text-lg">
                                <Timer size={16} className="text-gray-800" />
                                {editForm.runPace || "--'--\" /km"}
                            </div>
                        </div>
                    </div>

                    {/* 間歇跑專用欄位 (Interval 或 10-20-30) */}
                    {(editForm.runType === 'Interval' || editForm.runType === '10-20-30') && (
                        <div className={`rounded-game border-[3px] p-4 space-y-3 ${editForm.runType === '10-20-30' ? 'bg-pink-100/50 border-pink-400' : 'bg-red-100/30 border-red-400'}`}>
                            <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                                <Zap size={14} className="text-gray-800" />
                                {editForm.runType === '10-20-30' ? '10-20-30 間歇設定' : '間歇跑設定'}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">{editForm.runType === '10-20-30' ? '區塊數' : '組數'}</label>
                                    <input type="number" step="1" min="1" value={editForm.runIntervalSets} onChange={e => setEditForm({...editForm, runIntervalSets: e.target.value})} placeholder={editForm.runType === '10-20-30' ? "例：3" : "例：8"} className="input-base px-3 py-2 text-lg font-bold font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">{editForm.runType === '10-20-30' ? '衝刺配速' : '每組配速'}</label>
                                    <input type="text" value={editForm.runIntervalPace || ''} onChange={e => setEditForm({...editForm, runIntervalPace: e.target.value})} placeholder="例：4'00&quot; /km" className="input-base px-3 py-2 text-lg font-bold font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">{editForm.runType === '10-20-30' ? '衝刺功率 (W)' : '間歇功率 (W)'}</label>
                                    <input type="number" value={editForm.runIntervalPower || ''} onChange={e => setEditForm({...editForm, runIntervalPower: e.target.value})} placeholder="例：300" className="input-base px-3 py-2 text-lg font-bold font-mono" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">維持時間 (秒)</label>
                                    <input type="number" step="1" min="0" value={editForm.runIntervalDuration} onChange={e => setEditForm({...editForm, runIntervalDuration: e.target.value})} placeholder={editForm.runType === '10-20-30' ? "60 (固定)" : "例：60"} readOnly={editForm.runType === '10-20-30'} className="input-base px-3 py-2 text-lg font-bold font-mono disabled:opacity-70" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">{editForm.runType === '10-20-30' ? '區塊間休息' : '休息時間 (秒)'}</label>
                                    <input type="number" step="1" min="0" value={editForm.runIntervalRest} onChange={e => setEditForm({...editForm, runIntervalRest: e.target.value})} placeholder={editForm.runType === '10-20-30' ? "120" : "例：90"} className="input-base px-3 py-2 text-lg font-bold font-mono" />
                                </div>
                            </div>
                            {editForm.runIntervalSets && (editForm.runIntervalDuration || editForm.runIntervalRest) && (
                                <div className="text-xs font-medium text-gray-900 bg-white/70 p-3 rounded-game border-2 border-game-outline/50">
                                    <span className="font-bold text-gray-900">訓練內容：</span> 
                                    {editForm.runType === '10-20-30' 
                                        ? `${editForm.runIntervalSets} 區塊 (每區塊含 5 組 30-20-10 循環)` 
                                        : `${editForm.runIntervalSets} 組`
                                    }
                                    {editForm.runIntervalPace && <span className="ml-2 font-medium text-gray-800">{editForm.runType === '10-20-30' ? '衝刺配速：' : '每組配速：'}{editForm.runIntervalPace}</span>}
                                    {editForm.runIntervalPower && <span className="ml-2 font-medium text-gray-800">功率：{editForm.runIntervalPower}W</span>}
                                    {editForm.runIntervalDuration && <span className="ml-2 font-medium text-gray-800">維持：{editForm.runIntervalDuration}秒</span>}
                                    {editForm.runIntervalRest && <span className="ml-2 font-medium text-gray-800">休息：{editForm.runIntervalRest}秒</span>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* 4. 詳細數據區塊 (兩欄排列) */}
        <div className="bg-[#fafaf8] p-4 rounded-game border-[3px] border-game-outline">
            <h4 className="text-xs text-gray-900 uppercase font-bold mb-3 flex items-center gap-1">
                <Activity size={12} className="text-gray-800" /> 詳細資料
            </h4>
            <div className="grid grid-cols-2 gap-4">
                {editForm.type === 'strength' && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800">總時間 (分)</label>
                        <input type="number" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} className="input-base w-full py-2 text-sm" />
                    </div>
                )}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><Flame size={10} /> 卡路里 (kcal)</label>
                    <input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: e.target.value})} className="input-base w-full py-2 text-sm" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><Heart size={10} /> 平均心率 (bpm)</label>
                    <input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="input-base w-full py-2 text-sm" />
                </div>
                {editForm.type === 'run' && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><Zap size={10} /> 平均功率 (W)</label>
                        <input type="number" value={editForm.runPower} onChange={e => setEditForm({...editForm, runPower: e.target.value})} className="input-base w-full py-2 text-sm" />
                    </div>
                )}
                <div className="space-y-2 col-span-2">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><BarChart2 size={10} /> 自覺強度 (RPE 1-10)</label>
                    <div className="space-y-2">
                        <input 
                            type="range" 
                            min="1" max="10" step="1"
                            value={editForm.rpe || editForm.runRPE || 5} 
                            onChange={e => { const rpeValue = parseInt(e.target.value); setEditForm({...editForm, rpe: rpeValue, runRPE: rpeValue}); }} 
                            className="w-full h-2.5 bg-game-outline/20 rounded-lg appearance-none cursor-pointer accent-game-grass border-2 border-game-outline" 
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-800">1 (極輕鬆)</span>
                            <span className="text-lg font-bold text-gray-900">{editForm.rpe || editForm.runRPE || 5}</span>
                            <span className="text-xs font-bold text-gray-800">10 (極限)</span>
                        </div>
                        {(editForm.rpe || editForm.runRPE) && (
                            <p className="text-xs font-medium text-gray-800 text-center">
                                {getRPEDescription(parseInt(editForm.rpe || editForm.runRPE))}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* 5. 備註與裝備 */}
        <div className="bg-[#fafaf8] p-4 rounded-game border-[3px] border-game-outline space-y-4">
             {editForm.type === 'run' && (
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><ShoppingBag size={12} /> 選擇跑鞋</label>
                    <select value={editForm.gearId} onChange={e => setEditForm({...editForm, gearId: e.target.value})} className="input-base w-full py-2 text-sm appearance-none">
                        <option value="">-- 未指定 --</option>
                        {gears.filter(g => g.status === 'active' || g.id === editForm.gearId).map(g => (
                            <option key={g.id} value={g.id}>{g.brand} {g.model}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1"><AlignLeft size={12} /> 備註 / 心得</label>
                <textarea rows="3" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="input-base w-full py-2 text-sm resize-none" placeholder="今天狀況如何..." />
            </div>
        </div>
    </div>
  );
}