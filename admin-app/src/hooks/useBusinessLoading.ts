
import { useState, useEffect } from 'react';

interface UseBusinessLoadingProps {
  isLoading: boolean;
  delay?: number;
}

export const useBusinessLoading = ({ isLoading, delay = 0 }: UseBusinessLoadingProps) => {
  const [showBusinessLoading, setShowBusinessLoading] = useState(delay === 0);

  useEffect(() => {
    if (!isLoading) {
      setShowBusinessLoading(false);
      return;
    }

    if (delay === 0) {
      setShowBusinessLoading(true);
      return;
    }

    const timer = setTimeout(() => {
      setShowBusinessLoading(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return { showBusinessLoading };
};
