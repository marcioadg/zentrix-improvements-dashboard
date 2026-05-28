
import { useCallback } from 'react';
import { safeStorage } from '@/utils/safeStorage';

export type TaskViewMode = 'list' | 'kanban';

export const useTaskViewPreferences = () => {
  const getViewMode = useCallback((): TaskViewMode => {
    const stored = safeStorage.getItem('task-view-mode');
    return (stored as TaskViewMode) || 'list';
  }, []);

  const setViewMode = useCallback((mode: TaskViewMode) => {
    safeStorage.setItem('task-view-mode', mode);
  }, []);

  return {
    getViewMode,
    setViewMode,
  };
};
