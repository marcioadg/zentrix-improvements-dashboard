import { useRef, useState, useCallback, useEffect } from 'react';

interface SwipeConfig {
  threshold?: number; // Minimum distance in px to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: () => void; // Called when swipe begins
}

interface Position {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGestures = (config: SwipeConfig) => {
  const {
    threshold = 40, // Lowered for iOS
    velocityThreshold = 0.15, // Lowered for iOS
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
  } = config;

  const startPos = useRef<Position | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDistance, setSwipeDistance] = useState({ x: 0, y: 0 });
  const isHorizontalSwipe = useRef(false);
  const hasTriggeredStart = useRef(false);

  const handleStart = useCallback((x: number, y: number) => {
    startPos.current = {
      x,
      y,
      time: Date.now(),
    };
    isHorizontalSwipe.current = false;
    hasTriggeredStart.current = false;
    setIsSwiping(false);
    setSwipeDistance({ x: 0, y: 0 });
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    if (!startPos.current) return;

    const deltaX = x - startPos.current.x;
    const deltaY = y - startPos.current.y;

    // Determine swipe direction on first significant movement
    if (!isHorizontalSwipe.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only track horizontal swipes
    if (isHorizontalSwipe.current) {
      setSwipeDistance({ x: deltaX, y: 0 });

      // Trigger onSwipeStart once
      if (!hasTriggeredStart.current && Math.abs(deltaX) > 15) {
        hasTriggeredStart.current = true;
        setIsSwiping(true);
        onSwipeStart?.();
      }
    }
  }, [onSwipeStart]);

  const handleEnd = useCallback(() => {
    if (!startPos.current) return;

    const deltaTime = Date.now() - startPos.current.time;
    const { x: deltaX } = swipeDistance;

    // Calculate velocity
    const velocityX = Math.abs(deltaX) / deltaTime;

    // Only process horizontal swipes
    if (isHorizontalSwipe.current && Math.abs(deltaX) > threshold && velocityX > velocityThreshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }

    // Reset
    startPos.current = null;
    isHorizontalSwipe.current = false;
    hasTriggeredStart.current = false;
    setIsSwiping(false);
    setSwipeDistance({ x: 0, y: 0 });
  }, [swipeDistance, threshold, velocityThreshold, onSwipeLeft, onSwipeRight]);

  // Use native event listeners for iOS compatibility (non-passive)
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!startPos.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;

      // Determine direction on first significant movement
      if (!isHorizontalSwipe.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }

      // If horizontal swipe, prevent default scrolling
      if (isHorizontalSwipe.current && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }

      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchEnd = () => {
      handleEnd();
    };

    // Add non-passive listeners for iOS
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  // Ref callback to attach to element
  const setRef = useCallback((el: HTMLElement | null) => {
    elementRef.current = el;
  }, []);

  // Mouse handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!startPos.current) return;
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const handleMouseUp = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  const handleMouseLeave = useCallback(() => {
    if (startPos.current) {
      handleEnd();
    }
  }, [handleEnd]);

  return {
    ref: setRef,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
    isSwiping,
    swipeDistance,
  };
};
