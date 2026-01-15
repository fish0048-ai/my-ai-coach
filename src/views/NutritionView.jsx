import React, { useState, useEffect, useRef } from 'react';
import { Utensils, Camera, Plus, Trash2, PieChart, TrendingUp, AlertCircle, ChefHat, Loader, Search } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { runGeminiVision, runGemini } from '../utils/gemini';
import { updateAIContext } from '../utils/contextManager';

export default function NutritionView({ userData }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef(null);

  // 今日攝取統計
  const [summary, setSummary] = useState({ cal: 0, protein: 0, carbs: 0, fat: 0 });
  
  // 目標設定 (從 userData 讀取或預設)
  const targetCal = userData?.tdee ? parseInt(userData.tdee) : 2000;
  // 簡易營養素比例 (蛋白質 30%, 碳水 40%, 脂肪 30%)
  const targetProtein = Math.round((targetCal * 0.3) / 4);
  const targetCarbs = Math.round((targetCal * 0.4) / 4);
  const targetFat = Math.round((targetCal * 0.3) / 9);

  // 表單狀態
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');

  // AI 建議
  const [suggestion, setSuggestion] = useState('');
  const [suggesting, setSuggesting] = useState(false);

  // 1. 讀取今日飲食紀錄
  useEffect(() => {
    if (!auth.currentUser) return;
    
    // 取得今日日期字串 YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'food_logs'),
      where('date', '==', today),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(data);
      
      // 計算總和
      const sum = data.reduce((acc, curr) => ({
        cal: acc.cal + (curr.calories || 0),
        protein: acc.protein + (curr.protein || 0),
        carbs: acc.carbs + (curr.carbs || 0),
        fat: acc.fat + (curr.fat || 0),
      }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
      
      setSummary(sum);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. AI 圖片辨識處理
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) return alert("請先在右下角 AI 教練視窗設定 API Key");

    setAnalyzing(true);
    setShowAddForm(true); // 開啟表單準備填入

    try {
        const prompt = `
            請分析這張食物圖片。
            請回傳一個 JSON 物件 (不要 Markdown)，包含以下欄位估算值：
            {
                "name": "食物名稱 (繁體中文)",
                "calories": 數字 (大卡),
                "protein": 數字 (克),
                "carbs": 數字 (克),
                "fat": 數字 (克)
            }
            如果無法辨識，數值填 0，名稱填 "無法辨識"。
        `;
        
        const resultText = await runGeminiVision(prompt, file, apiKey);
        const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanJson);

        setFoodName(data.name);
        setFoodCal(data.calories);
        setFoodProtein(data.protein);
        setFoodCarbs(data.carbs);
        setFoodFat(data.fat);
        
    } catch (error) {
        console.error(error);
        alert("辨識失敗，請重試或手動輸入。");
    } finally {
        setAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. 新增紀錄
  const handleAddFood = async () => {
    if (!foodName) return alert("請輸入食物名稱");
    const user = auth.currentUser;
    if (!user) return;

    try {
        await addDoc(collection(db, 'users', user.uid, 'food_logs'), {
            date: new Date().toISOString().split('T')[0],
            name: foodName,
            calories: parseFloat(foodCal) || 0,
            protein: parseFloat(foodProtein) || 0,
            carbs: parseFloat(foodCarbs) || 0,
            fat: parseFloat(foodFat) || 0,
            createdAt: serverTimestamp()
        });

        // 重置表單
        setFoodName('');
        setFoodCal('');
        setFoodProtein('');
        setFoodCarbs('');
        setFoodFat('');
        setShowAddForm(false);
        
        // 更新 Context
        updateAIContext();

    } catch (error) {
        console.error(error);
        alert("新增失敗");
    }
  };

  const handleDelete = async (id) => {
      if(!confirm("刪除此筆紀錄？")) return;
      await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'food_logs', id));
      updateAIContext();
  };

  // 4. AI 飲食建議
  const getSuggestion = async () => {
      const apiKey = localStorage.getItem('gemini_api_key');
      if (!apiKey) return alert("請先設定 API Key");
      
      setSuggesting(true);
      try {
          const remainingCal = targetCal - summary.cal;
          const remainingProtein = targetProtein - summary.protein;
          
          const prompt = `
            使用者目標 TDEE: ${targetCal} kcal (蛋白質 ${targetProtein}g)。
            目前已攝取: ${summary.cal} kcal (蛋白質 ${summary.protein}g)。
            還剩下: ${remainingCal} kcal, 蛋白質差 ${remainingProtein}g。
            
            請給出 3 個具體的晚餐或點心建議 (符合台灣常見食物，如超商、自助餐)，
            幫助使用者達標 (特別是蛋白質)。
            請用條列式，繁體中文，150字內。
          `;
          
          const text = await runGemini(prompt, apiKey);
          setSuggestion(text);
      } catch (e) {
          alert("無法取得建議");
      } finally {
          setSuggesting(false);
      }
  };

  // 進度條組件
  const ProgressBar = ({ label, current, target, color }) => {
      const pct = Math.min(100, Math.max(0, (current / target) * 100));
      return (
          <div className="space-y-1">
              <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white">{Math.round(current)} / {target}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn p-4 md:p-0">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Utensils className="text-green-500" /> 智慧營養師
          </h2>
          <p className="text-gray-400 text-sm">AI 辨識熱量，精準控制飲食</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => fileInputRef.current.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
            >
                {analyzing ? <Loader className="animate-spin" size={18}/> : <Camera size={18}/>}
                {analyzing ? '辨識中...' : '拍照辨識'}
            </button>
            <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all"
            >
                <Plus size={18}/> 手動
            </button>
        </div>
      </div>

      {/* Dashboard & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 左側：熱量圓環 (簡易版用數值代替) */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center border-4 border-gray-700 rounded-full mb-4">
                  <div className="text-center">
                      <span className="text-3xl font-bold text-white">{targetCal - summary.cal}</span>
                      <p className="text-xs text-gray-400">剩餘 kcal</p>
                  </div>
                  {/* 進度圓環可後續用 SVG 優化，暫以 border 模擬 */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                      <circle cx="64" cy="64" r="60" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="377" strokeDashoffset={377 - (377 * Math.min(1, summary.cal/targetCal))} strokeLinecap="round" />
                  </svg>
              </div>
              <p className="text-sm text-gray-400">目標: {targetCal} kcal</p>
          </div>

          {/* 中間：營養素進度 */}
          <div className="md:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-center space-y-6">
              <ProgressBar label="蛋白質 (Protein)" current={summary.protein} target={targetProtein} color="bg-blue-500" />
              <ProgressBar label="碳水化合物 (Carbs)" current={summary.carbs} target={targetCarbs} color="bg-yellow-500" />
              <ProgressBar label="脂肪 (Fat)" current={summary.fat} target={targetFat} color="bg-red-500" />
          </div>
      </div>

      {/* AI 建議區塊 */}
      <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 p-5 rounded-2xl border border-green-500/30 flex flex-col md:flex-row gap-4 items-start">
          <div className="p-3 bg-green-500/20 rounded-full text-green-400">
              <ChefHat size={24} />
          </div>
          <div className="flex-1">
              <h3 className="font-bold text-white mb-1">不知道下一餐吃什麼？</h3>
              <p className="text-sm text-gray-400 mb-3">讓 AI 根據您剩餘的熱量與營養缺口，推薦最適合的選擇。</p>
              {suggestion && (
                  <div className="bg-gray-900/50 p-3 rounded-lg text-sm text-gray-200 leading-relaxed mb-3 whitespace-pre-wrap border border-gray-700">
                      {suggestion}
                  </div>
              )}
              <button 
                onClick={getSuggestion} 
                disabled={suggesting}
                className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                 {suggesting ? <Loader size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                 {suggesting ? '思考中...' : '生成建議'}
              </button>
          </div>
      </div>

      {/* 新增表單 */}
      {showAddForm && (
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 animate-slideUp">
              <h3 className="font-bold text-white mb-4">紀錄飲食</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="col-span-2 md:col-span-1">
                      <label className="text-xs text-gray-500 block mb-1">食物名稱</label>
                      <input type="text" value={foodName} onChange={e=>setFoodName(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500 border"/>
                  </div>
                  <div>
                      <label className="text-xs text-gray-500 block mb-1">熱量 (kcal)</label>
                      <input type="number" value={foodCal} onChange={e=>setFoodCal(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500 border"/>
                  </div>
                  <div>
                      <label className="text-xs text-gray-500 block mb-1">蛋白質 (g)</label>
                      <input type="number" value={foodProtein} onChange={e=>setFoodProtein(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 border"/>
                  </div>
                  <div>
                      <label className="text-xs text-gray-500 block mb-1">碳水 (g)</label>
                      <input type="number" value={foodCarbs} onChange={e=>setFoodCarbs(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-yellow-500 border"/>
                  </div>
                  <div>
                      <label className="text-xs text-gray-500 block mb-1">脂肪 (g)</label>
                      <input type="number" value={foodFat} onChange={e=>setFoodFat(e.target.value)} className="w-full bg-gray-900 border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-red-500 border"/>
                  </div>
              </div>
              <div className="flex justify-end gap-3">
                  <button onClick={()=>setShowAddForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">取消</button>
                  <button onClick={handleAddFood} className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold">確認新增</button>
              </div>
          </div>
      )}

      {/* 飲食紀錄列表 */}
      <div className="space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2 mt-4">
              <Search size={18} className="text-gray-400"/> 今日紀錄
          </h3>
          {logs.length === 0 ? (
              <p className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-800 rounded-xl">尚無紀錄，快去吃點好吃的！</p>
          ) : (
              logs.map(log => (
                  <div key={log.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center group">
                      <div>
                          <h4 className="font-bold text-white">{log.name}</h4>
                          <div className="text-xs text-gray-400 flex gap-3 mt-1">
                              <span className="text-green-400">{log.calories} kcal</span>
                              <span>P: {log.protein}g</span>
                              <span>C: {log.carbs}g</span>
                              <span>F: {log.fat}g</span>
                          </div>
                      </div>
                      <button onClick={() => handleDelete(log.id)} className="p-2 text-gray-600 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors">
                          <Trash2 size={18} />
                      </button>
                  </div>
              ))
          )}
      </div>
    </div>
  );
}