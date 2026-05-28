
import { useState, useEffect, useRef } from 'react';
import { logger } from '@/utils/logger';

interface UseOptimizedMeetingTimerReturn {
  currentTime: number;
  formatDuration: (duration: number) => string;
}

export const useOptimizedMeetingTimer = (): UseOptimizedMeetingTimerReturn => {
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Performance monitoring - only log significant drift in development
      if (Math.abs(timeSinceLastUpdate - 1000) > 100) {
        logger.debug('Timer drift detected', { 
          actualMs: timeSinceLastUpdate, 
          expectedMs: 1000 
        });
      }
      
      // Use React batching for consistent updates
      requestAnimationFrame(() => {
        setCurrentTime(now);
      });
      
      lastUpdateRef.current = now;
    };

    // Initial update
    updateTimer();
    
    // Use setInterval for precise timing
    const intervalId = setInterval(() => {
      updateTimer();
    }, 1000);

    timerRef.current = intervalId;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const formatDuration = (duration: number): string => {
    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    currentTime,
    formatDuration,
  };
};
