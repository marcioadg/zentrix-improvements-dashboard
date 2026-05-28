import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUnifiedTasks } from '@/hooks/useOptimizedUnifiedTasks';
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

export const TasksCardResilient: React.FC = () => {
  const { user } = useAuth();
  const { tasks, loading, error, updateTaskStatus, refetch } = useOptimizedUnifiedTasks(['personal'], { myTasksOnly: true });

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const newStatus = completed ? 'done' : 'todo';
      await updateTaskStatus(taskId, newStatus);
    } catch (error) {
      logger.error('Error toggling task:', error);
    }
  };

  // Simplified loading state without BusinessLoading component
  if (loading) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Loading tasks...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg animate-pulse">
              <div className="w-5 h-5 bg-muted-foreground/20 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted-foreground/20 rounded"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-destructive font-medium">
            Error loading tasks
          </span>
        </div>
        
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-muted-foreground mb-4">Failed to load tasks</p>
          <Button 
            onClick={refetch} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const incompleteTasks = tasks.filter(task => task.status !== 'done');
  const recentCompletedTasks = tasks
    .filter(task => task.status === 'done')
    .slice(0, 3);

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {incompleteTasks.length} active tasks
        </span>
      </div>

      <div className="space-y-2 overflow-auto max-h-[300px]">
        {incompleteTasks.length === 0 && recentCompletedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Checkbox className="w-8 h-8 mx-auto mb-2 opacity-50" disabled />
            <p>No tasks yet</p>
          </div>
        ) : (
          <>
            {/* Incomplete Tasks */}
            {incompleteTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 bg-card rounded-lg border hover:border-border transition-colors"
              >
                <div className="mt-0.5">
                  <Checkbox 
                    checked={false}
                    onCheckedChange={() => handleToggleTask(task.id, true)}
                    className="hover:border-primary transition-colors"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={task.title}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1" title={task.description}>
                      {task.description}
                    </p>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Recently Completed Tasks */}
            {recentCompletedTasks.length > 0 && (
              <>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground font-medium">Recently completed</span>
                </div>
                {recentCompletedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-2 bg-muted rounded-lg opacity-75"
                  >
                    <div className="mt-0.5">
                      <Checkbox 
                        checked={true}
                        onCheckedChange={() => handleToggleTask(task.id, false)}
                        className="hover:border-muted-foreground transition-colors"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground line-through truncate" title={task.title}>
                        {task.title}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};