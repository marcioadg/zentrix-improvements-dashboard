
import { useState, useEffect } from 'react';

/**
 * Hook to add a delay before showing loading states to prevent flashing
 * for quick operations
 */
export const useLoadingDelay = (isLoading: boolean, delay: number = 200) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading) {
      timeoutId = setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else {
      setShowLoading(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, delay]);

  return showLoading;
};
