import React, { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2, Loader, Filter, RefreshCw } from 'lucide-react';
import { useViewStore } from '../store/viewStore';
import { handleError } from '../services/core/errorService';
import {
  addKnowledgeRecord,
  listKnowledgeRecords,
  deleteKnowledgeRecord,
  backfillEmbeddingsForExistingRecords,
} from '../services/ai/knowledgeBaseService';

const TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'note', label: '訓練日記' },
  { value: 'injury', label: '傷痛紀錄' },
  { value: 'rehab', label: '復健建議' },
];

const TYPE_LABEL_MAP = {
  note: '訓練日記',
  injury: '傷痛紀錄',
  rehab: '復健建議',
};

export default function KnowledgeBaseView() {
  const setCurrentView = useViewStore((state) => state.setCurrentView);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [newType, setNewType] = useState('note');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newText, setNewText] = useState('');
  const [saving, setSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const loadRecords = async (type = filterType) => {
    setLoading(true);
    try {
      const data = await listKnowledgeRecords({ limitCount: 100, type });
      setRecords(data);
    } catch (error) {
      handleError(error, { context: 'KnowledgeBaseView', operation: 'loadRecords' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords('all');
  }, []);

  const handleFilterChange = async (value) => {
    setFilterType(value);
    await loadRecords(value);
  };

  const handleCreate = async () => {
    if (!newText.trim()) {
      handleError('請輸入內容再新增紀錄', { context: 'KnowledgeBaseView', operation: 'handleCreate' });
      return;
    }

    setSaving(true);
    try {
      await addKnowledgeRecord({
        type: newType,
        text: newText.trim(),
        metadata: {
          date: newDate,
          typeLabel: TYPE_LABEL_MAP[newType] || '紀錄',
          source: 'manual',
        },
      });
      setNewText('');
      await loadRecords(filterType);
    } catch (error) {
      handleError(error, { context: 'KnowledgeBaseView', operation: 'handleCreate' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillEmbeddings = async () => {
    setBackfilling(true);
    try {
      const { updated, failed } = await backfillEmbeddingsForExistingRecords({ batchSize: 5 });
      const msg = updated > 0
        ? `已完成。更新 ${updated} 筆紀錄的向量。${failed > 0 ? ` ${failed} 筆失敗。` : ''}`
        : failed > 0
          ? `更新失敗 ${failed} 筆。請確認已設定 API Key。`
          : '所有紀錄已具備向量，無需更新。';
      alert(msg);
      await loadRecords(filterType);
    } catch (error) {
      handleError(error, { context: 'KnowledgeBaseView', operation: 'handleBackfillEmbeddings' });
      alert('更新向量失敗，請稍後再試。');
    } finally {
      setBackfilling(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('確定刪除這筆紀錄嗎？此動作無法復原。');
    if (!ok) return;

    try {
      await deleteKnowledgeRecord(id);
      await loadRecords(filterType);
    } catch (error) {
      handleError(error, { context: 'KnowledgeBaseView', operation: 'handleDelete' });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-game-grass" aria-hidden />
            個人知識庫（AI 記憶）
          </h1>
          <p className="text-sm text-gray-700 mt-1 font-medium">
            將重要的訓練日記、傷痛紀錄與復健建議收進這裡，AI 教練回答問題時會優先參考這些內容。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackfillEmbeddings}
            disabled={backfilling || records.length === 0}
            className="text-xs text-gray-700 hover:text-game-grass flex items-center gap-1 disabled:opacity-50 font-medium"
            title="為缺少向量的舊紀錄產生 embedding（需 API Key）"
          >
            {backfilling ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            更新向量
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('dashboard')}
            className="text-xs text-gray-700 hover:text-gray-900 underline underline-offset-4 font-medium"
          >
            回到 Dashboard
          </button>
        </div>
      </div>

      {/* 新增表單 */}
      <div className="card-base p-5 space-y-4 border-[3px] border-game-outline">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="text-game-grass" size={18} aria-hidden />
          <h2 className="text-sm font-semibold text-gray-900">新增紀錄</h2>
        </div>
        <p className="text-xs text-gray-700 mb-2 font-medium">
          建議記下：長期困擾的傷痛、物理治療師給的重點、賽前/賽後身體反應等。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">類型</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="input-base w-full text-sm"
            >
              <option value="note">訓練日記</option>
              <option value="injury">傷痛紀錄</option>
              <option value="rehab">復健建議</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">日期</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input-base w-full text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">內容</label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              rows={2}
              placeholder="例：2024/12/20 長距離後左膝外側緊繃，物理治療師建議加強臀中肌訓練與泡滾筒。"
              className="input-base w-full text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader size={14} className="animate-spin" aria-hidden /> : <Plus size={14} aria-hidden />}
            新增到知識庫
          </button>
        </div>
      </div>

      {/* 篩選 & 列表 */}
      <div className="card-base p-5 border-[3px] border-game-outline">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={14} className="text-game-grass" aria-hidden />
            <span>篩選類型：</span>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFilterChange(opt.value)}
                  className={`px-3 py-2 rounded-game text-xs font-medium min-h-[44px] border-[3px] ${
                    filterType === opt.value
                      ? 'bg-game-grass border-game-grass text-game-outline'
                      : 'bg-[#fafaf8] border-game-outline text-gray-800 hover:bg-game-grass/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs font-medium text-gray-700">
            共 {records.length} 筆紀錄（僅顯示最近 100 筆）
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="card-base rounded-game border-[3px] border-game-outline px-6 py-4 flex items-center gap-3 shadow-card">
              <Loader size={20} className="animate-spin text-game-grass" aria-hidden />
              <span className="text-gray-900 font-bold">載入中...</span>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center text-sm font-medium text-gray-700">
            目前尚無紀錄。可以從上方新增，或之後從 Calendar / Profile 自動寫入重要事件。
          </div>
        ) : (
                  <div className="space-y-3">
            {records.map((rec) => {
              const date =
                rec.metadata?.date ||
                (rec.createdAt ? String(rec.createdAt).slice(0, 10) : '未知日期');
              const typeLabel =
                rec.metadata?.typeLabel || TYPE_LABEL_MAP[rec.type] || '紀錄';
              return (
                <div
                  key={rec.id}
                  className="flex items-start justify-between gap-3 bg-[#fafaf8] border-[3px] border-game-outline rounded-game px-4 py-3 shadow-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-600">{date}</span>
                      <span className="px-2 py-0.5 rounded-game text-[10px] font-medium bg-game-grass/20 text-game-grass border-2 border-game-outline/50">
                        {typeLabel}
                      </span>
                      {rec.metadata?.source === 'calendar' && (
                        <span className="px-2 py-0.5 rounded-game text-[10px] font-medium bg-game-coin/10 text-game-coin border-2 border-game-outline/50">
                          來自行事曆
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words font-medium">
                      {rec.text}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(rec.id)}
                    className="text-gray-700 hover:text-game-heart flex-shrink-0 p-2 rounded-game hover:bg-game-heart/10 border-2 border-game-outline/50 min-h-[44px] font-medium"
                    title="刪除紀錄"
                    aria-label="刪除此筆紀錄"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

