
import { useToast } from '@/hooks/use-toast';
import { CLARITY_BREAK_ERRORS } from './constants';
import { logger } from '@/utils/logger';

export const createErrorHandler = (toast: ReturnType<typeof useToast>['toast']) => {
  return (error: unknown, operation: keyof typeof CLARITY_BREAK_ERRORS, shouldShowToast = true) => {
    logger.error(`Error in clarity breaks ${operation}:`, error);
    
    if (shouldShowToast) {
      toast({
        title: "Can't complete action",
        description: CLARITY_BREAK_ERRORS[operation],
        variant: "destructive",
      });
    }
  };
};

export const createSuccessHandler = (toast: ReturnType<typeof useToast>['toast']) => {
  return (title: string, description: string) => {
    toast({
      title,
      description,
    });
  };
};
