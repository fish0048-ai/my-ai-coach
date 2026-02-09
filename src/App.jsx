import React, { useEffect, Suspense, useMemo, useCallback } from 'react';
import { useUserStore } from './store/userStore';
import { useViewStore } from './store/viewStore';
import { useWorkoutStore } from './store/workoutStore';
import MainLayout from './layouts/MainLayout';
// 移除靜態引入，改用 Lazy Load
// import CoachChat from './components/AICoach/CoachChat.jsx';
import { Loader, AlertTriangle, MessageSquare } from 'lucide-react';
import { signInWithGoogle } from './services/authService';
import ErrorToast from './components/common/ErrorToast';
import { handleError } from './services/core/errorService';
import KenneyBackground from './components/KenneyBackground';

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
const KnowledgeBaseView = React.lazy(() => import('./views/KnowledgeBaseView.jsx'));
// 靜態 import，避免進入「3D 城市 World」時動態 fetch 失敗（ERR_CONNECTION_REFUSED / server connection lost）
import WorldView from './views/WorldView.jsx';
const WorldMap = React.lazy(() => import('./views/WorldMap.jsx'));

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
        <div className="flex flex-col items-center justify-center h-full text-game-heart p-8 app-background">
          <div className="card-base rounded-game border-[3px] border-game-heart p-8 max-w-lg w-full text-center">
            <AlertTriangle size={48} className="mb-4 mx-auto" aria-hidden />
            <h2 className="text-xl font-bold mb-2 text-gray-900">此頁面發生錯誤</h2>
            <div className="bg-game-heart/10 p-4 rounded-game border-2 border-game-heart/50 text-left overflow-auto mb-4">
              <p className="font-mono text-xs text-gray-800 whitespace-pre-wrap font-medium">{this.state.error?.toString()}</p>
              <p className="text-xs text-gray-700 mt-2 font-medium">請檢查 Console (F12) 獲取詳細資訊</p>
            </div>
            <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2 min-h-[44px]">
              重新整理網頁
            </button>
          </div>
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
        <div className="h-screen flex items-center justify-center text-gray-900 flex-col gap-8 px-4 app-background relative">
          <KenneyBackground />
           <div className="text-center space-y-4 p-8 rounded-panel bg-white/95 border-[3px] border-game-outline shadow-card relative z-10">
             <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-game-grass border-[3px] border-game-outline mb-2 shadow-card overflow-hidden">
                <img src={`${import.meta.env.BASE_URL || ''}kenney-platformer/characters/character_beige_idle.png`} alt="" className="w-14 h-14 object-contain object-bottom" aria-hidden />
             </div>
             <h1 className="text-4xl md:text-5xl font-bold text-game-outline" style={{ textShadow: '0 2px 0 rgba(255,255,255,0.5)' }}>
                My AI Coach
             </h1>
             <p className="text-game-outline/80 text-lg">您的個人化 AI 健身夥伴</p>
           </div>
           
           <button onClick={handleGoogleLogin} className="px-8 py-4 bg-white text-game-outline rounded-game font-bold border-[3px] border-game-outline shadow-card hover:bg-game-coin/20 transition-all flex items-center gap-3 min-h-[44px] relative z-10">
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
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  // 登入後啟動行事曆 Firestore 訂閱，整段登入期間保持連線，確保趨勢與行事曆的歷史、新資料都即時同步；登出時清理
  useEffect(() => {
    if (!user) {
      useWorkoutStore.getState().cleanup();
      return;
    }
    useWorkoutStore.getState().initializeWorkouts();
    return () => { useWorkoutStore.getState().cleanup(); };
  }, [user]);

  // 優化：使用 useCallback 穩定 callback 參考
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, [setIsChatOpen]);

  // 優化：使用 useMemo 快取視圖渲染結果，避免不必要的重新渲染
  const content = useMemo(() => {
    return (
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="card-base rounded-game border-[3px] border-game-outline p-8 flex flex-col items-center gap-4 shadow-card">
                <Loader className="animate-spin text-game-grass" size={40} aria-hidden />
                <p className="text-gray-900 font-bold">載入中...</p>
              </div>
            </div>
          }
        >
          {(() => {
            try {
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
                case 'knowledge-base': return <KnowledgeBaseView />;
                case 'map': return <WorldMap />;
                case 'world-3d': return <WorldView />;
                case 'training':
                case 'analysis':
                  return <DashboardView />;
                default:
                  return <DashboardView userData={userData} setCurrentView={setCurrentView} />;
              }
            } catch (error) {
              console.error('View render error:', error);
              return (
                <div className="p-8 text-center text-red-400">
                  <AlertTriangle size={48} className="mx-auto mb-4" />
                  <p>載入視圖時發生錯誤：{error.message}</p>
                </div>
              );
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    );
  }, [currentView, userData, setCurrentView]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center app-background">
        <div className="card-base rounded-game border-[3px] border-game-outline p-8 flex flex-col items-center gap-4 shadow-card">
          <Loader className="w-10 h-10 text-game-grass animate-spin" aria-hidden />
          <p className="text-gray-900 font-bold">載入中...</p>
        </div>
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
            <div className="fixed bottom-6 right-6 w-80 h-96 card-base rounded-game border-[3px] border-game-outline flex items-center justify-center shadow-card z-50">
               <div className="flex flex-col items-center gap-3">
                  <Loader className="animate-spin text-game-grass" size={28} aria-hidden />
                  <span className="text-sm font-bold text-gray-900">喚醒教練中...</span>
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