import React, { useState } from 'react';
import { LayoutDashboard, Dumbbell, User, Menu, X, LogOut, MessageSquare, Calendar, Activity, Zap, LineChart, Utensils, ShoppingBag, BookOpen, Globe, Map, Layers } from 'lucide-react';
import { signOut } from '../services/authService';

const VIEW_TITLES = {
  'map': '基地地圖 Athletica',
  'world-3d': '3D 城市 World',
  'platformer-demo': '平台素材示範',
  'dashboard': '總覽 Dashboard',
  'calendar': '行事曆 Calendar',
  'nutrition': '智慧營養師 Nutrition',
  'trend': '數據趨勢 Trends',
  'gear': '裝備管理 Gear',
  'strength-analysis': '重訓分析 Strength',
  'run-analysis': '跑姿分析 Running',
  'training-plan': '訓練計劃推薦',
  'knowledge-base': '個人知識庫 Knowledge',
  'profile': '個人檔案 Profile',
};

const SidebarItem = ({ icon: Icon, text, active, onClick }) => (
  <button
    onClick={onClick}
    type="button"
    aria-current={active ? 'page' : undefined}
    className={`w-full flex items-center gap-3 px-6 py-3 transition-all duration-200 min-h-[44px]
      rounded-r-button border-r-[3px] border-game-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf8]
      ${active
        ? 'bg-game-grass text-white shadow-card'
        : 'text-gray-600 hover:bg-game-grass/20 hover:text-gray-900'
      }`}
  >
    <Icon size={20} aria-hidden />
    <span className="font-medium">{text}</span>
  </button>
);

