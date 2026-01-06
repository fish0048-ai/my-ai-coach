import React, { useState } from 'react';
import { useUserData } from './hooks/useUserData';
import MainLayout from './layouts/MainLayout';
import DashboardView from './views/DashboardView';
import FeatureViews from './views/FeatureViews'; // 假設 FeatureViews 可以處理 'training' 和 'profile'，如果不行，請分別引入
import CoachChat from './components/AICoach/CoachChat';
import { Loader } from 'lucide-react';

// 登入畫面組件 (如果原本就在 App.jsx，建議也移到 components/LoginView.jsx)
const LoginView = () => {
    // ... 您的登入邏輯，或直接使用 Firebase UI
    return (
        <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
           <p>請先登入 (此處應放入您的登入按鈕)</p>
        </div>
    );
};

export default function App() {
  // 1. 狀態管理
  const { user, userData, loading } = useUserData();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 2. 載入中處理
  if (loading) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  // 3. 未登入處理
  if (!user) {
    return <LoginView />; 
  }

  // 4. 路由內容渲染邏輯
  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView userData={userData} />;
      case 'training':
        // 如果 FeatureViews 處理多個視圖，傳遞 view prop
        return <FeatureViews view="training" />; 
      case 'profile':
        return <FeatureViews view="profile" userData={userData} />;
      default:
        return <DashboardView userData={userData} />;
    }
  };

  // 5. 渲染主程式
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