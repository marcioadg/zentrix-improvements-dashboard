
import { lazy } from 'react';

// Lazy load heavy components
export const LazyTasksKanbanView = lazy(() => 
  import('@/components/tasks/TasksKanbanView').then(module => ({
    default: module.TasksKanbanView
  }))
);

export const LazyEditTaskModal = lazy(() => 
  import('@/components/modals/EditTaskModal').then(module => ({
    default: module.EditTaskModal
  }))
);

export const LazyEnhancedAddTaskModal = lazy(() => 
  import('@/components/modals/EnhancedAddTaskModal').then(module => ({
    default: module.EnhancedAddTaskModal
  }))
);

// Preload components that are likely to be used
export const preloadComponents = () => {
  // Preload after initial render
  setTimeout(() => {
    import('@/components/tasks/TasksKanbanView');
    import('@/components/modals/EditTaskModal');
  }, 100);
};
