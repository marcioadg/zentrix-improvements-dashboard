import { logger } from '@/utils/logger';

// Navigation utilities for consistent redirect behavior
export const createSafeNavigate = (navigate: (path: string, options?: any) => void) => {
  return (path: string, options: { replace?: boolean; delay?: number } = {}) => {
    const { replace = false, delay = 0 } = options;
    
    logger.log(`🔄 SafeNavigate: Navigating to ${path} ${replace ? '(replace)' : ''} ${delay ? `after ${delay}ms` : ''}`);
    
    const doNavigate = () => {
      try {
        navigate(path, { replace });
        logger.log(`✅ SafeNavigate: Successfully navigated to ${path}`);
      } catch (error) {
        logger.error(`❌ SafeNavigate: Failed to navigate to ${path}:`, error);
        // Fallback: try without replace option
        try {
          navigate(path);
          logger.log(`✅ SafeNavigate: Fallback navigation to ${path} succeeded`);
        } catch (fallbackError) {
          logger.error(`❌ SafeNavigate: Fallback navigation to ${path} also failed:`, fallbackError);
        }
      }
    };

    if (delay > 0) {
      setTimeout(doNavigate, delay);
    } else {
      doNavigate();
    }
  };
};

// Hook for consistent navigation behavior
export const useReliableNavigation = (navigate: (path: string, options?: any) => void) => {
  return createSafeNavigate(navigate);
};
