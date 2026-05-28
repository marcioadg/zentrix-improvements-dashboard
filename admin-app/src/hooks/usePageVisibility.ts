
import { useState, useEffect, useRef, useCallback } from 'react';

const STALENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const hiddenTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      
      if (!nowVisible) {
        // Track when page became hidden
        hiddenTimestampRef.current = Date.now();
      }
      
      setIsVisible(nowVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Returns true only if page was hidden for longer than threshold (5 minutes)
  const shouldRefetchOnVisibility = useCallback(() => {
    if (!hiddenTimestampRef.current) return false;
    const hiddenDuration = Date.now() - hiddenTimestampRef.current;
    const shouldRefetch = hiddenDuration > STALENESS_THRESHOLD;
    hiddenTimestampRef.current = null; // Reset after check
    return shouldRefetch;
  }, []);

  return { isVisible, shouldRefetchOnVisibility };
};

// Legacy export for backwards compatibility - returns just the boolean
export default function usePageVisibilitySimple(): boolean {
  const { isVisible } = usePageVisibility();
  return isVisible;
}
