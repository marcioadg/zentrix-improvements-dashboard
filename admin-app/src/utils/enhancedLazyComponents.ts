
import { lazy } from 'react';
import { logger } from '@/utils/logger';

// Enhanced lazy loading with better error boundaries and loading states
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
) => {
  const LazyComponent = lazy(async () => {
    try {
      logger.log(`🔄 Loading component: ${componentName}`);
      const startTime = performance.now();
      
      const module = await importFn();
      
      const loadTime = performance.now() - startTime;
      logger.log(`✅ Component loaded: ${componentName} (${loadTime.toFixed(2)}ms)`);
      
      return module;
    } catch (error) {
      logger.error(`❌ Failed to load component: ${componentName}`, error);
      throw error;
    }
  });

  // Set display name using Object.defineProperty to avoid TypeScript error
  Object.defineProperty(LazyComponent, 'displayName', {
    value: `Lazy(${componentName})`,
    writable: false
  });
  
  return LazyComponent;
};

// Only lazy load heavy modals that are commonly used
export const LazyEditTaskModal = createLazyComponent(
  () => import('@/components/modals/EditTaskModal').then(module => ({ default: module.EditTaskModal })),
  'EditTaskModal'
);

// Preload commonly used modals
export const preloadHeavyComponents = () => {
  // Preload commonly used modals
  setTimeout(() => {
    import('@/components/modals/EditTaskModal');
  }, 2000);
};
