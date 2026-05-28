import { lazy } from 'react';

/**
 * Lazy-loaded modal components to reduce initial bundle size
 * Modals are only loaded when opened
 */

// Goal modals
export const LazyGoalModal = lazy(() => 
  import('@/components/modals/GoalModal').then(module => ({ 
    default: module.GoalModal 
  }))
);

// Task modals
export const LazyEditTaskModal = lazy(() => 
  import('@/components/modals/EditTaskModal').then(module => ({ 
    default: module.EditTaskModal 
  }))
);

// Preload commonly used modals on idle
export const preloadCommonModals = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('@/components/modals/GoalModal');
      import('@/components/modals/EditTaskModal');
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      import('@/components/modals/GoalModal');
      import('@/components/modals/EditTaskModal');
    }, 2000);
  }
};
