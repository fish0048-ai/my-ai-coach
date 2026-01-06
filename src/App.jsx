import React, { useState } from 'react';
import { useUserData } from './hooks/useUserData';
import MainLayout from './layouts/MainLayout';
// 這裡加上 .jsx 副檔名，強制 Vercel 識別檔案類型
import DashboardView from './views_temp/DashboardView.jsx'; 
import FeatureViews from './views_temp/FeatureViews.jsx'; 
import CoachChat from './components/AICoach/CoachChat';
import { Loader } from 'lucide-react';

// 登入畫面組件
const LoginView = () => {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white flex-col gap-4">
           <h1 className="text-2xl font-bold">My AI Coach</h1>
           <p className="text-gray-400">請登入以開始訓練</p>
           {/* 這裡通常會有 Firebase UI 或自定義登入按鈕 */}
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
      case 'training':
        return <FeatureViews view="training" />; 
      case 'profile':
        return <FeatureViews view="profile" userData={userData} />;
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