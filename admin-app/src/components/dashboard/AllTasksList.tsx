
import React, { useState, memo, useMemo, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OptimizedTaskItem } from '@/components/tasks/OptimizedTaskItem';
import { AddTaskItem } from './tasks/AddTaskItem';
import { AutoArchiveTimer } from './AutoArchiveTimer';
import { VirtualizedList } from '@/components/ui/VirtualizedList';
import { EnhancedSkeleton } from '@/components/ui/EnhancedSkeleton';
import { useProfiles } from '@/hooks/useProfiles';
import { useAdvancedCaching } from '@/hooks/useAdvancedCaching';
import { BusinessLoading } from '@/components/ui/business-loading';
import { TaskFilterPreferences } from '@/hooks/useTaskFilterPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedKanbanTask } from '@/types/tasks';

// Lazy load heavy components
const EditTaskModal = React.lazy(() => 
  import('@/components/modals/EditTaskModal').then(module => ({
    default: module.EditTaskModal
  }))
);

// Constants for virtualization
const TASK_ITEM_HEIGHT = 80;
const VIRTUALIZATION_THRESHOLD = 50;
const CONTAINER_HEIGHT = 600;

interface AllTasksListProps {
  tasks: UnifiedKanbanTask[];
  loading: boolean;
  error: string | null;
  selectedTeamIds: string[];
  filterPreferences: TaskFilterPreferences;
  onAddTask: (title: string, description?: string, priority?: 'low' | 'medium' | 'high', due_date?: string) => Promise<void>;
  onUpdateTask: (taskId: string, updates: any) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, status: 'todo' | 'in-progress' | 'done') => Promise<boolean>;
  onDeleteTask: (taskId: string) => Promise<void>;
  pendingArchives: any[];
  onUndoArchive: (taskId: string) => void;
  progressiveLoading?: boolean;
  loadingProgress?: number;
  onLoadAll?: () => void;
}