export default function MainLayout({ children, currentView, setCurrentView, user, setIsChatOpen }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = () => signOut();

  return (
    <div className="flex h-screen text-gray-900 overflow-hidden font-sans app-background min-h-full relative">
      {/* 背景圖層：fixed 滿版，由下到上繪製。雲先畫，遠山/遠樹畫在雲上面才不會被蓋住 */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
        {/* 1. 最上天空藍 → 中間純白 → 下方透明（讓遠山遠樹露出） */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #D6EEF8 0%, #C3E3FF 32%, #ffffff 38%, #ffffff 72%, transparent 76%)',
          }}
        />
        {/* 2. 備援：純 CSS 草地+土（柔和漸層，避免硬邊線） */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, transparent 50%, rgba(46,204,113,0.3) 62%, #2ECC71 72%, #8d6e63 88%, #5d4037 100%)',
          }}
        />
        {/* 4. 土（Kenney 圖） */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_solid_dirt.png)',
            backgroundSize: '100% 14%',
            backgroundPosition: 'bottom left',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* 5. 草地（Kenney 圖） */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_solid_grass.png)',
            backgroundSize: '100% 30%',
            backgroundPosition: 'center bottom',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {/* 6. 雲朵：只出現在最上方，約 0～38% 高，以下完全透明（中間、下方不露雲） */}
        <div
          className="absolute inset-0 opacity-85"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_clouds.png)',
            backgroundSize: '260px 260px',
            backgroundPosition: '0 0',
            backgroundRepeat: 'repeat',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 32%, transparent 42%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 32%, transparent 42%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_clouds.png)',
            backgroundSize: '180px 180px',
            backgroundPosition: '40px 60px',
            backgroundRepeat: 'repeat',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 28%, transparent 38%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 28%, transparent 38%)',
          }}
        />
        {/* 7. 遠山、遠樹：原先尺寸 256×256 不拉伸，橫向重複鋪滿底部 */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_color_hills.png)',
            backgroundSize: '256px 256px',
            backgroundPosition: 'left bottom',
            backgroundRepeat: 'repeat-x',
          }}
        />
        <div
          className="absolute inset-0 opacity-85"
          style={{
            backgroundImage: 'url(/kenney-platformer/backgrounds/background_color_trees.png)',
            backgroundSize: '256px 256px',
            backgroundPosition: 'left bottom',
            backgroundRepeat: 'repeat-x',
          }}
        />
      </div>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-game-outline/60 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar：亮色底 + 深色粗描邊（HUD 風） */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 border-r-[3px] border-game-outline shadow-card flex flex-col
        transform transition-transform duration-300 ease-in-out
        bg-[#fafaf8]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b-[3px] border-game-outline flex items-center justify-between bg-[#fafaf8]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-game-grass rounded-button flex items-center justify-center border-2 border-game-outline shadow-card">
              <Dumbbell className="text-white" size={20} aria-hidden />
            </div>
            <span className="text-xl font-bold text-gray-900" style={{ textShadow: '0 1px 0 rgba(255,255,255,0.5)' }}>My AI Coach</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            type="button"
            aria-label="關閉導航選單"
            className="lg:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-game-grass/20 rounded-button transition-colors"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 bg-[#fafaf8]" aria-label="主導航選單">
          <div className="px-4 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Athletica
          </div>
          <SidebarItem 
            icon={Map} 
            text="基地地圖" 
            active={currentView === 'map'} 
            onClick={() => { setCurrentView('map'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Globe} 
            text="3D 城市 World" 
            active={currentView === 'world-3d'} 
            onClick={() => { setCurrentView('world-3d'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Layers} 
            text="平台素材示範" 
            active={currentView === 'platformer-demo'} 
            onClick={() => { setCurrentView('platformer-demo'); setIsSidebarOpen(false); }} 
          />
          <div className="px-4 mt-4 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Menu
          </div>
          <SidebarItem 
            icon={LayoutDashboard} 
            text="總覽 Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Calendar} 
            text="行事曆 Calendar" 
            active={currentView === 'calendar'} 
            onClick={() => { setCurrentView('calendar'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Utensils} 
            text="智慧營養師 Nutrition" 
            active={currentView === 'nutrition'} 
            onClick={() => { setCurrentView('nutrition'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={LineChart} 
            text="數據趨勢 Trends" 
            active={currentView === 'trend'} 
            onClick={() => { setCurrentView('trend'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={ShoppingBag} 
            text="裝備管理 Gear" 
            active={currentView === 'gear'} 
            onClick={() => { setCurrentView('gear'); setIsSidebarOpen(false); }} 
          />
          
          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            AI Tools
          </div>
          <SidebarItem 
            icon={Zap} 
            text="重訓分析 Strength" 
            active={currentView === 'strength-analysis'} 
            onClick={() => { setCurrentView('strength-analysis'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Activity} 
            text="跑姿分析 Running" 
            active={currentView === 'run-analysis'} 
            onClick={() => { setCurrentView('run-analysis'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Zap} 
            text="訓練計劃推薦" 
            active={currentView === 'training-plan'} 
            onClick={() => { setCurrentView('training-plan'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={BookOpen} 
            text="個人知識庫 Knowledge" 
            active={currentView === 'knowledge-base'} 
            onClick={() => { setCurrentView('knowledge-base'); setIsSidebarOpen(false); }} 
          />
          
          <div className="px-4 mt-6 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Account
          </div>
          <SidebarItem 
            icon={User} 
            text="個人檔案 Profile" 
            active={currentView === 'profile'} 
            onClick={() => { setCurrentView('profile'); setIsSidebarOpen(false); }} 
          />
        </nav>

        <div className="p-4 border-t-[3px] border-game-outline shrink-0 bg-[#fafaf8]">
          <button
            onClick={handleSignOut}
            type="button"
            aria-label="登出"
            className="flex items-center gap-3 px-4 py-3 w-full min-h-[44px] text-gray-700 hover:text-gray-900 hover:bg-game-grass/20 rounded-button transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fafaf8]"
          >
            <LogOut size={20} aria-hidden />
            <span>登出</span>
          </button>
        </div>
      </div>

      {/* Main Content Area：透明讓藍天白雲草地透出 */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-transparent min-h-0 relative z-10">
        {/* Header：半透明白/米色 + 深色粗描邊，不擋住天空感 */}
        <header className="h-16 border-b-[3px] border-game-outline flex items-center justify-between px-4 lg:px-8 shrink-0 bg-[#fafaf8]/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              type="button"
              aria-label="開啟導航選單"
              className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-game-grass/20 rounded-button transition-colors"
            >
              <Menu size={24} aria-hidden />
            </button>
            {/* 回到地圖：非地圖頁時顯示 */}
            {currentView !== 'map' && currentView !== 'world-3d' && (
              <button
                type="button"
                onClick={() => setCurrentView('map')}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 hover:bg-game-grass/20 rounded-button transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[44px] sm:min-h-0"
                aria-label="回到基地地圖"
                title="回到基地地圖"
              >
                <Map size={20} aria-hidden />
                <span className="hidden sm:inline">回到地圖</span>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {VIEW_TITLES[currentView] || 'My AI Coach'}
            </h1>
          </div>

          <div className="flex items-center gap-2 pl-4 border-l-[3px] border-game-outline">
            <button
              onClick={() => setIsChatOpen(true)}
              type="button"
              aria-label="開啟 AI 教練聊天"
              className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-game-grass/20 rounded-button transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <MessageSquare size={20} aria-hidden />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full" aria-hidden />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0 border-2 border-game-outline">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block text-sm text-gray-700 truncate">
                {user?.email?.split('@')[0]}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto page-container relative" role="main">
           {children}
        </main>
      </div>
    </div>
  );
}