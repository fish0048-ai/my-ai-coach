import { updateAIContext as updateAIContextService, getAIContext as getAIContextService } from '../services/aiContextService';

export const updateAIContext = async () => {
  return updateAIContextService();
};

export const getAIContext = async () => {
  return getAIContextService();
};