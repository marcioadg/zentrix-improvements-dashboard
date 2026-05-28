
import { useState, useEffect, useCallback, useMemo } from 'react';

interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  scrollThreshold?: number;
}

interface VirtualizedItem<T> {
  index: number;
  item: T;
  style: React.CSSProperties;
}

export const useVirtualization = <T>(
  items: T[],
  options: VirtualizationOptions
) => {
  const { itemHeight, containerHeight, overscan = 5, scrollThreshold = 100 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Generate virtualized items
  const virtualizedItems = useMemo<VirtualizedItem<T>[]>(() => {
    const result: VirtualizedItem<T>[] = [];
    
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      result.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute',
          top: i * itemHeight,
          left: 0,
          right: 0,
          height: itemHeight
        }
      });
    }
    
    return result;
  }, [items, visibleRange, itemHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    
    // Only update if scroll difference is significant (performance optimization)
    if (Math.abs(newScrollTop - scrollTop) > scrollThreshold) {
      setScrollTop(newScrollTop);
    }
  }, [scrollTop, scrollThreshold]);

  const totalHeight = items.length * itemHeight;

  return {
    virtualizedItems,
    totalHeight,
    handleScroll,
    visibleRange
  };
};
