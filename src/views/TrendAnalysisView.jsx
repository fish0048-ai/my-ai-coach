import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Plus, Trash2, Calendar, TrendingUp, TrendingDown, Activity, ChevronDown } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

// --- 簡易 SVG 圖表組件 (不需額外安裝套件) ---
const SimpleLineChart = ({ data, dataKey, color, unit }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800/30">
        <LineChart size={48} className="mb-4 opacity-50" />
        <p>需要至少兩筆資料才能繪製趨勢圖</p>
      </div>
    );
  }

  // 1. 計算數值範圍以決定 Y 軸刻度
  const values = data.map(d => Number(d[dataKey]));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.1 || 1; // 上下留白
  const yMin = Math.floor(minVal - padding);
  const yMax = Math.ceil(maxVal + padding);

  // 2. 座標轉換函式
  const width = 800;
  const height = 300;
  const getX = (index) => (index / (data.length - 1)) * width;
  const getY = (val) => height - ((val - yMin) / (yMax - yMin)) * height;

  // 3. 產生路徑 (Path)
  const points = data.map((d, i) => `${getX(i)},${getY(d[dataKey])}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px] relative p-4 bg-gray-800 rounded-xl border border-gray-700 shadow-inner">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* 背景格線 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height * ratio;
            const val = yMax - (ratio * (yMax - yMin));
            return (
              <g key={ratio}>
                <line x1="0" y1={y} x2={width} y2={y} stroke="#374151" strokeDasharray="4" />
                <text x="-10" y={y + 4} fill="#9CA3AF" fontSize="12" textAnchor="end">
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* 折線 */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            points={points}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-lg"
          />

          {/* 數據點與 Tooltip */}
          {data.map((d, i) => (
            <g key={d.id} className="group">
              <circle
                cx={getX(i)}
                cy={getY(d[dataKey])}
                r="6"
                fill="#1F2937"
                stroke={color}
                strokeWidth="3"
                className="cursor-pointer transition-all group-hover:r-8"
              />
              {/* Hover 顯示數值 */}
              <foreignObject x={getX(i) - 50} y={getY(d[dataKey]) - 50} width="100" height="50" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg border border-gray-600 whitespace-nowrap">
                      {d.date}<br/>
                      <span className="font-bold">{d[dataKey]} {unit}</span>
                    </div>
                 </div>
              </foreignObject>
            </g>
          ))}
        </svg>
        
        {/* X 軸標籤 (日期) */}
        <div className="flex justify-between mt-2 text-xs text-gray-400 px-2">
           <span>{data[0].date}</span>
           <span>{data[data.length - 1].date}</span>
        </div>
      </div>
    </div>
  );
};

export default function TrendAnalysisView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricType, setMetricType] = useState('weight'); // 'weight' or 'bodyFat'
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 表單狀態
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputWeight, setInputWeight] = useState('');
  const [inputFat, setInputFat] = useState('');

  // 1. 讀取資料 (Firestore Realtime)
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'body_logs'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. 新增紀錄
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return alert('請先登入');
    
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'body_logs'), {
        date: inputDate,
        weight: parseFloat(inputWeight) || 0,
        bodyFat: parseFloat(inputFat) || 0,
        createdAt: serverTimestamp()
      });
      // 清空表單
      setInputWeight('');
      setInputFat('');
      setShowAddForm(false);
    } catch (err) {
      console.error("Error adding doc:", err);
      alert("新增失敗");
    }
  };

  // 3. 刪除紀錄
  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除這筆紀錄嗎？')) return;
    try {
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'body_logs', id));
    } catch (err) {
      console.error(err);
    }
  };

  // 4. 計算統計數據
  const stats = useMemo(() => {
    if (logs.length === 0) return null;
    const current = logs[logs.length - 1];
    const prev = logs.length > 1 ? logs[logs.length - 2] : current;
    
    const valKey = metricType === 'weight' ? 'weight' : 'bodyFat';
    const diff = (current[valKey] - prev[valKey]).toFixed(1);
    const isUp = current[valKey] > prev[valKey];
    
    return {
      current: current[valKey],
      diff: diff,
      isUp: isUp,
      highest: Math.max(...logs.map(l => l[valKey])),
      lowest: Math.min(...logs.map(l => l[valKey]))
    };
  }, [logs, metricType]);

  const config = {
    weight: { label: '體重', unit: 'kg', color: '#60A5FA', bg: 'bg-blue-500/10' }, // Blue
    bodyFat: { label: '體脂率', unit: '%', color: '#34D399', bg: 'bg-green-500/10' } // Green
  };

  const activeConfig = config[metricType];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn p-4 md:p-0">
      {/* 標題區 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <LineChart className="text-purple-400" />
            身體數據趨勢
          </h2>
          <p className="text-gray-400 text-sm">追蹤您的長期變化，掌握進步軌跡</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium shadow-lg shadow-purple-900/20"
        >
          <Plus size={18} /> 新增紀錄
        </button>
      </div>

      {/* 新增表單 (摺疊式) */}
      {showAddForm && (
        <form onSubmit={handleAddLog} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 animate-slideUp">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">日期</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 text-gray-500" size={16} />
                <input 
                  type="date" 
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-2 pl-10 pr-4 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">體重 (kg)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="例如: 70.5"
                required
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-2 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">體脂率 (%)</label>
              <input 
                type="number" 
                step="0.1"
                placeholder="例如: 20.5"
                value={inputFat}
                onChange={(e) => setInputFat(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl py-2 px-4 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">取消</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">儲存</button>
          </div>
        </form>
      )}

      {/* 數據切換與統計卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左側：控制與統計 */}
        <div className="lg:col-span-1 space-y-4">
           {/* 切換按鈕 */}
           <div className="bg-gray-800 p-1 rounded-xl flex">
              <button 
                onClick={() => setMetricType('weight')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${metricType === 'weight' ? 'bg-gray-700 text-blue-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                體重
              </button>
              <button 
                onClick={() => setMetricType('bodyFat')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${metricType === 'bodyFat' ? 'bg-gray-700 text-green-400 shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                體脂率
              </button>
           </div>

           {/* 統計資訊 */}
           {stats && (
             <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5 space-y-4">
                <div>
                   <p className="text-gray-400 text-xs">目前{activeConfig.label}</p>
                   <div className="flex items-end gap-2">
                      <span className="text-3xl font-bold text-white">{stats.current}</span>
                      <span className="text-sm text-gray-500 mb-1">{activeConfig.unit}</span>
                   </div>
                   {stats.diff !== '0.0' && (
                     <div className={`flex items-center text-xs mt-1 ${stats.isUp ? 'text-red-400' : 'text-green-400'}`}>
                        {stats.isUp ? <TrendingUp size={12} className="mr-1"/> : <TrendingDown size={12} className="mr-1"/>}
                        {Math.abs(stats.diff)} {activeConfig.unit} (較上次)
                     </div>
                   )}
                </div>
                <div className="pt-4 border-t border-gray-700 grid grid-cols-2 gap-2">
                   <div>
                      <p className="text-gray-500 text-[10px]">歷史最高</p>
                      <p className="text-white font-bold">{stats.highest} {activeConfig.unit}</p>
                   </div>
                   <div>
                      <p className="text-gray-500 text-[10px]">歷史最低</p>
                      <p className="text-white font-bold">{stats.lowest} {activeConfig.unit}</p>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* 右側：圖表區 */}
        <div className="lg:col-span-3">
           <SimpleLineChart 
              data={logs} 
              dataKey={metricType} 
              color={activeConfig.color}
              unit={activeConfig.unit}
           />
        </div>
      </div>

      {/* 歷史紀錄列表 */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-900/50 border-b border-gray-700 font-bold text-white flex items-center gap-2">
           <Activity size={18} className="text-gray-400"/> 詳細紀錄
        </div>
        <div className="max-h-64 overflow-y-auto">
           {loading ? (
             <p className="p-4 text-center text-gray-500">載入中...</p>
           ) : logs.length === 0 ? (
             <p className="p-8 text-center text-gray-500">尚無紀錄，請點擊上方「新增紀錄」開始追蹤。</p>
           ) : (
             <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-gray-800/50 text-xs uppercase text-gray-500 sticky top-0">
                   <tr>
                      <th className="px-6 py-3">日期</th>
                      <th className="px-6 py-3">體重</th>
                      <th className="px-6 py-3">體脂率</th>
                      <th className="px-6 py-3 text-right">操作</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                   {logs.slice().reverse().map((log) => (
                      <tr key={log.id} className="hover:bg-gray-700/50 transition-colors">
                         <td className="px-6 py-3 font-mono text-white">{log.date}</td>
                         <td className="px-6 py-3 text-blue-300 font-bold">{log.weight} kg</td>
                         <td className="px-6 py-3 text-green-300 font-bold">{log.bodyFat || '-'} %</td>
                         <td className="px-6 py-3 text-right">
                            <button 
                              onClick={() => handleDelete(log.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors p-1"
                            >
                               <Trash2 size={16} />
                            </button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
           )}
        </div>
      </div>
    </div>
  );
}