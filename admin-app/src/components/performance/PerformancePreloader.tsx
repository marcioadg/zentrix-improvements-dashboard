import { useEffect } from 'react';
import { preloadCommonModals } from '@/utils/lazyModals';
import { preloadCharts } from '@/utils/lazyLibraries';

/**
 * Component that preloads heavy resources during idle time
 * Improves perceived performance by loading before user needs them
 */
export const PerformancePreloader = () => {
  useEffect(() => {
    // Preload modals after 2 seconds
    const modalTimeout = setTimeout(() => {
      preloadCommonModals();
    }, 2000);

    // Preload charts after 3 seconds (if user is likely to view dashboard)
    const chartTimeout = setTimeout(() => {
      const isOnDashboard = window.location.pathname.includes('dashboard') || 
                            window.location.pathname.includes('metrics');
      if (isOnDashboard) {
        preloadCharts();
      }
    }, 3000);

    return () => {
      clearTimeout(modalTimeout);
      clearTimeout(chartTimeout);
    };
  }, []);

  return null;
};
