/**
 * 動作偏差檢測與糾正建議面板（重訓分析）
 */
import React from 'react';
import { AlertCircle, Loader, Zap } from 'lucide-react';

export default function StrengthDeviationPanel({ deviationAnalysis, metrics, formCorrection, loadingCorrection, onGetCorrection }) {
  if (!deviationAnalysis?.hasIssues) return null;

  return (
    <div className="space-y-4">
      <div className="bg-yellow-900/20 p-5 rounded-xl border border-yellow-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold flex items-center gap-2">
            <AlertCircle className="text-yellow-400" /> 動作偏差檢測
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded ${
              deviationAnalysis.overallSeverity === 'severe' ? 'bg-red-900/50 text-red-400' :
              deviationAnalysis.overallSeverity === 'moderate' ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-blue-900/50 text-blue-400'
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
              <div key={key} className="bg-gray-900/50 p-2 rounded border border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{metrics?.[key]?.label || key}</span>
                  <span
                    className={`text-xs ${
                      dev.severity === 'severe' ? 'text-red-400' :
                      dev.severity === 'moderate' ? 'text-yellow-400' : 'text-blue-400'
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
          className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
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
        <div className="bg-blue-900/20 p-5 rounded-xl border border-blue-700/50 space-y-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Zap className="text-blue-400" /> 動作糾正建議
          </h3>
          {formCorrection.corrections?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">糾正要點</p>
              <ul className="space-y-1">
                {formCorrection.corrections.map((c, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {formCorrection.correctiveExercises?.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">推薦糾正訓練</p>
              <div className="space-y-2">
                {formCorrection.correctiveExercises.map((ex, idx) => (
                  <div key={idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-white">{ex.name}</p>
                      <span className="text-xs text-blue-400">{ex.sets}組 × {ex.reps}次</span>
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{ex.description}</p>
                    <p className="text-xs text-yellow-400">重點：{ex.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {formCorrection.trainingPlan && (
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
              <p className="text-xs text-gray-400 mb-1">訓練計劃建議</p>
              <p className="text-sm text-gray-300">{formCorrection.trainingPlan}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
