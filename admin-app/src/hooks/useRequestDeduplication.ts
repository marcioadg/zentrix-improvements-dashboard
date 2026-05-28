
import { useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface RequestCache<T = any> {
  promise: Promise<T>;
  timestamp: number;
}

interface DeduplicationOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

export const useRequestDeduplication = (options: DeduplicationOptions = {}) => {
  const { ttl = 5000, maxSize = 50 } = options;
  const cache = useRef<Map<string, RequestCache>>(new Map());

  const cleanup = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(cache.current.entries());
    
    // Remove expired entries
    for (const [key, value] of entries) {
      if (now - value.timestamp > ttl) {
        cache.current.delete(key);
      }
    }

    // If still over limit, remove oldest entries
    if (cache.current.size > maxSize) {
      const sortedEntries = entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, cache.current.size - maxSize);
      
      for (const [key] of sortedEntries) {
        cache.current.delete(key);
      }
    }
  }, [ttl, maxSize]);

  const deduplicate = useCallback(async <T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    // Clean up expired entries
    cleanup();

    const cached = cache.current.get(key);
    const now = Date.now();

    // Return cached promise if still valid
    if (cached && (now - cached.timestamp) < ttl) {
      logger.log('🔄 Request deduplication cache hit:', key);
      return cached.promise;
    }

    // Create new request
    logger.log('🆕 Request deduplication cache miss:', key);
    const promise = requestFn();
    
    cache.current.set(key, {
      promise,
      timestamp: now
    });

    // Remove from cache after completion (success or failure)
    promise.finally(() => {
      // Small delay to allow concurrent requests to benefit from deduplication
      setTimeout(() => {
        cache.current.delete(key);
      }, 100);
    });

    return promise;
  }, [ttl, cleanup]);

  const invalidate = useCallback((keyPattern?: string) => {
    if (keyPattern) {
      // Remove entries matching pattern
      for (const key of cache.current.keys()) {
        if (key.includes(keyPattern)) {
          cache.current.delete(key);
        }
      }
    } else {
      // Clear all entries
      cache.current.clear();
    }
  }, []);

  return { deduplicate, invalidate };
};
