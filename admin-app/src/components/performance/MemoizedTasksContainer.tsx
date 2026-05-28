import React, { memo } from 'react';
import { TasksPageContainer } from '@/components/tasks/TasksPageContainer';

interface MemoizedTasksContainerProps {
  loading: boolean;
  pendingArchives: any[];
  onUndo: (taskId: string) => void;
  children: React.ReactNode;
}

// Memoized version of TasksPageContainer to prevent unnecessary re-renders
export const MemoizedTasksContainer = memo<MemoizedTasksContainerProps>(({
  loading,
  pendingArchives,
  onUndo,
  children
}) => {
  return (
    <TasksPageContainer
      loading={loading}
      pendingArchives={pendingArchives}
      onUndo={onUndo}
    >
      {children}
    </TasksPageContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.pendingArchives.length === nextProps.pendingArchives.length &&
    prevProps.onUndo === nextProps.onUndo &&
    prevProps.children === nextProps.children
  );
});

MemoizedTasksContainer.displayName = 'MemoizedTasksContainer';