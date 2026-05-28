
import { useState, useEffect, useCallback, useMemo } from 'react';

interface ProgressiveLoadingOptions<T> {
  batchSize?: number;
  delay?: number;
  priority?: (item: T) => number;
}

export const useProgressiveLoading = <T>(
  items: T[],
  options: ProgressiveLoadingOptions<T> = {}
) => {
  const { batchSize = 20, delay = 50, priority } = options;
  
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoading, setIsLoading] = useState(false);

  // Memoize sorted items to prevent unnecessary recalculations
  const sortedItems = useMemo(() => {
    if (!priority || !items.length) return items;
    
    return [...items].sort((a, b) => priority(b) - priority(a));
  }, [items, priority]);

  // Memoize visible items
  const visibleItems = useMemo(() => {
    return sortedItems.slice(0, visibleCount);
  }, [sortedItems, visibleCount]);

  // Calculate progress
  const progress = useMemo(() => {
    if (sortedItems.length === 0) return 100;
    return Math.min(100, (visibleCount / sortedItems.length) * 100);
  }, [visibleCount, sortedItems.length]);

  // Reset visible count when items change significantly
  useEffect(() => {
    if (sortedItems.length === 0) {
      setVisibleCount(0);
      setIsLoading(false);
      return;
    }

    if (visibleCount > sortedItems.length) {
      setVisibleCount(sortedItems.length);
      setIsLoading(false);
    } else if (visibleCount < Math.min(batchSize, sortedItems.length)) {
      setVisibleCount(Math.min(batchSize, sortedItems.length));
    }
  }, [sortedItems.length, batchSize]); // Remove visibleCount from deps to prevent loop

  // Load more items progressively
  const loadMore = useCallback(() => {
    if (visibleCount >= sortedItems.length) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => {
        const newCount = Math.min(prev + batchSize, sortedItems.length);
        if (newCount >= sortedItems.length) {
          setIsLoading(false);
        }
        return newCount;
      });
    }, delay);
  }, [visibleCount, sortedItems.length, batchSize, delay]);

  // Load all items immediately
  const loadAll = useCallback(() => {
    setVisibleCount(sortedItems.length);
    setIsLoading(false);
  }, [sortedItems.length]);

  // Auto-load more if needed
  useEffect(() => {
    if (visibleCount < sortedItems.length && visibleCount > 0 && !isLoading) {
      const timer = setTimeout(loadMore, delay);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, sortedItems.length, isLoading, loadMore, delay]);

  return {
    visibleItems,
    isLoading: isLoading || visibleCount < sortedItems.length,
    loadAll,
    progress
  };
};
