import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

interface OptimisticUpdate<T> {
  id: string;
  originalData: T | null;
  optimisticData: T;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * High-performance optimistic state management for mobile
 * - Instant UI updates
 * - Automatic rollback on failure
 * - Deduplication of rapid updates
 */
export function useOptimisticMobileState<T extends { id: string }>() {
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate<T>>>(new Map());
  const pendingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Apply optimistic update instantly
  const applyOptimistic = useCallback((
    data: T[],
    update: T,
    operation: 'add' | 'update' | 'remove'
  ): T[] => {
    switch (operation) {
      case 'add':
        return [update, ...data];
      case 'update':
        return data.map(item => item.id === update.id ? { ...item, ...update } : item);
      case 'remove':
        return data.filter(item => item.id !== update.id);
      default:
        return data;
    }
  }, []);

  // Start an optimistic update
  const startOptimistic = useCallback((
    id: string,
    optimisticData: T,
    originalData: T | null = null,
    timeoutMs: number = 10000
  ) => {
    // Clear any existing timer for this ID
    const existingTimer = pendingTimers.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set the optimistic update
    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.set(id, {
        id,
        originalData,
        optimisticData,
        timestamp: Date.now(),
        status: 'pending'
      });
      return next;
    });

    // Set auto-timeout for rollback
    const timer = setTimeout(() => {
      logger.warn(`[OptimisticState] Timeout for ${id}, rolling back`);
      rollback(id);
    }, timeoutMs);

    pendingTimers.current.set(id, timer);

    return id;
  }, []);

  // Confirm the optimistic update succeeded
  const confirm = useCallback((id: string) => {
    const timer = pendingTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.current.delete(id);
    }

    setOptimisticUpdates(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Rollback the optimistic update
  const rollback = useCallback((id: string) => {
    const timer = pendingTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      pendingTimers.current.delete(id);
    }

    setOptimisticUpdates(prev => {
      const update = prev.get(id);
      if (update) {
        logger.log(`[OptimisticState] Rolling back ${id}`);
      }
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    return optimisticUpdates.get(id)?.originalData || null;
  }, [optimisticUpdates]);

  // Check if an item has a pending optimistic update
  const isPending = useCallback((id: string) => {
    return optimisticUpdates.has(id);
  }, [optimisticUpdates]);

  // Get all pending IDs
  const getPendingIds = useCallback(() => {
    return Array.from(optimisticUpdates.keys());
  }, [optimisticUpdates]);

  // Cleanup all timers
  const cleanup = useCallback(() => {
    pendingTimers.current.forEach(timer => clearTimeout(timer));
    pendingTimers.current.clear();
    setOptimisticUpdates(new Map());
  }, []);

  return {
    applyOptimistic,
    startOptimistic,
    confirm,
    rollback,
    isPending,
    getPendingIds,
    cleanup,
    pendingCount: optimisticUpdates.size
  };
}

/**
 * Quick optimistic action helper - fire and forget with auto-cleanup
 */
export function useQuickOptimistic() {
  const perform = useCallback(async <T>(
    optimisticFn: () => void,
    asyncFn: () => Promise<T>,
    rollbackFn: () => void
  ): Promise<T | null> => {
    // Apply optimistic update immediately
    optimisticFn();

    try {
      const result = await asyncFn();
      return result;
    } catch (error) {
      logger.error('[QuickOptimistic] Failed, rolling back:', error);
      rollbackFn();
      return null;
    }
  }, []);

  return { perform };
}
