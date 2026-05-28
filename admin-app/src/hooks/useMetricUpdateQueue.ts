import { useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

interface QueuedUpdate {
  metricId: string;
  weekStart: string;
  value: number | null;
  timestamp: number;
}

/**
 * Hook to prevent duplicate metric updates and ensure clean state transitions
 */
export const useMetricUpdateQueue = () => {
  const processingRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<Map<string, QueuedUpdate>>(new Map());

  const isProcessing = useCallback((metricId: string, weekStart: string) => {
    const key = `${metricId}-${weekStart}`;
    return processingRef.current.has(key);
  }, []);

  const startProcessing = useCallback((metricId: string, weekStart: string) => {
    const key = `${metricId}-${weekStart}`;
    processingRef.current.add(key);
    
    // Clear any queued update for this key since we're processing now
    queueRef.current.delete(key);
    
    logger.log('🔧 useMetricUpdateQueue: Started processing', key);
  }, []);

  const finishProcessing = useCallback((metricId: string, weekStart: string) => {
    const key = `${metricId}-${weekStart}`;
    processingRef.current.delete(key);
    
    logger.log('✅ useMetricUpdateQueue: Finished processing', key);
    
    // Check if there's a newer update queued for this key
    const queuedUpdate = queueRef.current.get(key);
    if (queuedUpdate) {
      logger.log('🔄 useMetricUpdateQueue: Found queued update, returning it', queuedUpdate);
      queueRef.current.delete(key);
      return queuedUpdate;
    }
    
    return null;
  }, []);

  const queueUpdate = useCallback((metricId: string, weekStart: string, value: number | null) => {
    const key = `${metricId}-${weekStart}`;
    
    if (processingRef.current.has(key)) {
      // If already processing, queue this update
      queueRef.current.set(key, {
        metricId,
        weekStart,
        value,
        timestamp: Date.now()
      });
      
      logger.log('⏳ useMetricUpdateQueue: Queued update for', key, { value });
      return false; // Don't process now
    }
    
    return true; // Process immediately
  }, []);

  const getQueueSize = useCallback(() => {
    return queueRef.current.size;
  }, []);

  const getProcessingCount = useCallback(() => {
    return processingRef.current.size;
  }, []);

  return {
    isProcessing,
    startProcessing,
    finishProcessing,
    queueUpdate,
    getQueueSize,
    getProcessingCount
  };
};