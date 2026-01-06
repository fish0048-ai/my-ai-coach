// ... existing imports ...
import { getAIContext } from '../../utils/contextManager'; // 引入讀取工具

import { X, Send, Bot, Loader, Sparkles, Settings, Key, Save, Trash2 } from 'lucide-react';
import { runGemini } from '../../utils/gemini';

export default function CoachChat({ isOpen, onClose, user }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: `嗨 ${user?.displayName || '夥伴'}！我是你的 AI 教練。\n今天想練哪裡？\n(我會盡量精簡回答以節省您的 Token)` }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, showSettings]);

  useEffect(() => {
    if (showSettings) {
      setTempKey(apiKey);
    }
  }, [showSettings, apiKey]);

  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', tempKey);
    setApiKey(tempKey);
    setShowSettings(false);
    if (messages.length === 1) {
      setMessages(prev => [...prev, { role: 'model', text: "API Key 已儲存！我們現在可以開始對話了。" }]);
    }
  };

  // 清除對話紀錄
  const handleClearHistory = () => {
    setMessages([
        { role: 'model', text: `對話已重置。有什麼新問題嗎？` }
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!apiKey) {
      setShowSettings(true);
      setMessages(prev => [...prev, { role: 'model', text: "請先設定 API Key 才能使用喔！" }]);
      return;
    }

    const userMessage = input;
    setInput(""); 
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
        // 1. 獲取最新的使用者背景資料 (極簡版)
        const userContext = await getAIContext();

        // 2. 組合 System Prompt
        const systemPrompt = `
          角色：專業健身教練。
          風格：繁體中文、幽默鼓勵、極度精簡(50字內)。
          
          [使用者背景資料]
          ${userContext}
          
          用戶問題：${userMessage}
        `;

        const responseText = await runGemini(systemPrompt, apiKey);
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text: "連線發生錯誤，請檢查網路或 API Key。" }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-[600px] max-h-[100vh] bg-gray-900 md:rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-50 transition-all duration-300 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 md:rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              AI Coach
              <Sparkles size={14} className="text-yellow-400" />
            </h3>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              省流模式 On
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 清除對話按鈕 */}
          <button 
            onClick={handleClearHistory}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="清除對話"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-lg transition-colors ${showSettings || !apiKey ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="設定 API Key"
          >
            <Settings size={20} />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-black/20 relative">
        {showSettings ? (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-sm z-10 space-y-6 animate-fadeIn">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-2">
              <Key size={32} className="text-blue-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">設定 API Key</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                請輸入您的 Google Gemini API Key。
              </p>
            </div>
            
            <div className="w-full space-y-3">
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-mono"
              />
              <button
                onClick={handleSaveKey}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30"
              >
                <Save size={18} />
                儲存設定
              </button>
            </div>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 hover:underline mt-4"
            >
              取得免費 API Key
            </a>
          </div>
        ) : (
          <div className="p-4 space-y-4 min-h-full">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-100 rounded-bl-none border border-gray-700'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-gray-800 p-4 rounded-2xl rounded-bl-none border border-gray-700 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      {!showSettings && (
        <div className="p-4 border-t border-gray-800 bg-gray-900 md:rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={apiKey ? "輸入問題 (AI 會精簡回答)..." : "請設定 API Key"}
              disabled={!apiKey}
              className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !apiKey}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/20"
            >
              {isLoading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}