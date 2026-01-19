import React, { useEffect, Suspense, useMemo, useCallback } from 'react';
import { useUserStore } from './store/userStore';
import { useViewStore } from './store/viewStore';
import MainLayout from './layouts/MainLayout';
// 移除靜態引入，改用 Lazy Load
// import CoachChat from './components/AICoach/CoachChat.jsx';
import { Loader, AlertTriangle, MessageSquare } from 'lucide-react';
import { signInWithGoogle } from './services/authService';
import ErrorToast from './components/common/ErrorToast';
import { handleError } from './services/errorService';

// --- 1. 使用 Lazy Loading 隔離錯誤並優化效能 ---
const DashboardView = React.lazy(() => import('./views/DashboardView.jsx'));
const CalendarView = React.lazy(() => import('./views/CalendarView.jsx'));
const FeatureViews = React.lazy(() => import('./views/FeatureViews.jsx'));
const StrengthAnalysisView = React.lazy(() => import('./views/StrengthAnalysisView.jsx'));
const RunAnalysisView = React.lazy(() => import('./views/RunAnalysisView.jsx'));
const TrendAnalysisView = React.lazy(() => import('./views/TrendAnalysisView.jsx'));
const NutritionView = React.lazy(() => import('./views/NutritionView.jsx'));
const GearView = React.lazy(() => import('./views/GearView.jsx'));
const TrainingPlanView = React.lazy(() => import('./views/TrainingPlanView.jsx'));

// 懶載入聊天室元件 (降低初始 Bundle 大小)
const CoachChat = React.lazy(() => import('./components/AICoach/CoachChat.jsx'));

// --- 2. 錯誤邊界元件 (Error Boundary) ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Page Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 p-8">
          <AlertTriangle size={48} className="mb-4" />
          <h2 className="text-xl font-bold mb-2">此頁面發生錯誤</h2>
          <div className="bg-gray-800 p-4 rounded-lg border border-red-900 text-left max-w-lg w-full overflow-auto">
            <p className="font-mono text-xs whitespace-pre-wrap">{this.state.error?.toString()}</p>
            <p className="text-xs text-gray-500 mt-2">請檢查 Console (F12) 獲取詳細資訊</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            重新整理網頁
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 3. 登入畫面 ---
const LoginView = () => {
    const handleGoogleLogin = async () => {
        try { 
            await signInWithGoogle(); 
        } catch (error) {
            handleError(error, { 
                context: 'LoginView', 
                operation: 'signInWithGoogle' 
            });
        }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-8 px-4">
           <div className="text-center space-y-4">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-2 shadow-lg shadow-blue-900/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>
             </div>
             <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                My AI Coach
             </h1>
             <p className="text-gray-400 text-lg">您的個人化 AI 健身夥伴</p>
           </div>
           
           <button onClick={handleGoogleLogin} className="px-8 py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-xl flex items-center gap-3">
             <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
             使用 Google 帳號登入
           </button>
        </div>
    );
};

export default function App() {
  // 使用 zustand store 管理全局狀態
  const { user, userData, loading, initializeAuth } = useUserStore();
  const { currentView, setCurrentView, isChatOpen, setIsChatOpen } = useViewStore();

  // 初始化認證監聽
  useEffect(() => {
    const unsubscribe = initializeAuth();

    // #region agent log:app_auth_init
    try {
      fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'App.jsx:initializeAuth',
          message: 'initializeAuth called',
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // 忽略記錄錯誤，避免影響主流程
    }
    // #endregion agent log:app_auth_init

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  // 監控關鍵狀態變化（loading / user / currentView）
  useEffect(() => {
    // #region agent log:app_state_change
    try {
      fetch('http://127.0.0.1:7242/ingest/5a6b9ca3-e450-4461-8b56-55c583802666', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'App.jsx:state',
          message: 'App state changed',
          data: {
            loading,
            hasUser: !!user,
            currentView,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // 忽略記錄錯誤
    }
    // #endregion agent log:app_state_change
  }, [loading, user, currentView]);

  // 優化：使用 useCallback 穩定 callback 參考
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, [setIsChatOpen]);

  // 優化：使用 useMemo 快取視圖渲染結果，避免不必要的重新渲染
  const content = useMemo(() => {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader className="animate-spin text-gray-500"/></div>}>
          {(() => {
            switch (currentView) {
              case 'dashboard': return <DashboardView />;
              case 'calendar': return <CalendarView />;
              case 'trend': return <TrendAnalysisView />;
              case 'nutrition': return <NutritionView />;
              case 'gear': return <GearView />;
              case 'strength-analysis': return <StrengthAnalysisView />;
              case 'run-analysis': return <RunAnalysisView />;
              case 'profile': return <FeatureViews view="profile" />;
              case 'training-plan': return <TrainingPlanView />;
              case 'training': 
              case 'analysis':
                return <DashboardView />; 
              default:
                return <DashboardView userData={userData} setCurrentView={setCurrentView} />;
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    );
  }, [currentView, userData]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />; 
  }

  return (
    <>
      <ErrorToast />
      <MainLayout 
        user={user} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        setIsChatOpen={setIsChatOpen}
      >
        {content}
      </MainLayout>

      {/* 只有在開啟時才載入並渲染 Chat 元件 */}
      {isChatOpen && (
        <Suspense fallback={
            <div className="fixed bottom-6 right-6 w-80 h-96 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center shadow-2xl z-50">
               <div className="flex flex-col items-center text-gray-500">
                  <Loader className="animate-spin mb-2" />
                  <span className="text-xs">喚醒教練中...</span>
               </div>
            </div>
        }>
            <CoachChat 
                isOpen={isChatOpen} 
                onClose={handleCloseChat} 
                user={user}
            />
        </Suspense>
      )}
    </>
  );
}