// This hook has been deprecated in favor of useOptimizedUnifiedTasks
// Keeping this file for backward compatibility but redirecting to the unified hook

import { useOptimizedUnifiedTasks } from './useOptimizedUnifiedTasks';
import { logger } from '@/utils/logger';

export const useOptimizedPersonalTasks = () => {
  logger.warn('useOptimizedPersonalTasks is deprecated. Use useOptimizedUnifiedTasks with ["personal"] instead.');
  
  return useOptimizedUnifiedTasks(['personal']);
};
