import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, Edit2, Calendar, Activity, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function GearView() {
  const [gears, setGears] = useState([]);
  const [runLogs, setRunLogs] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGear, setEditingGear] = useState(null);

  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    type: 'shoes', 
    startDate: new Date().toISOString().split('T')[0],
    maxDistance: 800, 
    status: 'active' 
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'users', user.uid, 'gears'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gearData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGears(gearData);
      setLoading(false);
    });

    fetchRunLogs(user.uid);

    return () => unsubscribe();
  }, []);

  const fetchRunLogs = async (uid) => {
    try {
      const q = query(
        collection(db, 'users', uid, 'calendar'),
        where('type', '==', 'run'),
        where('status', '==', 'completed')
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        date: doc.data().date,
        distance: parseFloat(doc.data().runDistance || 0)
      }));
      setRunLogs(logs);
    } catch (err) {
      console.error("Failed to fetch run logs", err);
    }
  };

  const calculateUsage = (gear) => {
    const validLogs = runLogs.filter(log => {
        return log.date >= gear.startDate && (gear.status === 'active' || log.date <= (gear.retireDate || '9999-12-31'));
    });

    const totalDist = validLogs.reduce((sum, log) => sum + log.distance, 0);
    return totalDist.toFixed(1);
  };

  const handleSave = async () => {
    if (!formData.brand || !formData.model) return alert("請輸入品牌與型號");
    const user = auth.currentUser;
    
    try {
      if (editingGear) {
        await updateDoc(doc(db, 'users', user.uid, 'gears', editingGear.id), {
          ...formData,
          retireDate: formData.status === 'retired' ? (editingGear.retireDate || new Date().toISOString().split('T')[0]) : null
        });
      } else {
        await addDoc(collection(db, 'users', user.uid, 'gears'), {
          ...formData,
          currentDistance: 0, 
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setEditingGear(null);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("儲存失敗");
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("確定刪除此裝備？")) return;
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'gears', id));
  };

  const handleEditClick = (gear) => {
    setEditingGear(gear);
    setFormData({
      brand: gear.brand,
      model: gear.model,
      type: gear.type,
      startDate: gear.startDate,
      maxDistance: gear.maxDistance,
      status: gear.status
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      model: '',
      type: 'shoes',
      startDate: new Date().toISOString().split('T')[0],
      maxDistance: 800,
      status: 'active'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="text-orange-500" /> 裝備壽命管理
          </h2>
          <p className="text-gray-400 text-sm">自動追蹤跑鞋里程，預防運動傷害</p>
        </div>
        <button 
          onClick={() => { setEditingGear(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg"
        >
          <Plus size={18} /> 新增裝備
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gears.map(gear => {
          const usage = calculateUsage(gear);
          const percent = Math.min(100, (usage / gear.maxDistance) * 100);
          const isRetired = gear.status === 'retired';
          
          let statusColor = "bg-green-500";
          if (percent > 80) statusColor = "bg-yellow-500";
          if (percent >= 100) statusColor = "bg-red-500";
          if (isRetired) statusColor = "bg-gray-600";

          return (
            <div key={gear.id} className={`bg-gray-800 rounded-2xl border ${isRetired ? 'border-gray-700 opacity-70' : 'border-gray-600'} overflow-hidden relative group`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShoppingBag size={80} />
              </div>

              <div className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{gear.brand}</span>
                    <h3 className="text-xl font-bold text-white mt-1">{gear.model}</h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar size={10} /> 啟用: {gear.startDate}
                    </p>
                  </div>
                  {isRetired ? (
                     <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded border border-gray-600">已退役</span>
                  ) : percent >= 100 ? (
                     <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded border border-red-700 flex items-center gap-1"><AlertTriangle size={10}/> 壽命已盡</span>
                  ) : (
                     <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded border border-green-700 flex items-center gap-1"><CheckCircle size={10}/> 服役中</span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-white">{usage} km</span>
                    <span className="text-gray-400">/ {gear.maxDistance} km</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${statusColor} transition-all duration-1000`} 
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-right">已使用 {Math.round(percent)}%</p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-700/50">
                   <button 
                     onClick={() => handleEditClick(gear)}
                     className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                   >
                     <Edit2 size={14} /> 編輯
                   </button>
                   <button 
                     onClick={() => handleDelete(gear.id)}
                     className="px-3 py-2 bg-gray-700 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-lg transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {gears.length === 0 && !loading && (
             <div 
                onClick={() => setShowModal(true)}
                className="bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all group min-h-[200px]"
             >
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-600 text-gray-400 group-hover:text-white transition-colors">
                   <Plus size={24} />
                </div>
                <p className="text-gray-400 font-medium">新增第一雙跑鞋</p>
             </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingGear ? '編輯裝備' : '新增裝備'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">品牌</label>
                  <input 
                    value={formData.brand} 
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="Nike"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">型號</label>
                  <input 
                    value={formData.model} 
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="Pegasus 40"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                  <label className="text-xs text-gray-500 block mb-1">啟用日期 (從這天開始計算里程)</label>
                  <input 
                    type="date"
                    value={formData.startDate} 
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
              </div>

              <div>
                  <label className="text-xs text-gray-500 block mb-1">預期壽命 (km)</label>
                  <input 
                    type="number"
                    value={formData.maxDistance} 
                    onChange={e => setFormData({...formData, maxDistance: Number(e.target.value)})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                  />
              </div>

              <div>
                  <label className="text-xs text-gray-500 block mb-1">狀態</label>
                  <select 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none focus:border-blue-500"
                  >
                    <option value="active">服役中 (Active)</option>
                    <option value="retired">已退役 (Retired)</option>
                  </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold"
                >
                  取消
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
                >
                  儲存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}