
import React from 'react';
import { AutoArchiveTimer } from '@/components/dashboard/AutoArchiveTimer';
import { TasksProgressiveLoader } from './TasksProgressiveLoader';

interface TasksPageContainerProps {
  loading: boolean;
  pendingArchives: any[];
  onUndo: (taskId: string) => void;
  children: React.ReactNode;
}

export const TasksPageContainer: React.FC<TasksPageContainerProps> = ({
  loading,
  pendingArchives,
  onUndo,
  children,
}) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {loading ? (
        <TasksProgressiveLoader />
      ) : (
        <>
          {children}
          <AutoArchiveTimer
            pendingTasks={pendingArchives}
            onUndo={onUndo}
          />
        </>
      )}
    </div>
  );
};
