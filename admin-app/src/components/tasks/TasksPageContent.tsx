
import React, { memo } from 'react';
import { AllTasksList } from '@/components/dashboard/AllTasksList';
import { TasksKanbanView } from '@/components/tasks/TasksKanbanView';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { UnifiedKanbanTask } from '@/types/tasks';

interface TasksPageContentProps {
  viewMode: 'kanban' | 'list';
  selectedTeamIds: string[];
  filterPreferences: TaskFilterPreferences;
  tasks: UnifiedKanbanTask[];
  convertedTasks: any[];
  tasksLoading: boolean;
  error: string | null;
  kanbanFilterPreferences: any;
  onUpdateTaskStatus: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<boolean>;
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onAddTask: (title: string, description: string, teamSelection: {
    type: 'personal' | 'team';
    teamId?: string;
  }, status?: 'todo' | 'in-progress' | 'done') => Promise<void>;
  onAddTaskFromItem: (title: string, description?: string, priority?: 'low' | 'medium' | 'high', due_date?: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  pendingArchives: any[];
  onUndoArchive: (taskId: string) => void;
  progressiveLoading?: boolean;
  loadingProgress?: number;
  onLoadAll?: () => void;
}

export const TasksPageContent: React.FC<TasksPageContentProps> = memo(({
  viewMode,
  selectedTeamIds,
  filterPreferences,
  tasks,
  convertedTasks,
  tasksLoading,
  error,
  kanbanFilterPreferences,
  onUpdateTaskStatus,
  onUpdateTask,
  onAddTask,
  onAddTaskFromItem,
  onDeleteTask,
  pendingArchives,
  onUndoArchive,
  progressiveLoading = false,
  loadingProgress = 0,
  onLoadAll
}) => {
  const isPersonal = selectedTeamIds.includes('personal') && selectedTeamIds.length === 1;
  const teamId = selectedTeamIds.find(id => id !== 'personal');

  // Error boundary-like error handling
  if (!viewMode) {
    return (
      <div className="mt-8 p-4 bg-destructive/5 border border-red-200 rounded-lg">
        <p className="text-red-800">Error: View mode not specified</p>
      </div>
    );
  }

  if (!selectedTeamIds || selectedTeamIds.length === 0) {
    return (
      <div className="mt-8 p-4 bg-warning/5 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please select at least one team to view tasks</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
        {viewMode === 'list' ? (
          <AllTasksList
            tasks={tasks}
            loading={tasksLoading}
            error={error}
            selectedTeamIds={selectedTeamIds}
            filterPreferences={filterPreferences}
            onAddTask={onAddTaskFromItem}
            onUpdateTask={onUpdateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            pendingArchives={pendingArchives}
            onUndoArchive={onUndoArchive}
            progressiveLoading={progressiveLoading}
            loadingProgress={loadingProgress}
            onLoadAll={onLoadAll}
          />
        ) : (
          <TasksKanbanView
            tasks={convertedTasks}
            loading={tasksLoading}
            isPersonal={isPersonal}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onUpdateTask={onUpdateTask}
            teamId={teamId}
            onAddTask={onAddTask}
            onDeleteTask={onDeleteTask}
            filterPreferences={kanbanFilterPreferences}
          />
        )}
      </div>
    </div>
  );
});

TasksPageContent.displayName = 'TasksPageContent';
