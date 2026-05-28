import { useState, useRef, useCallback } from 'react';

interface PullToRefreshConfig {
  threshold?: number; // Distance in px to trigger refresh
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export const usePullToRefresh = (config: PullToRefreshConfig) => {
  const {
    threshold = 80,
    onRefresh,
    disabled = false,
  } = config;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const scrollElement = useRef<HTMLElement | null>(null);
  
  // Direction detection refs
  const directionLocked = useRef(false);
  const isHorizontalSwipe = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    const element = e.currentTarget as HTMLElement;
    scrollElement.current = element;

    // Reset direction detection
    directionLocked.current = false;
    isHorizontalSwipe.current = false;

    // Only track potential pull-to-refresh if already at top of scroll
    if (element.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      // DON'T set isPulling yet - wait for vertical movement confirmation
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // If we never started tracking (not at top), ignore
    if (!startY.current) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const distanceY = currentY - startY.current;
    const distanceX = Math.abs(currentX - startX.current);

    // Lock direction on first significant movement
    if (!directionLocked.current && (distanceX > 10 || Math.abs(distanceY) > 10)) {
      isHorizontalSwipe.current = distanceX > Math.abs(distanceY);
      directionLocked.current = true;
      
      // If horizontal swipe detected, abort pull-to-refresh completely
      if (isHorizontalSwipe.current) {
        setIsPulling(false);
        setPullDistance(0);
        startY.current = 0;
        startX.current = 0;
        return; // Let SwipeableCard handle it
      }
    }

    // If this is a horizontal swipe, don't interfere
    if (isHorizontalSwipe.current) {
      return;
    }

    // Only proceed with vertical pull-to-refresh logic
    const distance = Math.max(0, distanceY);

    // Activate pull-to-refresh only for clear downward pulls
    if (distance > 15 && !isPulling && !isHorizontalSwipe.current) {
      setIsPulling(true);
    }

    if (!isPulling && distance <= 15) {
      return; // Not enough vertical movement yet
    }

    // Apply resistance as user pulls further
    const resistance = distance > threshold ? 0.5 : 1;
    setPullDistance(distance * resistance);

    // Prevent scrolling only for confirmed vertical pulls
    if (distance > 10 && !isHorizontalSwipe.current && isPulling) {
      e.preventDefault();
    }
  }, [isPulling, threshold, disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return;

    // Reset direction tracking
    directionLocked.current = false;
    isHorizontalSwipe.current = false;
    startX.current = 0;

    if (!isPulling) {
      startY.current = 0;
      return;
    }

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    startY.current = 0;
  }, [isPulling, pullDistance, threshold, onRefresh, disabled, isRefreshing]);

  const progress = Math.min((pullDistance / threshold) * 100, 100);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldTrigger: pullDistance >= threshold,
  };
};
