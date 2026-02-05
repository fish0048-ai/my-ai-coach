/**
 * 匯入 / 匯出 / 同步區塊
 * 行事曆頂部操作按鈕組
 */
import React, { useRef } from 'react';
import { RefreshCw, Upload, Download, Loader } from 'lucide-react';

export default function ImportSection({
  onSync,
  onExport,
  onFileUpload,
  isSyncing = false,
  fileLoading = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    onFileUpload?.(e);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, .fit"
        className="hidden"
      />
      <button
        onClick={onSync}
        disabled={isSyncing || fileLoading}
        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors border border-blue-500 disabled:opacity-50"
      >
        {isSyncing ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        <span className="hidden md:inline">同步</span>
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600"
        title="匯入 Garmin/運動APP CSV 或 FIT"
      >
        <Upload size={16} /> <span className="hidden md:inline">匯入檔案</span>
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors border border-gray-600"
        title="下載雲端資料備份 (CSV)"
      >
        <Download size={16} /> <span className="hidden md:inline">備份</span>
      </button>
    </>
  );
}
