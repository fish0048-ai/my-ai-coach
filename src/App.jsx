import React, { useState, Suspense } from 'react';
import { useUserData } from './hooks/useUserData';
import MainLayout from './layouts/MainLayout';
import CoachChat from './components/AICoach/CoachChat.jsx';
import { Loader, AlertTriangle } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';

const DashboardView = React.lazy(() => import('./views/DashboardView.jsx'));
const CalendarView = React.lazy(() => import('./views/CalendarView.jsx'));
const FeatureViews = React.lazy(() => import('./views/FeatureViews.jsx'));
const StrengthAnalysisView = React.lazy(() => import('./views/StrengthAnalysisView.jsx'));
const RunAnalysisView = React.lazy(() => import('./views/RunAnalysisView.jsx'));
const TrendAnalysisView = React.lazy(() => import('./views/TrendAnalysisView.jsx'));
const NutritionView = React.lazy(() => import('./views/NutritionView.jsx'));
const GearView = React.lazy(() => import('./views/GearView.jsx')); // 新增引入

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

const LoginView = () => {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); } 
        catch (error) { console.error(error); alert("登入失敗: " + error.message); }
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
  const { user, userData, loading } = useUserData();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  const renderContent = () => {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader className="animate-spin text-gray-500"/></div>}>
          {(() => {
            switch (currentView) {
              case 'dashboard': return <DashboardView userData={userData} />;
              case 'calendar': return <CalendarView />;
              case 'trend': return <TrendAnalysisView />;
              case 'nutrition': return <NutritionView userData={userData} />;
              case 'gear': return <GearView />; // 新增
              case 'strength-analysis': return <StrengthAnalysisView />;
              case 'run-analysis': return <RunAnalysisView />;
              case 'profile': return <FeatureViews view="profile" userData={userData} />;
              case 'training': 
              case 'analysis':
                return <DashboardView userData={userData} />; 
              default:
                return <DashboardView userData={userData} />;
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    );
  };

  return (
    <>
      <MainLayout 
        user={user} 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        setIsChatOpen={setIsChatOpen}
      >
        {renderContent()}
      </MainLayout>

      <CoachChat 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        user={user}
      />
    </>
  );
}