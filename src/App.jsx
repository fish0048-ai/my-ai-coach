import React, { useState } from 'react';
import { useUserData } from './hooks/useUserData';
import MainLayout from './layouts/MainLayout';
// 引入新頁面
import DashboardView from './views/DashboardView.jsx'; 
import FeatureViews from './views/FeatureViews.jsx'; 
import CalendarView from './views/CalendarView.jsx';
import StrengthAnalysisView from './views/StrengthAnalysisView.jsx';
import RunAnalysisView from './views/RunAnalysisView.jsx';
import TrendAnalysisView from './views/TrendAnalysisView.jsx'; // 新增引入
import CoachChat from './components/AICoach/CoachChat.jsx';
import { Loader } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';

const LoginView = () => {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            if (error.code !== 'auth/popup-closed-by-user') {
                alert("登入失敗: " + error.message);
            }
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
           
           <div className="w-full max-w-sm space-y-4">
               <button 
                 onClick={handleGoogleLogin}
                 className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-[1.02] shadow-xl"
               >
                 <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                 使用 Google 帳號登入
               </button>
               <p className="text-xs text-center text-gray-600">
                 點擊即代表您同意服務條款與隱私權政策
               </p>
           </div>
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
    switch (currentView) {
      case 'dashboard':
        return <DashboardView userData={userData} />;
      case 'training': // 相容舊連結
        return <DashboardView userData={userData} />; 
      case 'profile':
        return <FeatureViews view="profile" userData={userData} />;
      case 'strength-analysis':
        return <StrengthAnalysisView />;
      case 'run-analysis':
        return <RunAnalysisView />;
      case 'calendar': 
        return <CalendarView />;
      case 'trend': // 新增
        return <TrendAnalysisView />;
      default:
        return <DashboardView userData={userData} />;
    }
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