import React, { useState } from 'react';
import { useUserData } from './hooks/useUserData';
import MainLayout from './layouts/MainLayout';
// 引入所有視圖
import DashboardView from './views/DashboardView.jsx'; 
import FeatureViews from './views/FeatureViews.jsx'; 
import CalendarView from './views/CalendarView.jsx';
import StrengthAnalysisView from './views/StrengthAnalysisView.jsx';
import RunAnalysisView from './views/RunAnalysisView.jsx';
import TrendAnalysisView from './views/TrendAnalysisView.jsx';
import NutritionView from './views/NutritionView.jsx'; // 確保引入
import CoachChat from './components/AICoach/CoachChat.jsx';
import { Loader } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from './firebase';

const LoginView = () => {
    // ... (Login code unchanged)
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); } 
        catch (error) { console.error(error); }
    };

    return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-8 px-4">
           <button onClick={handleGoogleLogin} className="px-6 py-4 bg-white text-gray-900 rounded-xl font-bold">
             Google 登入
           </button>
        </div>
    );
};

export default function App() {
  const { user, userData, loading } = useUserData();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (loading) return <div className="h-screen bg-gray-900 flex items-center justify-center"><Loader className="animate-spin text-white"/></div>;
  if (!user) return <LoginView />; 

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView userData={userData} />;
      case 'calendar': return <CalendarView />;
      case 'trend': return <TrendAnalysisView />;
      case 'nutrition': return <NutritionView userData={userData} />; // 新增
      case 'strength-analysis': return <StrengthAnalysisView />;
      case 'run-analysis': return <RunAnalysisView />;
      case 'profile': return <FeatureViews view="profile" userData={userData} />;
      default: return <DashboardView userData={userData} />;
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
      <CoachChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} user={user} />
    </>
  );
}