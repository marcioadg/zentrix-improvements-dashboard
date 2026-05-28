import { useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

// Component import map for preloading
const mobileComponentMap = {
  issues: () => import('@/pages/IssuesMobile'),
  goals: () => import('@/pages/GoalsMobile'),
  metrics: () => import('@/pages/MetricsMobile'),
  tasks: () => import('@/pages/TasksMobile'),
};

/**
 * Preloads adjacent mobile pages data AND components for instant navigation
 */
export function useMobileDataPreloader() {
  const queryClient = useQueryClient();
  const preloadedDataRef = useRef<Set<string>>(new Set());
  const preloadedComponentsRef = useRef<Set<string>>(new Set());

  // Preload component for a page
  const preloadComponent = useCallback((page: keyof typeof mobileComponentMap) => {
    if (preloadedComponentsRef.current.has(page)) return;
    preloadedComponentsRef.current.add(page);
    
    const startTime = performance.now();
    mobileComponentMap[page]?.()
      .then(() => {
        const loadTime = performance.now() - startTime;
        logger.log(`✅ Component preloaded: ${page} (${loadTime.toFixed(0)}ms)`);
      })
      .catch(err => logger.error(`❌ Failed to preload ${page} component:`, err));
  }, []);

  // Preload data for common mobile navigation patterns
  const preloadPage = useCallback((page: 'issues' | 'tasks' | 'goals' | 'metrics') => {
    // Always try to preload component
    preloadComponent(page);
    
    if (preloadedDataRef.current.has(page)) return;
    preloadedDataRef.current.add(page);

    // Prefetch queries for the page
    switch (page) {
      case 'issues':
        queryClient.prefetchQuery({
          queryKey: ['issue-counts'],
          staleTime: 60000,
        });
        break;
      case 'goals':
        queryClient.prefetchQuery({
          queryKey: ['mobile-goals'],
          staleTime: 60000,
        });
        break;
      case 'tasks':
        queryClient.prefetchQuery({
          queryKey: ['fast_tasks'],
          staleTime: 30000,
        });
        break;
      case 'metrics':
        queryClient.prefetchQuery({
          queryKey: ['weekly-metrics'],
          staleTime: 60000,
        });
        break;
    }
  }, [queryClient, preloadComponent]);

  // Preload ALL mobile pages (for initial load optimization)
  const preloadAllMobilePages = useCallback((excludePage?: string) => {
    logger.log('📱 Starting background preload of all mobile pages...');
    const allPages = ['tasks', 'issues', 'goals', 'metrics'] as const;
    const pages = excludePage 
      ? allPages.filter(p => p !== excludePage) 
      : allPages;
    
    pages.forEach((page, index) => {
      setTimeout(() => preloadPage(page), (index + 1) * 500);
    });
  }, [preloadPage]);

  // Preload adjacent pages based on current location (always includes tasks)
  const preloadAdjacent = useCallback((currentPage: string) => {
    const pages = ['tasks', 'issues', 'goals', 'metrics'] as const;
    const currentIndex = pages.indexOf(currentPage as typeof pages[number]);
    
    if (currentIndex === -1) return;

    // Always preload tasks first (most common destination)
    if (currentPage !== 'tasks') {
      setTimeout(() => preloadPage('tasks'), 300);
    }

    // Then preload adjacent pages
    if (currentIndex > 0 && pages[currentIndex - 1] !== 'tasks') {
      setTimeout(() => preloadPage(pages[currentIndex - 1]), 600);
    }
    if (currentIndex < pages.length - 1 && pages[currentIndex + 1] !== 'tasks') {
      setTimeout(() => preloadPage(pages[currentIndex + 1]), 600);
    }
  }, [preloadPage]);

  return { preloadPage, preloadAdjacent, preloadAllMobilePages };
}

/**
 * Intersection observer for lazy loading list items
 */
export function useLazyLoadTrigger(
  onVisible: () => void,
  options: { threshold?: number; rootMargin?: string } = {}
) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = triggerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true;
          onVisible();
        }
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '100px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [onVisible, options.threshold, options.rootMargin]);

  return triggerRef;
}
