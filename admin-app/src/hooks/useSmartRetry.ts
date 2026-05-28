import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface SmartRetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

interface SmartRetryReturn {
  retry: () => Promise<void>;
  retrying: boolean;
  retryCount: number;
  canRetry: boolean;
  nextRetryIn: number;
  reset: () => void;
}

export const useSmartRetry = (
  operation: () => Promise<any>,
  options: SmartRetryOptions = {}
): SmartRetryReturn => {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 8000 } = options;
  
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  const canRetry = retryCount < maxAttempts;

  const calculateDelay = (attempt: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  };

  const retry = useCallback(async () => {
    if (!canRetry) {
      logger.log('⛔ Max retry attempts reached');
      return;
    }

    setRetrying(true);
    const delay = calculateDelay(retryCount);
    setNextRetryIn(delay);

    logger.log(`🔄 Retry attempt ${retryCount + 1}/${maxAttempts} (waiting ${delay}ms)`);

    // Countdown for user feedback
    const countdownInterval = setInterval(() => {
      setNextRetryIn((prev) => Math.max(0, prev - 100));
    }, 100);

    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      await operation();
      setRetryCount(0);
      setNextRetryIn(0);
      logger.log('✅ Retry successful');
    } catch (error) {
      logger.error('❌ Retry failed:', error);
      setRetryCount((prev) => prev + 1);
      throw error;
    } finally {
      clearInterval(countdownInterval);
      setRetrying(false);
      setNextRetryIn(0);
    }
  }, [operation, retryCount, canRetry, maxAttempts, baseDelay, maxDelay]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setRetrying(false);
    setNextRetryIn(0);
  }, []);

  return {
    retry,
    retrying,
    retryCount,
    canRetry,
    nextRetryIn: Math.ceil(nextRetryIn / 1000),
    reset
  };
};