export const AllTasksList: React.FC<AllTasksListProps> = memo(({
  tasks,
  loading,
  error,
  selectedTeamIds,
  filterPreferences,
  onAddTask,
  onUpdateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  pendingArchives,
  onUndoArchive,
  progressiveLoading = false,
  loadingProgress = 0,
  onLoadAll
}) => {
  const { user } = useAuth();
  const { profiles } = useProfiles();
  const [editingTask, setEditingTask] = useState<any>(null);

  // Advanced caching for profile data
  const { get: getCachedProfile, set: setCachedProfile } = useAdvancedCaching<any>({
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 200,
    staleWhileRevalidate: true
  });

  // Memoized helper functions with caching
  const profilesMap = useMemo(() => {
    const map = new Map(profiles.map(p => [p.id, p]));
    
    // Cache profiles for faster lookups
    profiles.forEach(profile => {
      setCachedProfile(`profile_${profile.id}`, profile);
    });
    
    return map;
  }, [profiles, setCachedProfile]);

  const getProfileName = useCallback((userId: string) => {
    const cached = getCachedProfile(`profile_${userId}`);
    if (cached) return cached.full_name || 'Unknown User';
    
    const profile = profilesMap.get(userId);
    return profile?.full_name || 'Unknown User';
  }, [profilesMap, getCachedProfile]);

  const getProfileAvatar = useCallback((userId: string) => {
    const cached = getCachedProfile(`profile_${userId}`);
    if (cached) return cached.avatar_url;
    
    const profile = profilesMap.get(userId);
    return profile?.avatar_url;
  }, [profilesMap, getCachedProfile]);

  const getInitials = useCallback((name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }, []);

  // Memoized sorted tasks
  const sortedTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      switch (filterPreferences.sortBy) {
        case 'due_date':
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return sorted;
  }, [tasks, filterPreferences.sortBy]);

  // Optimized event handlers
  const handleAddTask = useCallback(async (
    title: string, 
    description?: string, 
    priority?: 'low' | 'medium' | 'high', 
    due_date?: string
  ) => {
    await onAddTask(title, description, priority, due_date);
  }, [onAddTask]);

  const handleToggleTask = useCallback(async (taskId: string) => {
    // Find the task to determine current status
    const task = sortedTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await onUpdateTaskStatus(taskId, newStatus);
  }, [onUpdateTaskStatus, sortedTasks]);

  const handleArchiveTask = useCallback(async (taskId: string) => {
    await onDeleteTask(taskId);
  }, [onDeleteTask]);

  const handleEditTask = useCallback((task: any) => {
    const editableTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.dueDate,
      user_id: task.userId,
      team_id: task.teamId,
      completed: task.status === 'done',
      priority: task.priority || 'medium',
      created_at: task.createdAt,
      updated_at: task.updatedAt || task.createdAt
    };
    setEditingTask(editableTask);
  }, []);

  const handleUpdateEditedTask = useCallback(async (taskId: string, updates: any) => {
    await onUpdateTask(taskId, updates);
    setEditingTask(null);
  }, [onUpdateTask]);

  // Render individual task item (memoized)
  const renderTaskItem = useCallback((task: UnifiedKanbanTask, index: number) => (
    <OptimizedTaskItem
      key={task.id}
      task={{
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        dueDate: task.due_date,
        // Get the primary assignee (single user for display compatibility)
        assignedTo: [task.assigned_to && task.assigned_to.length > 0 ? task.assigned_to[0] : task.user_id],
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        userId: task.user_id,
        taskType: task.task_type as 'personal' | 'team',
        teamId: task.team_id,
        teamName: undefined, // Will be populated by backend if needed
        
      }}
      onToggle={handleToggleTask}
      onUpdate={async (taskId: string, updates: any) => {
        // Convert FastTask updates back to UnifiedKanbanTask format
        const convertedUpdates = {
          title: updates.title,
          description: updates.description,
          status: updates.status,
          due_date: updates.dueDate,
          // Add other conversions as needed
        };
        await onUpdateTask(taskId, convertedUpdates);
      }}
      onDelete={handleArchiveTask}
      onArchive={handleArchiveTask}
      onEdit={handleEditTask}
    />
  ), [getProfileName, handleToggleTask, handleArchiveTask, handleEditTask, onUpdateTask]);

  // Show error state
  if (error && !error.includes('permission') && !error.includes('RLS')) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive mb-4">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading && !progressiveLoading) {
    return <EnhancedSkeleton variant="task-list" />;
  }

  const shoul_virtualize = sortedTasks.length > VIRTUALIZATION_THRESHOLD;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Progressive loading indicator */}
              {/* Add Task Item */}
              <div className="mb-4 pb-4 border-b">
                <AddTaskItem onAddTask={handleAddTask} />
              </div>

              {progressiveLoading && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Loading tasks... ({Math.round(loadingProgress)}%)</span>
                    {onLoadAll && (
                      <button 
                        onClick={onLoadAll}
                        className="text-primary hover:underline"
                      >
                        Load all ({sortedTasks.length} tasks)
                      </button>
                    )}
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Task List - Virtualized for large lists */}
              {shoul_virtualize ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Showing {sortedTasks.length} tasks (virtualized for performance)
                  </p>
                  <VirtualizedList
                    items={sortedTasks}
                    itemHeight={TASK_ITEM_HEIGHT}
                    height={CONTAINER_HEIGHT}
                    renderItem={renderTaskItem}
                    className="border rounded-lg"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTasks.map((task) => renderTaskItem(task, 0))}
                </div>
              )}

              {sortedTasks.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  {filterPreferences.myTasksOnly
                    ? 'No active tasks assigned to you. Check settings to show archived tasks or all tasks.'
                    : 'No active tasks found for the selected teams. Check settings to show archived tasks.'
                  }
                  <div className="mt-2 text-xs text-muted-foreground/70">
                    Selected teams: {selectedTeamIds.join(', ')}
                  </div>
                  {error && error.includes('permission') && (
                    <div className="mt-2 text-xs text-warning">
                      Note: You may not have access to all selected teams.
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AutoArchiveTimer pendingTasks={pendingArchives} onUndo={onUndoArchive} />

      {editingTask && (
        <Suspense fallback={<EnhancedSkeleton variant="task-item" />}>
          <EditTaskModal 
            open={!!editingTask} 
            onOpenChange={open => !open && setEditingTask(null)} 
            task={editingTask} 
            onUpdate={handleUpdateEditedTask} 
          />
        </Suspense>
      )}
    </>
  );
});

AllTasksList.displayName = 'AllTasksList';
