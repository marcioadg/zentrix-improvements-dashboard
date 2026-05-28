import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { toast } from 'sonner';
import { FastTask, TaskFilter, TaskCounts } from './fast-tasks/types';
import { transformDatabaseTask } from './fast-tasks/utils';
import { logger } from '@/utils/logger';
import { 
  createTask, 
  updateTask, 
  archiveTask,
  deleteTask,
  clearCompletedTasks 
} from './fast-tasks/operations';

export type { FastTask, TaskFilter };

// Performance marker for dev-only tracking
const perfMark = (label: string) => {
  if (process.env.NODE_ENV === 'development') {
    performance.mark(`useTasksSlim-${label}`);
  }
};

export const useTasksSlim = (activeMeetingId?: string | null) => {
  const [tasks, setTasks] = useState<FastTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const userId = user?.id;

  // Single optimized query for all tasks
  const loadTasks = useCallback(async () => {
    if (!userId || !currentCompany?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    perfMark('start-load');
    setLoading(true);

    try {
      // Single query to get both personal and team tasks for current company
      // Personal tasks: user owns them
      // Team tasks: user is assigned to them OR user is a team member
      const { data: tasksData, error } = await supabase
        .from('fast_tasks')
        .select(`
          id, title, description, status, due_date, created_at, updated_at, 
          task_type, team_id, team_name, assigned_to, user_id, 
          is_archived, archived_at, company_id
        `)
        .eq('company_id', currentCompany?.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Client-side filtering to match original logic
      const filteredTasks = (tasksData || []).filter(task => {
        // Personal tasks: user must own them
        if (task.task_type === 'personal') {
          return task.user_id === userId;
        }
        
        // Team tasks: user must be assigned OR be a team member
        // Note: RLS policies will enforce proper access control
        if (task.task_type === 'team') {
          // If user is assigned, include the task
          if (task.assigned_to && task.assigned_to.includes(userId)) {
            return true;
          }
          // RLS will filter out team tasks where user isn't a team member
          return true;
        }
        
        return false;
      });

      // Transform tasks without avatar enrichment for speed
      const transformedTasks = filteredTasks.map(transformDatabaseTask);
      
      setTasks(transformedTasks);
      setError(null);
      
      perfMark('end-load');
      if (process.env.NODE_ENV === 'development') {
        const measure = performance.measure('useTasksSlim-load', 'useTasksSlim-start-load', 'useTasksSlim-end-load');
        logger.log(`⚡ useTasksSlim: Loaded ${transformedTasks.length} tasks in ${measure.duration.toFixed(1)}ms`);
      }
    } catch (err) {
      logger.error('❌ useTasksSlim: Error loading tasks:', err);
      setError('Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [userId, currentCompany?.id]);

  // Load tasks on mount and when dependencies change
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Simplified real-time subscription with client-side filtering
  useEffect(() => {
    if (!userId || !currentCompany?.id) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel(`tasks_slim_${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fast_tasks',
          filter: `company_id=eq.${currentCompany?.id}`
        },
        (payload) => {
          // Debounce updates to avoid excessive reloads
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            // Skip reload if we're actively creating and it's our insert
            if (isCreating && payload.eventType === 'INSERT') return;
            loadTasks();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, currentCompany?.id, isCreating, loadTasks]);

  // Reuse existing mutation operations
  const addTask = useCallback(async (
    title: string, 
    description: string = '', 
    dueDate?: string,
    taskType: 'personal' | 'team' = 'personal',
    teamId?: string,
    teamName?: string,
    assignedTo?: string | string[],
    status: 'todo' | 'in-progress' | 'done' = 'todo'
  ) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    setIsCreating(true);
    try {
      await createTask(userId, title, description, dueDate, taskType, teamId, teamName, assignedTo, status);
      await loadTasks(); // Reload to get fresh data
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, [userId, loadTasks]);

  const updateTaskHandler = useCallback(async (id: string, updates: Partial<FastTask>) => {
    // Optimistic update
    const originalTask = tasks.find(task => task.id === id);
    if (!originalTask) throw new Error('Task not found');

    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
    
    try {
      await updateTask(id, updates);
      setError(null);
    } catch (err) {
      // Rollback on error
      setTasks(prev => prev.map(task => 
        task.id === id ? originalTask : task
      ));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  }, [tasks]);

  const archiveTaskHandler = useCallback(async (id: string) => {
    try {
      await archiveTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      setError(null);
    } catch (err) {
      const errorMessage = 'Failed to archive task';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, []);

  const deleteTaskHandler = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(task => task.id !== id));
      setError(null);
      toast.success('Task deleted permanently');
    } catch (err) {
      setError('Failed to delete task');
      toast.error('Failed to delete task');
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      toast.error('Task not found');
      return;
    }

    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTaskHandler(id, { status: newStatus });
  }, [tasks, updateTaskHandler]);

  const clearCompleted = useCallback(async () => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      const result = await clearCompletedTasks(userId);
      
      // Remove only the actually archived tasks from local state
      const archivedIds = result.taskIds || [];
      setTasks(prev => prev.filter(task => !archivedIds.includes(task.id)));
      
      logger.log('🔍 useTasksSlim: Removed', archivedIds.length, 'tasks from local state, IDs:', archivedIds);
      setError(null);
      
      // Show toast with undo action
      toast.success(`${result.count} completed task${result.count === 1 ? '' : 's'} archived`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const { undoArchiveTasks } = await import('@/hooks/fast-tasks/operations');
              await undoArchiveTasks(result.taskIds);
              
              // Re-fetch tasks to show unarchived tasks
              await loadTasks();
              
              toast.success('Tasks restored');
            } catch (error) {
              logger.error('Error undoing archive:', error);
              toast.error('Failed to restore tasks');
            }
          }
        },
        duration: 10000 // Give user more time to undo
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive completed tasks';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }, [userId]);

  // Filter and search tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply task type filter
    const isInMeeting = !!activeMeetingId;
    if (filter === 'personal') {
      filtered = isInMeeting 
        ? filtered.filter(task => task.taskType === 'personal')
        : filtered.filter(task => task.taskType === 'personal' && task.status !== 'done');
    } else if (filter === 'team') {
      filtered = isInMeeting
        ? filtered.filter(task => task.taskType === 'team')
        : filtered.filter(task => task.taskType === 'team' && task.status !== 'done');
    } else if (filter === 'active') {
      filtered = filtered.filter(task => task.status !== 'done');
    } else if (filter === 'completed') {
      filtered = filtered.filter(task => task.status === 'done');
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search) ||
        task.description.toLowerCase().includes(search) ||
        task.teamName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [tasks, filter, searchTerm, activeMeetingId]);

  // Task counts
  const taskCounts: TaskCounts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(task => task.status !== 'done').length,
    completed: tasks.filter(task => task.status === 'done').length,
    personal: tasks.filter(task => task.taskType === 'personal' && task.status !== 'done').length,
    team: tasks.filter(task => task.taskType === 'team' && task.status !== 'done').length,
  }), [tasks]);

  return {
    tasks: filteredTasks,
    filter,
    setFilter,
    taskCounts,
    addTask,
    updateTask: updateTaskHandler,
    deleteTask: deleteTaskHandler,
    archiveTask: archiveTaskHandler,
    toggleTask,
    clearCompleted,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    isCreating,
    subscriptionReady: true, // Simplified
    canCreateTasks: !!userId,
    // Stub archiving features for compatibility
    archivingTasks: new Set<string>(),
    pendingArchives: [],
    undoArchive: async () => Promise.resolve(),
  };
};