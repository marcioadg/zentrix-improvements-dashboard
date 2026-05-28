import { useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface RequestTracker {
  [key: string]: {
    lastCall: number;
    throttleMs: number;
  };
}

/**
 * Hook to optimize network requests by preventing duplicate/excessive calls
 */
export const useNetworkOptimization = () => {
  const requestTracker = useRef<RequestTracker>({});

  const shouldThrottleRequest = (key: string, throttleMs: number = 1000): boolean => {
    const now = Date.now();
    const tracker = requestTracker.current[key];
    
    if (!tracker) {
      requestTracker.current[key] = { lastCall: now, throttleMs };
      return false;
    }
    
    if (now - tracker.lastCall < throttleMs) {
      logger.log('🚦 Network optimization: Throttling request for', key);
      return true;
    }
    
    tracker.lastCall = now;
    return false;
  };

  const createThrottledFunction = <T extends any[], R>(
    fn: (...args: T) => R,
    key: string,
    throttleMs: number = 1000
  ) => {
    return (...args: T): R | undefined => {
      if (shouldThrottleRequest(key, throttleMs)) {
        return undefined;
      }
      return fn(...args);
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      requestTracker.current = {};
    };
  }, []);

  return {
    shouldThrottleRequest,
    createThrottledFunction
  };
};