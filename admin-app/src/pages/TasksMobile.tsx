import React, { useEffect } from 'react';
import { MobileTasksPageWithUnifiedSubscriptions } from '@/components/tasks/MobileTasksPageWithUnifiedSubscriptions';
import { useMobileDataPreloader } from '@/hooks/mobile/useMobileDataPreloader';

export default function TasksMobilePage() {
  const { preloadAllMobilePages } = useMobileDataPreloader();

  // Preload all other mobile pages after this page loads
  useEffect(() => {
    // Use requestIdleCallback for optimal timing (during browser idle time)
    if ('requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(() => {
        preloadAllMobilePages('tasks'); // Exclude self
      }, { timeout: 2000 });
      
      return () => (window as any).cancelIdleCallback(idleId);
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(() => preloadAllMobilePages('tasks'), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [preloadAllMobilePages]);

  return <MobileTasksPageWithUnifiedSubscriptions />;
}