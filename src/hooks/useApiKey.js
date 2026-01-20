import { useState, useEffect, useCallback } from 'react';
import { getApiKey as loadApiKey, setApiKey as persistApiKey, hasApiKey as checkHasApiKey } from '../services/apiKeyService';

/**
 * 統一的 API Key 管理 Hook
 * - 提供響應式的 apiKey 狀態
 * - 封裝 localStorage 存取邏輯
 */
export const useApiKey = () => {
  const [apiKey, setApiKeyState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const key = loadApiKey();
      setApiKeyState(key);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setApiKey = useCallback((key) => {
    persistApiKey(key || '');
    setApiKeyState(key || '');
  }, []);

  const hasApiKey = checkHasApiKey();

  return {
    apiKey,
    setApiKey,
    hasApiKey,
    isLoading,
  };
};

