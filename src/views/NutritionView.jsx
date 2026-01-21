import React, { useState, useEffect, useRef } from 'react';
// 修正：補上 Sparkles 引入
import { Utensils, Camera, Plus, Trash2, PieChart, TrendingUp, AlertCircle, ChefHat, Loader, Search, Sparkles } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { getApiKey } from '../services/apiKeyService';
import { createFoodLog, deleteFoodLog } from '../services/nutritionService';
import { handleError } from '../services/errorService';
import { runGeminiVision, runGemini } from '../utils/gemini';
import { parseLLMJson } from '../utils/aiJson';
import { updateAIContext } from '../utils/contextManager';
import { useUserStore } from '../store/userStore';
import { generateNutritionRecommendation } from '../services/ai/nutritionRecommendation';
import { useNutrition } from '../hooks/useNutrition';

export default function NutritionView() {
  // 使用 zustand store 獲取用戶資料
  const userData = useUserStore((state) => state.userData);
  // 使用 Hook 取得今日營養紀錄與 summary
  const { logs, summary, loading } = useNutrition();
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const fileInputRef = useRef(null);

  // 安全解析 TDEE
  const safeParseInt = (val, def) => {
      const parsed = parseInt(val);
      return isNaN(parsed) ? def : parsed;
  };
  
  const targetCal = safeParseInt(userData?.tdee, 2000);
  const targetProtein = Math.round((targetCal * 0.3) / 4);
  const targetCarbs = Math.round((targetCal * 0.4) / 4);
  const targetFat = Math.round((targetCal * 0.3) / 9);
  const [foodName, setFoodName] = useState('');
  const [foodCal, setFoodCal] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [smartRecommendation, setSmartRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const apiKey = getApiKey();
    if (!apiKey) {
      handleError("請先設定 API Key", { context: 'NutritionView', operation: 'handleImageUpload' });
      return;
    }

    setAnalyzing(true);
    setShowAddForm(true); 

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
        const data = parseLLMJson(resultText, { rootType: 'object' });

        setFoodName(data.name || '未知食物');
        setFoodCal(data.calories || 0);
        setFoodProtein(data.protein || 0);
        setFoodCarbs(data.carbs || 0);
        setFoodFat(data.fat || 0);
        
    } catch (error) {
        console.error(error);
        handleError("辨識失敗，請重試或手動輸入。", { context: 'NutritionView', operation: 'handleImageUpload' });
    } finally {
        setAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddFood = async () => {
    if (!foodName) {
      handleError("請輸入食物名稱", { context: 'NutritionView', operation: 'handleAddFood' });
      return;
    }
    const user = getCurrentUser();
    if (!user) return;

    try {
        await createFoodLog({
            date: new Date().toISOString().split('T')[0],
            name: foodName,
            calories: parseFloat(foodCal) || 0,
            protein: parseFloat(foodProtein) || 0,
            carbs: parseFloat(foodCarbs) || 0,
            fat: parseFloat(foodFat) || 0
        });

        setFoodName('');
        setFoodCal('');
        setFoodProtein('');
        setFoodCarbs('');
        setFoodFat('');
        setShowAddForm(false);
        
        updateAIContext();

    } catch (error) {
        console.error(error);
        handleError("新增失敗", { context: 'NutritionView', operation: 'handleAddFood' });
    }
  };

  const handleDelete = async (id) => {
      if(!confirm("刪除此筆紀錄？")) return;
      try {
        await deleteFoodLog(id);
        updateAIContext();
      } catch (err) {
          console.error(err);
      }
  };

  const getSuggestion = async () => {
      const apiKey = getApiKey();
      if (!apiKey) {
        handleError("請先設定 API Key", { context: 'NutritionView', operation: 'getSuggestion' });
        return;
      }
      
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
          handleError("無法取得建議", { context: 'NutritionView', operation: 'getSuggestion' });
      } finally {
          setSuggesting(false);
      }
  };

  const getSmartRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
      const recommendation = await generateNutritionRecommendation({
        currentCalories: summary.cal,
        currentProtein: summary.protein,
        currentCarbs: summary.carbs,
        currentFat: summary.fat,
        targetCalories: targetCal,
        targetProtein: targetProtein,
        targetCarbs: targetCarbs,
        targetFat: targetFat,
        userGoal: userData?.goal || '健康'
      });
      setSmartRecommendation(recommendation);
    } catch (error) {
      // 錯誤已在服務中處理
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const ProgressBar = ({ label, current, target, color }) => {
      const safeTarget = target > 0 ? target : 1;
      const pct = Math.min(100, Math.max(0, (current / safeTarget) * 100));
      return (
          <div className="space-y-1">
              <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white">{Math.round(current)} / {safeTarget}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
              </div>
          </div>
      );
  };

  const safeCircleProgress = targetCal > 0 ? Math.min(1, summary.cal / targetCal) : 0;
  const dashOffset = isNaN(safeCircleProgress) ? 377 : 377 - (377 * safeCircleProgress);
  const remaining = Math.max(0, targetCal - summary.cal);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn p-4 md:p-0">
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Utensils className="text-green-500" /> 智慧營養師
        </h2>
        <div className="flex gap-2">
            <button 
                onClick={() => fileInputRef.current.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl flex gap-2 items-center shadow-lg shadow-blue-900/20"
            >
                {analyzing ? <Loader className="animate-spin" size={18}/> : <Camera size={18}/>}
                {analyzing ? '辨識中...' : '拍照辨識'}
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-gray-700 text-white rounded-xl"><Plus size={18}/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-800 p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center shadow-lg shadow-black/40">
              <div className="relative w-32 h-32 flex items-center justify-center border-4 border-gray-700 rounded-full mb-4">
                  <div className="text-center">
                      <span className={`text-3xl font-bold ${summary.cal > targetCal ? 'text-red-400' : 'text-white'}`}>{Math.round(remaining)}</span>
                      <p className="text-xs text-gray-400">剩餘 kcal</p>
                  </div>
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                      <circle cx="64" cy="64" r="60" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="377" strokeDashoffset={dashOffset} strokeLinecap="round" />
                  </svg>
              </div>
              <p className="text-sm text-gray-400">目標: {targetCal} kcal</p>
          </div>
          <div className="md:col-span-2 bg-gray-800 p-6 rounded-2xl border border-gray-700 flex flex-col justify-center space-y-6">
              <ProgressBar label="蛋白質" current={summary.protein} target={targetProtein} color="bg-blue-500" />
              <ProgressBar label="碳水" current={summary.carbs} target={targetCarbs} color="bg-yellow-500" />
              <ProgressBar label="脂肪" current={summary.fat} target={targetFat} color="bg-red-500" />
          </div>
      </div>

      {/* 智能營養建議卡片 */}
      <div className="bg-blue-900/20 p-5 rounded-2xl border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex gap-2 items-center">
                  <Sparkles className="text-blue-400" size={20}/> 智能營養建議
              </h3>
              <button 
                  onClick={getSmartRecommendation} 
                  disabled={loadingRecommendation}
                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-4 py-2 rounded text-white flex gap-2 items-center transition-colors"
              >
                  {loadingRecommendation ? <Loader size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                  {loadingRecommendation ? '分析中...' : '生成智能建議'}
              </button>
          </div>
          
          {smartRecommendation && (
              <div className="space-y-4">
                  {/* 訓練資訊 */}
                  {smartRecommendation.trainingInfo?.hasTraining && (
                      <div className="bg-surface-800/50 p-3 rounded-lg border border-gray-800">
                          <p className="text-xs text-gray-400 mb-1">今日訓練</p>
                          <p className="text-sm text-white">
                              {smartRecommendation.trainingInfo.type} · 
                              強度{smartRecommendation.trainingInfo.intensity === 'high' ? '高' : smartRecommendation.trainingInfo.intensity === 'moderate' ? '中' : '低'} · 
                              {smartRecommendation.trainingInfo.duration}分鐘 · 
                              消耗約{smartRecommendation.trainingInfo.calories}大卡
                          </p>
                      </div>
                  )}

                  {/* 營養建議 */}
                  {smartRecommendation.recommendations && smartRecommendation.recommendations.length > 0 && (
                      <div>
                          <p className="text-xs text-gray-400 mb-2">建議事項</p>
                          <ul className="space-y-1">
                              {smartRecommendation.recommendations.map((rec, idx) => (
                                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                      <span className="text-blue-400 mt-1">•</span>
                                      <span>{rec}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>
                  )}

                  {/* 餐點建議 */}
                  {smartRecommendation.mealSuggestions && smartRecommendation.mealSuggestions.length > 0 && (
                      <div>
                          <p className="text-xs text-gray-400 mb-2">推薦餐點</p>
                          <div className="space-y-2">
                              {smartRecommendation.mealSuggestions.map((meal, idx) => (
                                  <div key={idx} className="bg-surface-800/50 p-3 rounded-lg border border-gray-800">
                                      <div className="flex justify-between items-start mb-1">
                                          <p className="text-sm font-semibold text-white">{meal.name}</p>
                                          <span className="text-xs text-blue-400">{meal.calories} kcal</span>
                                      </div>
                                      <p className="text-xs text-gray-400 mb-2">{meal.description}</p>
                                      <div className="flex gap-3 text-xs text-gray-500">
                                          <span>蛋白質 {meal.protein}g</span>
                                          <span>碳水 {meal.carbs}g</span>
                                          <span>脂肪 {meal.fat}g</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* 營養缺口提醒 */}
                  {smartRecommendation.gaps && (
                      <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-700/50">
                          <p className="text-xs text-yellow-400 mb-1">⚠️ 營養缺口提醒</p>
                          {smartRecommendation.gaps.protein && (
                              <p className="text-xs text-gray-300">{smartRecommendation.gaps.protein}</p>
                          )}
                          {smartRecommendation.gaps.calorie && (
                              <p className="text-xs text-gray-300">{smartRecommendation.gaps.calorie}</p>
                          )}
                      </div>
                  )}
              </div>
          )}

          {!smartRecommendation && !loadingRecommendation && (
              <p className="text-sm text-gray-500">點擊上方按鈕，AI 將根據您的訓練強度和營養現況生成個人化建議</p>
          )}
      </div>

      {/* 原有簡單建議 */}
      <div className="bg-green-900/20 p-5 rounded-2xl border border-green-500/30">
          <h3 className="font-bold text-white mb-2 flex gap-2"><ChefHat size={20}/> 快速飲食建議</h3>
          {suggestion ? <p className="text-sm text-gray-300 whitespace-pre-wrap">{suggestion}</p> : <p className="text-sm text-gray-500">點擊下方按鈕取得建議</p>}
          <button onClick={getSuggestion} disabled={suggesting} className="mt-3 text-xs bg-green-600 px-4 py-2 rounded text-white flex gap-2 items-center w-fit">
              {suggesting ? <Loader size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
              {suggesting ? '思考中...' : '生成建議'}
          </button>
      </div>

      {showAddForm && (
          <div className="bg-surface-800 p-6 rounded-2xl border border-gray-800 animate-slideUp shadow-lg shadow-black/40">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <input placeholder="食物名稱" value={foodName} onChange={e=>setFoodName(e.target.value)} className="col-span-2 bg-surface-900 border-gray-800 rounded px-3 py-2 text-white border"/>
                  <input type="number" placeholder="熱量" value={foodCal} onChange={e=>setFoodCal(e.target.value)} className="bg-surface-900 border-gray-800 rounded px-3 py-2 text-white border"/>
                  <input type="number" placeholder="蛋白質" value={foodProtein} onChange={e=>setFoodProtein(e.target.value)} className="bg-surface-900 border-gray-800 rounded px-3 py-2 text-white border"/>
                  <input type="number" placeholder="碳水" value={foodCarbs} onChange={e=>setFoodCarbs(e.target.value)} className="bg-surface-900 border-gray-800 rounded px-3 py-2 text-white border"/>
                  <input type="number" placeholder="脂肪" value={foodFat} onChange={e=>setFoodFat(e.target.value)} className="bg-surface-900 border-gray-800 rounded px-3 py-2 text-white border"/>
              </div>
              <button onClick={handleAddFood} className="w-full py-2 bg-green-600 text-white rounded font-bold">確認新增</button>
          </div>
      )}

      <div className="space-y-2">
          {logs.map(log => (
              <div key={log.id} className="bg-surface-800 p-4 rounded-xl border border-gray-800 flex justify-between items-center shadow-lg shadow-black/40">
                  <div>
                      <h4 className="font-bold text-white">{log.name}</h4>
                      <span className="text-xs text-green-400">{log.calories} kcal</span>
                  </div>
                  <button onClick={() => handleDelete(log.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={18}/></button>
              </div>
          ))}
      </div>
    </div>
  );
}