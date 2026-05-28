import React, { memo, useMemo } from 'react';
import { TasksPageContainer } from '@/components/tasks/TasksPageContainer';
import { useOptimizedTaskFiltering } from '@/hooks/useOptimizedTaskFiltering';
import { FastTask, TeamInfo } from '@/hooks/fast-tasks/types';

interface OptimizedTasksPageProps {
  tasks: FastTask[];
  teamInfo: TeamInfo[];
  currentCompanyId?: string;
  loading: boolean;
  pendingArchives: any[];
  onUndo: (taskId: string) => void;
  children: React.ReactNode;
}

/**
 * Optimized version of the tasks page that prevents unnecessary re-renders
 * and implements efficient filtering with memoization
 */
export const OptimizedTasksPage = memo<OptimizedTasksPageProps>(({
  tasks,
  teamInfo,
  currentCompanyId,
  loading,
  pendingArchives,
  onUndo,
  children
}) => {
  // Use optimized filtering hook with memoization
  const { filteredTasks, taskBreakdown } = useOptimizedTaskFiltering(
    tasks,
    teamInfo,
    currentCompanyId
  );

  // Memoize children to prevent cascading re-renders
  const optimizedChildren = useMemo(() => {
    return children;
  }, [children]);

  return (
    <TasksPageContainer
      loading={loading}
      pendingArchives={pendingArchives}
      onUndo={onUndo}
    >
      {optimizedChildren}
    </TasksPageContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.tasks === nextProps.tasks &&
    prevProps.teamInfo === nextProps.teamInfo &&
    prevProps.currentCompanyId === nextProps.currentCompanyId &&
    prevProps.pendingArchives.length === nextProps.pendingArchives.length &&
    prevProps.onUndo === nextProps.onUndo
  );
});

OptimizedTasksPage.displayName = 'OptimizedTasksPage';