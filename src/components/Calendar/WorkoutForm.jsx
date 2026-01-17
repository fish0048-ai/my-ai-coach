import React from 'react';
import { Dumbbell, Activity, Sparkles, Loader, Plus, Trash2, Timer, Flame, Heart, BarChart2, AlignLeft, ShoppingBag, Tag } from 'lucide-react';

export default function WorkoutForm({ editForm, setEditForm, gears, handleHeadCoachGenerate, isGenerating, handleExerciseNameChange }) {
  return (
    <div className="space-y-6">
        <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 mb-4">
            <button onClick={() => setEditForm(prev => ({ ...prev, type: 'strength' }))} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'strength' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Dumbbell size={16} /> 重量訓練</button>
            <button onClick={() => setEditForm(prev => ({ ...prev, type: 'run' }))} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${editForm.type === 'run' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Activity size={16} /> 跑步有氧</button>
        </div>

        <div>
            <label className="text-xs text-gray-500 uppercase font-semibold mb-1 block">標題 / 備註</label>
            <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder={editForm.type === 'run' ? "例如：晨跑 5K" : "例如：腿部轟炸日"} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 outline-none" />
        </div>

        {/* AI 按鈕 */}
        <div className={`p-4 rounded-xl border mb-4 ${editForm.type === 'run' ? 'bg-orange-900/30 border-orange-500/30' : 'bg-purple-900/30 border-purple-500/30'}`}>
            <label className={`text-xs uppercase font-semibold mb-2 block flex items-center gap-1 ${editForm.type === 'run' ? 'text-orange-300' : 'text-purple-300'}`}><Sparkles size={12} /> AI 總教練排程</label>
            <button onClick={handleHeadCoachGenerate} disabled={isGenerating} className={`w-full text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${editForm.type === 'run' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                為今日安排最佳{editForm.type === 'run' ? '跑步' : '重訓'}
            </button>
        </div>

        {editForm.type === 'strength' ? (
            <div className="space-y-3">
                <div className="flex justify-between items-center"><label className="text-xs text-gray-500 uppercase font-semibold">動作清單</label><button onClick={() => setEditForm(prev => ({ ...prev, exercises: [...prev.exercises, { name: '', sets: 3, reps: '10', weight: '', targetMuscle: '' }] }))} className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"><Plus size={12} /> 新增動作</button></div>
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 px-2 uppercase"><div className="col-span-1 text-center">#</div><div className="col-span-4">動作名稱</div><div className="col-span-2 text-center">組數</div><div className="col-span-2 text-center">次數</div><div className="col-span-2 text-center">重量</div><div className="col-span-1"></div></div>
                {editForm.exercises.map((ex, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-800 p-2 rounded-lg border border-gray-700 group">
                    <div className="col-span-1 w-6 h-6 bg-gray-700 rounded flex items-center justify-center text-gray-400 font-mono text-xs mx-auto">{idx + 1}</div>
                    <div className="col-span-4 relative"><input placeholder="動作名稱" value={ex.name} onChange={e => handleExerciseNameChange(idx, e.target.value)} className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600" />{ex.targetMuscle && <span className="absolute -bottom-3 left-0 text-[10px] text-green-400 bg-green-900/30 px-1 rounded flex items-center gap-0.5"><Tag size={8} /> {ex.targetMuscle}</span>}</div>
                    <div className="col-span-2"><input placeholder="3" value={ex.sets} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].sets = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                    <div className="col-span-2"><input placeholder="10" value={ex.reps} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].reps = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                    <div className="col-span-2"><input placeholder="kg" value={ex.weight} onChange={e => { const newEx = [...editForm.exercises]; newEx[idx].weight = e.target.value; setEditForm({...editForm, exercises: newEx}); }} className="w-full bg-gray-900 text-white text-sm text-center rounded border border-gray-700 py-1" /></div>
                    <div className="col-span-1 text-center"><button onClick={() => { const newEx = editForm.exercises.filter((_, i) => i !== idx); setEditForm({...editForm, exercises: newEx}); }} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-700"><Trash2 size={16} /></button></div>
                </div>
                ))}
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">距離 (km)</label><input type="number" step="0.01" value={editForm.runDistance} onChange={e => setEditForm({...editForm, runDistance: e.target.value})} placeholder="0.00" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" /></div>
                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">時間 (分鐘)</label><input type="number" step="1" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} placeholder="0" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 focus:border-orange-500 outline-none font-mono text-lg" /></div>
                <div className="col-span-2 bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between"><div><div className="text-xs text-gray-500 uppercase">平均配速 (自動計算)</div><div className="text-xl font-bold text-orange-400 font-mono">{editForm.runPace || '--\'--" /km'}</div></div><Timer className="text-orange-500 opacity-20" size={32} /></div>
            </div>
        )}

        {/* 通用詳細數據 */}
        <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-2 gap-4">
            <h4 className="col-span-2 text-xs text-gray-500 uppercase font-semibold mb-1">訓練數據總覽 (選填)</h4>
            {/* 重訓模式下顯示總時間，跑步模式上方已顯示 */}
            {editForm.type === 'strength' && <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Timer size={12} /> 總時間 (分)</label><input type="number" value={editForm.runDuration} onChange={e => setEditForm({...editForm, runDuration: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="60" /></div>}
            
            <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Flame size={12} /> 卡路里 (kcal)</label><input type="number" value={editForm.calories} onChange={e => setEditForm({...editForm, calories: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="300" /></div>
            <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><Heart size={12} /> 平均心率 (bpm)</label><input type="number" value={editForm.runHeartRate} onChange={e => setEditForm({...editForm, runHeartRate: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="130" /></div>
            {editForm.type === 'run' && (
                <div className="space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold">平均功率 (W)</label><input type="number" value={editForm.runPower} onChange={e => setEditForm({...editForm, runPower: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none" placeholder="200" /></div>
            )}
            <div className="space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><BarChart2 size={12} /> RPE (1-10)</label><input type="number" min="1" max="10" value={editForm.runRPE} onChange={e => setEditForm({...editForm, runRPE: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none" placeholder="7" /></div>
            
            {editForm.type === 'run' && (
                <div className="col-span-2 space-y-1"><label className="text-xs text-gray-500 uppercase font-semibold flex items-center gap-1"><ShoppingBag size={12} /> 選擇裝備 (跑鞋)</label><select value={editForm.gearId} onChange={e => setEditForm({...editForm, gearId: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-orange-500 outline-none appearance-none"><option value="">-- 未指定 --</option>{gears.filter(g => g.status === 'active' || g.id === editForm.gearId).map(g => (<option key={g.id} value={g.id}>{g.brand} {g.model}</option>))}</select></div>
            )}
            
            <div className="col-span-2 space-y-1"><label className="text-xs text-gray-500 flex items-center gap-1"><AlignLeft size={12} /> 備註</label><textarea rows="2" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 outline-none resize-none" placeholder="訓練心得..." /></div>
        </div>
    </div>
  );
}