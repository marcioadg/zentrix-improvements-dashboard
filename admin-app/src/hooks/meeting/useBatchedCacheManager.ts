import { useRef, useCallback } from 'react';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { logger } from '@/utils/logger';

interface CacheInvalidationRequest {
  id: string;
  timestamp: number;
  source: string;
}

/**
 * Batched cache manager to prevent cascade invalidations during meeting operations
 */
export const useBatchedCacheManager = () => {
  const { isInProtectionPeriod, hasActiveOperations } = useMeetingEndState();
  const pendingInvalidationsRef = useRef<Map<string, CacheInvalidationRequest>>(new Map());
  const batchTimeoutRef = useRef<NodeJS.Timeout>();

  const requestCacheInvalidation = useCallback((source: string, callback: () => void) => {
    const id = `${source}-${Date.now()}`;
    const request: CacheInvalidationRequest = {
      id,
      timestamp: Date.now(),
      source
    };

    // Check if we're in a meeting operation - if so, defer the invalidation
    const isMeetingOperation = isInProtectionPeriod() || hasActiveOperations();
    
    logger.log('🔄 BatchedCache: Queueing invalidation request', { 
      source, 
      id, 
      isMeetingOperation,
      hasActiveOperations: hasActiveOperations(),
      isInProtectionPeriod: isInProtectionPeriod()
    });
    
    pendingInvalidationsRef.current.set(id, request);

    // Clear existing timeout to batch requests
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Extended batching window during meeting operations to prevent reloads
    const batchWindow = isMeetingOperation ? 10000 : 1000; // 10s during meeting ops, 1s normal
    
    batchTimeoutRef.current = setTimeout(() => {
      // Re-check protection state before executing
      const stillProtected = isInProtectionPeriod() || hasActiveOperations();
      
      if (stillProtected) {
        logger.log('🚫 BatchedCache: Still in protection period, deferring invalidation');
        // Reschedule for later
        requestCacheInvalidation(source, callback);
        return;
      }
      
      const requests = Array.from(pendingInvalidationsRef.current.values());
      
      if (requests.length > 0) {
        logger.log('🔄 BatchedCache: Executing batched invalidation', {
          requestCount: requests.length,
          sources: requests.map(r => r.source)
        });
        
        // Execute the callback once for all batched requests
        callback();
        
        // Clear processed requests
        pendingInvalidationsRef.current.clear();
      }
    }, batchWindow);

    return id;
  }, [isInProtectionPeriod, hasActiveOperations]);

  const cancelInvalidation = useCallback((id: string) => {
    logger.log('🚫 BatchedCache: Cancelling invalidation request', id);
    pendingInvalidationsRef.current.delete(id);
    
    // If no more requests, cancel the timeout
    if (pendingInvalidationsRef.current.size === 0 && batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = undefined;
    }
  }, []);

  const flushInvalidations = useCallback((callback: () => void) => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    const requests = Array.from(pendingInvalidationsRef.current.values());
    if (requests.length > 0) {
      logger.log('🔄 BatchedCache: Force flushing invalidations', {
        requestCount: requests.length
      });
      callback();
      pendingInvalidationsRef.current.clear();
    }
  }, []);

  return {
    requestCacheInvalidation,
    cancelInvalidation,
    flushInvalidations,
    hasPendingInvalidations: () => pendingInvalidationsRef.current.size > 0
  };
};