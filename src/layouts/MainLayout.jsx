import React, { useState } from 'react';
import { LayoutDashboard, Dumbbell, User, Menu, X, LogOut, MessageSquare } from 'lucide-react';
import { auth } from '../firebase'; // 根據您的 firebase.js 路徑調整

const SidebarItem = ({ icon: Icon, text, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-6 py-3 transition-colors duration-200
      ${active 
        ? 'bg-blue-600 text-white border-r-4 border-blue-800' 
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
      }`}
  >
    <Icon size={20} />
    <span className="font-medium">{text}</span>
  </button>
);

export default function MainLayout({ children, currentView, setCurrentView, user, setIsChatOpen }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = () => auth.signOut();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-gray-900 border-r border-gray-800 
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold text-white">My AI Coach</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </div>
          <SidebarItem 
            icon={LayoutDashboard} 
            text="總覽 Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Dumbbell} 
            text="訓練計畫 Training" 
            active={currentView === 'training'} 
            onClick={() => { setCurrentView('training'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={User} 
            text="個人檔案 Profile" 
            active={currentView === 'profile'} 
            onClick={() => { setCurrentView('profile'); setIsSidebarOpen(false); }} 
          />
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleSignOut}
            className="flex items-center space-x-3 px-4 py-3 w-full text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black">
        {/* Header */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center justify-end w-full space-x-4">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors relative"
            >
              <MessageSquare size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block text-sm text-gray-300">
                {user?.email?.split('@')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 lg:p-8 relative">
           {children}
        </main>
      </div>
    </div>
  );
}