import { useState, useEffect, RefObject } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

/**
 * Hook to lazy load content when it enters the viewport
 * Only loads component when visible - saves initial render time
 */
export const useLazyLoad = (
  ref: RefObject<HTMLElement>,
  options: UseLazyLoadOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '50px', enabled = true } = options;
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || hasLoaded) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true);
            setHasLoaded(true);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, threshold, rootMargin, enabled, hasLoaded]);

  return { isVisible, hasLoaded };
};
