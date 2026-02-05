/**
 * 3D 城市 World 入口
 * 提供 2D 等角地圖 / 3D 場景切換，共用 world3dConfig。
 */
import React, { useState, Suspense } from 'react';
import { Map, Box } from 'lucide-react';

const World2DView = React.lazy(() => import('./World2DView.jsx'));
const World3DView = React.lazy(() => import('./World3DView.jsx'));

export default function WorldView() {
  const [mode, setMode] = useState('3d'); // '2d' | '3d'

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      <div className="card-base p-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">AI Coach World</h2>
        <div className="flex rounded-button overflow-hidden border border-gray-700">
          <button
            type="button"
            onClick={() => setMode('3d')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === '3d' ? 'bg-primary-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-white'
            }`}
          >
            <Box size={16} /> 3D 場景
          </button>
          <button
            type="button"
            onClick={() => setMode('2d')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              mode === '2d' ? 'bg-primary-600 text-white' : 'bg-surface-800 text-gray-400 hover:text-white'
            }`}
          >
            <Map size={16} /> 2D 等角地圖
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[60vh] rounded-panel overflow-hidden card-base">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-surface-900">
              <div className="text-center text-gray-400">
                <div className="animate-pulse text-primary-500 mb-2">載入世界中...</div>
              </div>
            </div>
          }
        >
          {mode === '3d' ? <World3DView /> : <World2DView />}
        </Suspense>
      </div>
    </div>
  );
}
