
import { useRef, useEffect, useCallback } from "react";

/**
 * Debounced callback for React. Resets timer on change.
 **/
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  cb: T,
  delay = 1000
) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cbRef = useRef<T>(cb);

  // Always latest reference
  cbRef.current = cb;

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      cbRef.current(...args);
    }, delay);
  }, [delay]);

  // Clean up on unmount
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Flush immediately
  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      cbRef.current();
    }
  }, []);

  return [debounced, flush] as const;
}
