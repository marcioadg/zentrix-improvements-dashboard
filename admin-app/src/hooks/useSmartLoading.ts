import { useState, useEffect } from 'react';

interface SmartLoadingOptions {
  slowThreshold?: number;
  timeoutThreshold?: number;
}

interface SmartLoadingReturn {
  isLoading: boolean;
  isSlow: boolean;
  showTimeout: boolean;
  friendlyMessage: string;
}

export const useSmartLoading = (
  isLoading: boolean,
  options: SmartLoadingOptions = {}
): SmartLoadingReturn => {
  const { slowThreshold = 2000, timeoutThreshold = 8000 } = options;
  
  const [isSlow, setIsSlow] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false);
      setShowTimeout(false);
      return;
    }

    const slowTimer = setTimeout(() => {
      setIsSlow(true);
    }, slowThreshold);

    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
    }, timeoutThreshold);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeoutTimer);
    };
  }, [isLoading, slowThreshold, timeoutThreshold]);

  const getFriendlyMessage = (): string => {
    if (!isLoading) return '';
    if (showTimeout) return "This is taking longer than usual. Your data might be large or the server may be slow.";
    if (isSlow) return "Still loading... This is taking a bit longer than expected.";
    return "Loading your data...";
  };

  return {
    isLoading,
    isSlow,
    showTimeout,
    friendlyMessage: getFriendlyMessage()
  };
};
