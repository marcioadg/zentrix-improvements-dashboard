import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for prefetching data on hover to make navigation feel instant
 * Reduces perceived loading time by loading before user clicks
 */
export const usePrefetch = (
  queryKey: string[],
  queryFn: () => Promise<any>,
  delay: number = 100
) => {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    const timeoutId = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime: 60000, // Cache for 1 minute
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [queryClient, queryKey, queryFn, delay]);

  const handleMouseEnter = useCallback(() => {
    const cleanup = prefetch();
    return cleanup;
  }, [prefetch]);

  return { onMouseEnter: handleMouseEnter, prefetch };
};
