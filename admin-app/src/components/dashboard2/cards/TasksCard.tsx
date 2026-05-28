import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  created_at: string;
}

export const TasksCardNoBlink: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Simple, direct query without any RPC calls
      const { data: personalTasks, error: tasksError } = await supabase
        .from('fast_tasks')
        .select('id, title, description, status, due_date, created_at')
        .eq('task_type', 'personal')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10);

      if (tasksError) {
        logger.error('Error fetching tasks:', tasksError);
        setError('Failed to load tasks');
        return;
      }

      setTasks(personalTasks || []);
    } catch (err) {
      logger.error('Error in fetchTasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const newStatus = completed ? 'done' : 'todo';
      
      const { error } = await supabase
        .from('fast_tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) {
        logger.error('Error updating task:', error);
        return;
      }

      // Update local state immediately for responsive UI
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      logger.error('Error toggling task:', error);
    }
  };

  // Simple useEffect with no complex dependencies
  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  // Simplified loading state
  if (loading) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground font-medium">Loading tasks...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg animate-pulse">
              <div className="w-5 h-5 bg-secondary rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-secondary rounded"></div>
                <div className="h-3 bg-secondary rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-destructive font-medium">Error loading tasks</span>
        </div>
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p className="text-sm text-muted-foreground mb-4">Failed to load tasks</p>
          <Button 
            onClick={fetchTasks} 
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
                className="flex items-start gap-3 p-3 bg-background rounded-lg border hover:border-border transition-colors"
              >
                <div className="mt-0.5">
                  <Checkbox 
                    checked={false}
                    onCheckedChange={() => handleToggleTask(task.id, true)}
                    className="hover:border-success transition-colors"
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
                        className="hover:border-border transition-colors"
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