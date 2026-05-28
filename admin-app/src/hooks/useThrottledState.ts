
import { useState, useCallback, useRef } from 'react';

export const useThrottledState = <T>(initialValue: T, delay: number = 100) => {
  const [state, setState] = useState<T>(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T>(initialValue);

  const setThrottledState = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(pendingValueRef.current)
      : newValue;
    
    pendingValueRef.current = resolvedValue;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(resolvedValue);
      timeoutRef.current = null;
    }, delay);
  }, [delay]);

  return [state, setThrottledState] as const;
};
