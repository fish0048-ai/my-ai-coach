import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader, Sparkles, Settings, Key, Save, Trash2, RefreshCw } from 'lucide-react';
import { getAIContext, updateAIContext } from '../../utils/contextManager';
import { getKnowledgeContextForQuery } from '../../services/ai/knowledgeBaseService';
import { buildConversationContext } from '../../services/ai/conversationSummaryService';
import { useApiKey } from '../../hooks/useApiKey';
import { sendCoachMessage } from '../../services/ai/coachService';

export default function CoachChat({ isOpen, onClose, user }) {
  const { apiKey, setApiKey: updateApiKey, hasApiKey, isLoading: isApiKeyLoading } = useApiKey();
  const [messages, setMessages] = useState([
    { role: 'model', text: `${user?.displayName ? `${user.displayName}，您好。` : '您好。'}我是您的 AI 教練，可根據您的訓練紀錄與目標提供建議。\n\n請告訴我您想討論的項目（例如：本週課表、恢復安排、跑量調整），我會簡潔回覆。` }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // 同步狀態
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
    updateApiKey(tempKey);
    setShowSettings(false);
    if (messages.length === 1) {
      setMessages(prev => [...prev, { role: 'model', text: "API Key 已儲存，教練服務已就緒。請在下方輸入您的問題。" }]);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      { role: 'model', text: "對話已清除。請輸入您想討論的訓練或目標，我會根據您的紀錄回覆。" }
    ]);
  };

  // 手動同步舊資料
  const handleSyncContext = async () => {
    setIsSyncing(true);
    try {
      await updateAIContext();
      alert("同步完成。教練已更新您的個人資料與訓練紀錄，後續回覆將以此為依據。");
    } catch (error) {
      alert("同步失敗，請檢查網路連線後再試。");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!apiKey) {
      setShowSettings(true);
      setMessages(prev => [...prev, { role: 'model', text: "請先於設定中輸入 Google Gemini API Key，方能使用教練服務。" }]);
      return;
    }

    const userMessage = input;
    setInput(""); 
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
        // 1. 並行取得上下文、知識庫與對話脈絡（rag-p3-3 歷史對話壓縮）
        const [userContext, knowledgeContext, conversationContext] = await Promise.all([
          getAIContext(),
          getKnowledgeContextForQuery(userMessage),
          buildConversationContext(messages, apiKey),
        ]);

        // 2. 呼叫服務取得回覆
        const responseText = await sendCoachMessage({
          userMessage,
          userContext,
          knowledgeContext,
          conversationContext,
        });
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "無法取得教練回覆，請確認網路連線正常，或檢查 API Key 是否正確。" }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-[600px] max-h-[100vh] glass-panel md:rounded-2xl flex flex-col z-50 transition-all duration-300 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-slate-900/80 to-slate-800/60 md:rounded-t-2xl">
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
              線上
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearHistory}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-800 transition-colors"
            title="清除對話"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-lg transition-colors ${showSettings || !apiKey ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-white hover:bg-surface-800'}`}
            title="設定"
          >
            <Settings size={20} />
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-surface-800 hover:bg-surface-800/80 p-2 rounded-lg">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-black/10 relative">
        {showSettings ? (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md z-10 space-y-6 animate-fadeIn rounded-b-2xl">
            <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-2 border border-white/10 shadow-lg shadow-slate-900/80">
              <Key size={32} className="text-blue-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-white">設定 API Key</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                請輸入您的 Google Gemini API Key，以啟用 AI 教練服務。Key 僅存放於本機，不會上傳至第三方。
              </p>
            </div>
            
            <div className="w-full space-y-3">
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-900/70 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-mono"
              />
              <button
                onClick={handleSaveKey}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40"
              >
                <Save size={18} />
                儲存設定
              </button>
              
              {/* 新增：手動同步按鈕 */}
              <button
                onClick={handleSyncContext}
                disabled={isSyncing}
                className="w-full bg-slate-900/60 hover:bg-slate-800/80 text-gray-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 mt-2"
              >
                {isSyncing ? <Loader size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {isSyncing ? '正在同步...' : '同步個人資料與訓練紀錄'}
              </button>
              <p className="text-[10px] text-gray-500 text-center">
                同步後，教練將依您的個人檔案與行事曆紀錄提供建議。
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 min-h-full">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-surface-800 text-gray-100 rounded-bl-none border border-gray-800'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="bg-slate-900/70 p-4 rounded-2xl rounded-bl-none border border-white/10 flex items-center space-x-2">
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
        <div className="p-4 border-t border-white/5 bg-slate-950/70 md:rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={apiKey ? "輸入問題，教練將依您的紀錄回覆..." : "請先設定 API Key"}
              disabled={!apiKey}
              className="flex-1 bg-slate-900/70 text-white placeholder-gray-500 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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