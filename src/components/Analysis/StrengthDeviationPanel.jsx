/**
 * 動作偏差檢測與糾正建議面板（重訓分析）
 */
import React from 'react';
import { AlertCircle, Loader, Zap } from 'lucide-react';

export default function StrengthDeviationPanel({ deviationAnalysis, metrics, formCorrection, loadingCorrection, onGetCorrection }) {
  if (!deviationAnalysis?.hasIssues) return null;

  return (
    <div className="space-y-4">
      <div className="card-base p-5 rounded-game border-[3px] border-game-coin">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900 font-bold flex items-center gap-2">
            <AlertCircle className="text-game-coin" /> 動作偏差檢測
          </h3>
          <span
            className={`text-xs font-bold px-2 py-1 rounded-game border-2 ${
              deviationAnalysis.overallSeverity === 'severe' ? 'bg-game-heart/20 text-game-heart border-game-heart/50' :
              deviationAnalysis.overallSeverity === 'moderate' ? 'bg-game-coin/20 text-gray-900 border-game-coin' :
              'bg-game-grass/20 text-game-grass border-game-grass/50'
            }`}
          >
            {deviationAnalysis.overallSeverity === 'severe' ? '嚴重' :
             deviationAnalysis.overallSeverity === 'moderate' ? '中等' : '輕微'}
          </span>
        </div>
        <div className="space-y-2 mb-3">
          {Object.entries(deviationAnalysis.deviations || {}).map(([key, dev]) => {
            if (!dev || dev.severity === 'none') return null;
            return (
              <div key={key} className="bg-white/60 p-3 rounded-game border-2 border-game-outline/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-800">{metrics?.[key]?.label || key}</span>
                  <span
                    className={`text-xs font-bold ${
                      dev.severity === 'severe' ? 'text-game-heart' :
                      dev.severity === 'moderate' ? 'text-game-coin' : 'text-game-grass'
                    }`}
                  >
                    偏差 {dev.deviation?.toFixed(1)}{key.includes('Angle') ? '°' : key.includes('Time') ? '秒' : 'cm'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={onGetCorrection}
          disabled={loadingCorrection}
          className="btn-primary w-full px-4 py-3 min-h-[44px] flex items-center justify-center gap-2"
        >
          {loadingCorrection ? (
            <>
              <Loader size={16} className="animate-spin" />
              <span>分析中...</span>
            </>
          ) : (
            <>
              <Zap size={16} />
              <span>獲取糾正建議</span>
            </>
          )}
        </button>
      </div>

      {formCorrection && (
        <div className="card-base p-5 rounded-game border-[3px] border-game-grass space-y-4">
          <h3 className="text-gray-900 font-bold flex items-center gap-2">
            <Zap className="text-game-grass" /> 動作糾正建議
          </h3>
          {formCorrection.corrections?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">糾正要點</p>
              <ul className="space-y-1">
                {formCorrection.corrections.map((c, idx) => (
                  <li key={idx} className="text-sm text-gray-800 font-medium flex items-start gap-2">
                    <span className="text-game-grass mt-1">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {formCorrection.correctiveExercises?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">推薦糾正訓練</p>
              <div className="space-y-2">
                {formCorrection.correctiveExercises.map((ex, idx) => (
                  <div key={idx} className="bg-white/60 p-3 rounded-game border-2 border-game-outline/50">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-gray-900">{ex.name}</p>
                      <span className="text-xs font-medium text-game-grass">{ex.sets}組 × {ex.reps}次</span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1 font-medium">{ex.description}</p>
                    <p className="text-xs text-game-coin font-bold">重點：{ex.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {formCorrection.trainingPlan && (
            <div className="bg-white/60 p-3 rounded-game border-2 border-game-outline/50">
              <p className="text-xs font-medium text-gray-700 mb-1">訓練計劃建議</p>
              <p className="text-sm text-gray-900 font-medium">{formCorrection.trainingPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
