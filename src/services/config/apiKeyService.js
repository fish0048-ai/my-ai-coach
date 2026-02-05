const STORAGE_KEY = 'gemini_api_key';

export const getApiKey = () => {
  return localStorage.getItem(STORAGE_KEY) || '';
};

export const setApiKey = (apiKey) => {
  localStorage.setItem(STORAGE_KEY, apiKey || '');
};

export const hasApiKey = () => {
  return Boolean(getApiKey());
};
