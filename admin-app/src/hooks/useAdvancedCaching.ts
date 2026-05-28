
import { useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  backgroundRefetch?: boolean;
  staleWhileRevalidate?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export const useAdvancedCaching = <T>(options: CacheOptions = {}) => {
  const {
    ttl = 5 * 60 * 1000, // 5 minutes
    maxSize = 100,
    backgroundRefetch = true,
    staleWhileRevalidate = true
  } = options;

  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const queryClient = useQueryClient();

  // LRU cache cleanup
  const cleanupCache = useCallback(() => {
    if (cache.current.size <= maxSize) return;

    const entries = Array.from(cache.current.entries());
    entries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    const toRemove = entries.slice(0, entries.length - maxSize);
    toRemove.forEach(([key]) => cache.current.delete(key));
  }, [maxSize]);

  const set = useCallback((key: string, data: T) => {
    const now = Date.now();
    cache.current.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
    cleanupCache();
  }, [cleanupCache]);

  const get = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isStale = (now - entry.timestamp) > ttl;

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = now;

    // Background refetch if stale
    if (isStale && backgroundRefetch) {
      // Trigger background refetch via React Query
      queryClient.invalidateQueries({ queryKey: [key] });
    }

    // Return stale data if allowed, otherwise null
    return (staleWhileRevalidate || !isStale) ? entry.data : null;
  }, [ttl, backgroundRefetch, staleWhileRevalidate, queryClient]);

  const invalidate = useCallback((keyPattern?: string) => {
    if (!keyPattern) {
      cache.current.clear();
      return;
    }

    const keysToDelete = Array.from(cache.current.keys())
      .filter(key => key.includes(keyPattern));
    
    keysToDelete.forEach(key => cache.current.delete(key));
  }, []);

  const stats = useMemo(() => ({
    size: cache.current.size,
    hitRate: 0, // Would need to track hits/misses for accurate rate
    memoryUsage: JSON.stringify(Array.from(cache.current.values())).length
  }), [cache.current.size]);

  return { set, get, invalidate, stats };
};
