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
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
            <button 
                onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))} 
                className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'strength' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <Dumbbell size={16} /> 重量訓練
            </button>
            <button 
                onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))} 
                className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'run' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
                <Activity size={16} /> 跑步有氧
            </button>
        </div>

        {/* 2. 標題與 AI 按鈕 */}
        <div className="space-y-3">
            <input 
                type="text" 
                value={editForm.title} 
                onChange={e => setEditForm({...editForm, title: e.target.value})} 
                placeholder={editForm.type === 'run' ? "標題 (例：晨跑 5K)" : "標題 (例：腿部轟炸日)"} 
                className="w-full bg-gray-800 text-white text-lg font-bold border border-gray-700 rounded-xl px-4 py-3 focus:border-blue-500 outline-none" 
            />
            
            <button 
                onClick={handleHeadCoachGenerate} 
                disabled={isGenerating} 
                className={`w-full text-white px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/10 shadow-lg ${editForm.type === 'run' ? 'bg-gradient-to-r from-orange-600 to-red-600' : 'bg-gradient-to-r from-purple-600 to-blue-600'}`}
            >
                {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? 'AI 正在思考課表...' : '✨ 請 AI 總教練安排今日課表'}
            </button>
        </div>

        {/* 3. 核心數據區塊 (根據類型切換) */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <h4 className="text-xs text-gray-500 uppercase font-semibold mb-3 flex items-center gap-1">
                <Gauge size={12}/> 核心資料
            </h4>

            {editForm.type === 'strength' ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 px-2 uppercase tracking-wider font-bold">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-5">動作名稱</div>
                        <div className="col-span-2 text-center">組數</div>
                        <div className="col-span-2 text-center">次數</div>
                        <div className="col-span-2 text-center">重量</div>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {editForm.exercises.map((ex, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800 p-2 rounded-lg border border-gray-700 group hover:border-blue-500 transition-colors">
                            <div className="col-span-1 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 font-mono text-xs mx-auto">{idx + 1}</div>
                            <div className="col-span-5 relative">
                                <input placeholder="動作名稱" value={ex.name} onChange={e => handleExerciseNameChange(idx, e.target.value)} className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600 font-medium" />
                                {ex.targetMuscle && <span className="absolute -bottom-2 left-0 text-[9px] text-green-400 bg-green-900/30 px-1 rounded flex items-center gap-0.5"><Tag size={8} /> {ex.targetMuscle}</span>}
                            </div>
                            <div className="col-span-2"><input placeholder="3" value={ex.sets} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].sets = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900/50 text-white text-sm text-center rounded border border-gray-600 focus:border-blue-500 py-1" /></div>
                            <div className="col-span-2"><input placeholder="10" value={ex.reps} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].reps = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900/50 text-white text-sm text-center rounded border border-gray-600 focus:border-blue-500 py-1" /></div>
                            <div className="col-span-2 relative group">
                                <input placeholder="kg" value={ex.weight} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].weight = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900/50 text-white text-sm text-center rounded border border-gray-600 focus:border-blue-500 py-1" />
                                <button onClick={() => { const newEx = editForm.exercises.filter((_, i) => i !== idx); setEditForm({...editForm, exercises: newEx}); }} className="absolute -right-6 top-1.5 opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-gray-700 rounded transition-all"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        ))}
                    </div>
                    <button onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', targetMuscle: '' }] }))} className="w-full py-2 border-2 border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-blue-500 hover:bg-gray-800 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"><Plus size={16} /> 新增動作</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* 跑步類型選擇 */}
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 flex items-center gap-1">跑步類型</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'Easy', label: '👟 輕鬆', color: 'bg-green-600' },
                                { value: 'Interval', label: '🐇 間歇', color: 'bg-red-600' },
                                { value: 'LSD', label: '🐢 LSD', color: 'bg-orange-600' },
                                { value: 'MP', label: '🔥 MP', color: 'bg-yellow-600' }
                            ].map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setEditForm({...editForm, runType: type.value})}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                                        editForm.runType === type.value 
                                            ? `${type.color} text-white shadow-lg` 
                                            : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
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
                            <label className="text-xs text-gray-400 flex items-center gap-1">距離 (km)</label>
                            <input type="number" step="0.01" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} placeholder="0.00" className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-xl font-bold font-mono focus:border-orange-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-400 flex items-center gap-1">時間 (分鐘)</label>
                            <input type="number" step="1" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} placeholder="0" className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-xl font-bold font-mono focus:border-orange-500 outline-none" />
                        </div>
                        <div className="col-span-2 bg-gray-800 p-3 rounded-lg border border-gray-600 flex justify-between items-center">
                            <span className="text-xs text-gray-400">平均配速</span>
                            <div className="flex items-center gap-2 text-orange-400 font-mono font-bold text-lg">
                                <Timer size={16} />
                                {editForm.runPace || "--'--\" /km"}
                            </div>
                        </div>
                    </div>

                    {/* 間歇跑專用欄位 */}
                    {editForm.runType === 'Interval' && (
                        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                                <Zap size={14} />
                                間歇跑設定
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 flex items-center gap-1">組數</label>
                                    <input 
                                        type="number" 
                                        step="1" 
                                        min="1"
                                        value={editForm.runIntervalSets} 
                                        onChange={e => setEditForm({...editForm, runIntervalSets: e.target.value})} 
                                        placeholder="例：8" 
                                        className="w-full bg-gray-900 text-white border border-red-600/50 rounded-lg px-3 py-2 text-lg font-bold font-mono focus:border-red-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 flex items-center gap-1">休息時間 (秒)</label>
                                    <input 
                                        type="number" 
                                        step="1" 
                                        min="0"
                                        value={editForm.runIntervalRest} 
                                        onChange={e => setEditForm({...editForm, runIntervalRest: e.target.value})} 
                                        placeholder="例：90" 
                                        className="w-full bg-gray-900 text-white border border-red-600/50 rounded-lg px-3 py-2 text-lg font-bold font-mono focus:border-red-500 outline-none" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-400 flex items-center gap-1">每組配速</label>
                                    <input 
                                        type="text" 
                                        value={editForm.runIntervalPace || ''} 
                                        onChange={e => setEditForm({...editForm, runIntervalPace: e.target.value})} 
                                        placeholder="例：4'00\" /km" 
                                        className="w-full bg-gray-900 text-white border border-red-600/50 rounded-lg px-3 py-2 text-lg font-bold font-mono focus:border-red-500 outline-none" 
                                    />
                                </div>
                            </div>
                            {editForm.runIntervalSets && editForm.runIntervalRest && (
                                <div className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded border border-gray-700">
                                    <span className="text-red-400 font-bold">訓練內容：</span> {editForm.runIntervalSets} 組 × 休息 {editForm.runIntervalRest} 秒
                                    {editForm.runIntervalPace && (
                                        <span className="ml-2 text-red-300">每組配速：{editForm.runIntervalPace}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* 4. 詳細數據區塊 (兩欄排列) */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <h4 className="text-xs text-gray-500 uppercase font-semibold mb-3 flex items-center gap-1">
                <Activity size={12}/> 詳細資料
            </h4>
            <div className="grid grid-cols-2 gap-4">
                {/* 重訓模式才顯示總時間 */}
                {editForm.type === 'strength' && (
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500">總時間 (分)</label>
                        <input type="number" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                    </div>
                )}
                
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center gap-1"><Flame size={10}/> 卡路里 (kcal)</label>
                    <input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center gap-1"><Heart size={10}/> 平均心率 (bpm)</label>
                    <input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-blue-500 outline-none" />
                </div>
                {editForm.type === 'run' && (
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1"><Zap size={10}/> 平均功率 (W)</label>
                        <input type="number" value={editForm.runPower} onChange={e => setEditForm({...editForm, runPower: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:border-orange-500 outline-none" />
                    </div>
                )}
                <div className="space-y-2 col-span-2">
                    <label className="text-xs text-gray-500 flex items-center gap-1"><BarChart2 size={10}/> 自覺強度 (RPE 1-10)</label>
                    <div className="space-y-2">
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="1"
                            value={editForm.rpe || editForm.runRPE || 5} 
                            onChange={e => {
                                const rpeValue = parseInt(e.target.value);
                                setEditForm({...editForm, rpe: rpeValue, runRPE: rpeValue});
                            }} 
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                        />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">1 (極輕鬆)</span>
                            <span className="text-lg font-bold text-blue-400">{editForm.rpe || editForm.runRPE || 5}</span>
                            <span className="text-xs text-gray-400">10 (極限)</span>
                        </div>
                        {editForm.rpe || editForm.runRPE ? (
                            <p className="text-xs text-gray-500 text-center">
                                {getRPEDescription(parseInt(editForm.rpe || editForm.runRPE))}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>

        {/* 5. 備註與裝備 */}
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 space-y-4">
             {editForm.type === 'run' && (
                <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex items-center gap-1"><ShoppingBag size={12} /> 選擇跑鞋</label>
                    <select value={editForm.gearId} onChange={e => setEditForm({...editForm, gearId: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-600 rounded px-3 py-2 text-sm focus:border-orange-500 outline-none appearance-none">
                        <option value="">-- 未指定 --</option>
                        {gears.filter(g => g.status === 'active' || g.id === editForm.gearId).map(g => (
                            <option key={g.id} value={g.id}>{g.brand} {g.model}</option>
                        ))}
                    </select>
                </div>
            )}
            
            <div className="space-y-1">
                <label className="text-xs text-gray-500 flex items-center gap-1"><AlignLeft size={12} /> 備註 / 心得</label>
                <textarea rows="3" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full bg-gray-900 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" placeholder="今天狀況如何..." />
            </div>
        </div>
    </div>
  );
}