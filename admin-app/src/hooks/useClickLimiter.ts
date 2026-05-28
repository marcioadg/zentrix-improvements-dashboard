import { useState, useCallback, useRef, useEffect } from 'react';

interface UseClickLimiterOptions {
  maxClicks: number;
  resetAfter?: number; // Reset after this many milliseconds
}

export const useClickLimiter = ({ maxClicks, resetAfter }: UseClickLimiterOptions) => {
  const [clickCount, setClickCount] = useState(0);
  const [isLimited, setIsLimited] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback((callback: () => void) => {
    setClickCount(prev => {
      if (prev >= maxClicks) {
        return prev;
      }

      const newCount = prev + 1;

      if (newCount >= maxClicks) {
        setIsLimited(true);

        // Auto-reset if resetAfter is provided
        if (resetAfter) {
          // Clear any existing timeout to prevent duplicates
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            setClickCount(0);
            setIsLimited(false);
          }, resetAfter);
        }
      }

      // Fire callback for valid clicks
      callback();
      return newCount;
    });
  }, [maxClicks, resetAfter]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setClickCount(0);
    setIsLimited(false);
  }, []);

  const remainingClicks = Math.max(0, maxClicks - clickCount);

  return {
    clickCount,
    remainingClicks,
    isLimited,
    handleClick,
    reset
  };
};