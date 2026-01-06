import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader } from 'lucide-react';
// import { run } from '../../gemini'; // 假設您有這個檔案，如果邏輯在 App.jsx 內，請將 run 函式移入此組件或作為 prop 傳入

export default function CoachChat({ isOpen, onClose, user }) {
  const [messages, setMessages] = useState([
    { role: 'model', text: "嗨！我是你的 AI 教練。今天想訓練哪個部位？或者有什麼飲食問題嗎？" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 為了示範，這裡將 API 呼叫邏輯保留，您需要將原本 App.jsx 中的 run 函式邏輯整合進來
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
        // TODO: 將原本 App.jsx 的 Gemini 呼叫邏輯放在這裡
        // const response = await run(userMessage); 
        // 模擬回應：
        const response = "這是一個模擬的回應。請確保將 Gemini API 邏輯整合到 CoachChat 組件中。";
        
        setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: "抱歉，我目前有點連線問題，請稍後再試。" }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-[600px] max-h-[100vh] bg-gray-900 md:rounded-2xl shadow-2xl border border-gray-700 flex flex-col z-50 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-800 md:rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">AI Coach</h3>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
              Online
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-3 rounded-2xl rounded-bl-none border border-gray-700 flex items-center space-x-2">
              <Loader size={16} className="animate-spin text-blue-500" />
              <span className="text-xs text-gray-400">思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-800 bg-gray-900 md:rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="詢問訓練或飲食建議..."
            className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}