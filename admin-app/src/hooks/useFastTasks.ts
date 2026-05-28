import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { FastTask, TaskFilter, TaskCounts } from './fast-tasks/types';
import { filterTasksByCompany, createOptimisticTask } from './fast-tasks/utils';
import { useFastTasksCache } from './fast-tasks/cache';
import { useOptimisticFastTaskArchiving } from './fast-tasks/useOptimisticFastTaskArchiving';
import { isWithinMeetingCycle } from '@/utils/meetingCycleUtils';
import { 
  loadTeamInfo, 
  loadAllTasks, 
  validateTeamAccess, 
  createTask, 
  updateTask, 
  deleteTask,
  archiveTask,
  clearCompletedTasks,
  clearCompletedTasksWithPermissions 
} from './fast-tasks/operations';

export type { FastTask, TaskFilter };

// PHASE 4: Request coalescing to prevent duplicate queries
const inflightRequests = new Map<string, Promise<void>>();

export const useFastTasks = (
  activeMeetingId?: string | null, 
  meetingTeamId?: string, 
  showArchived: boolean = false,
  onUndoSuccess?: (taskId: string, task: any) => void
) => {
  const [tasks, setTasks] = useState<FastTask[]>([]);
  const [filter, setFilter] = useState<TaskFilter>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  
  // BROADCAST SYNC: Remote status updates from other users (same pattern as meetings)
  // Now uses full status string to support 3 states: todo, in-progress, done
  const [remoteUpdates, setRemoteUpdates] = useState<Record<string, { status: 'todo' | 'in-progress' | 'done' }>>({});
  
  const cache = useFastTasksCache();
  const { profile } = useProfile();
  const { currentCompany } = useMultiCompany();
  const { isVisible: isPageVisible, shouldRefetchOnVisibility } = usePageVisibility();
  const previousVisibleRef = useRef(isPageVisible);
  const { isTransitioning } = useNavigationTransition();
  const userId = profile?.id;
  const emptyFetchRetried = useRef(false);

  // Add optimistic archiving with undo callback
  const {
    archiveTaskOptimistically,
    archivingTasks,
    undoArchive
  } = useOptimisticFastTaskArchiving(tasks, setTasks, onUndoSuccess);

  // BROADCAST SYNC: Apply remote status change from broadcast (now accepts full status)
  const applyRemoteStatusUpdate = useCallback((taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    logger.log('📡 [useFastTasks] Applying remote status update:', { taskId, status });
    setRemoteUpdates(prev => ({
      ...prev,
      [taskId]: { status }
    }));
  }, []);

  // BROADCAST SYNC: Clear remote status before local update (prevents race conditions)
  const clearRemoteStatusUpdate = useCallback((taskId: string) => {
    logger.log('📡 [useFastTasks] Clearing remote status for local update:', taskId);
    setRemoteUpdates(prev => {
      const { [taskId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Debug logging removed to prevent infinite loops

  // Clear recently created IDs after some time
  useEffect(() => {
    const cleanup = setInterval(() => {
      cache.clearRecentlyCreated();
    }, 10000);
    return () => clearInterval(cleanup);
  }, []);

  // Clear tasks when company changes and force reload immediately
  useEffect(() => {
    cache.clearCache();
    setTasks([]);
    emptyFetchRetried.current = false;
    // Force reload without relying on visibility
    loadTasks(false, showArchived);
  }, [currentCompany?.id, showArchived]);

  // PHASE 4: Enhanced load function with request coalescing
  const loadTasks = async (useCache = true, archivedOverride?: boolean, silent = false) => {
    const shouldShowArchived = archivedOverride !== undefined ? archivedOverride : showArchived;
    if (!userId) {
      return;
    }

    // PHASE 4: Check if identical request is already in-flight
    const requestKey = `${userId}-${shouldShowArchived}-${meetingTeamId || 'all'}-${currentCompany?.id}`;
    const existingRequest = inflightRequests.get(requestKey);
    
    if (existingRequest) {
      logger.debug('loadTasks: Coalescing duplicate request');
      return existingRequest;
    }

    // OPTIMIZATION: Skip cache during meetings for real-time data
    const shouldUseCache = useCache && !shouldShowArchived && !meetingTeamId;
    
    // Use cache if available and recent (only for non-archived loads and non-meeting contexts)
    if (shouldUseCache && cache.isCacheValid()) {
      const filteredTasks = filterTasksByCompany(cache.getTasks(), cache.getTeams(), currentCompany?.id);
      setTasks(filteredTasks);
      setLoading(false);
      return;
    }
    
    // Create new request promise
    const requestPromise = (async () => {
      try {
        if (!silent) setLoading(true);
        
        // OPTIMIZATION: Pass meeting team ID for optimized query
        const meetingOptimization = meetingTeamId ? { teamId: meetingTeamId } : undefined;
        
        // Load team information and tasks in parallel
        const [teamInfo, allTasks] = await Promise.all([
          loadTeamInfo(userId),
          loadAllTasks(userId, shouldShowArchived, meetingOptimization)
        ]);
        
        logger.info('loadTasks: Query optimization applied', {
          meetingOptimization: !!meetingOptimization,
          taskCount: allTasks.length,
          coalesced: inflightRequests.size > 1
        });
        
        // Update cache (only for non-archived loads)
        if (!shouldShowArchived) {
          cache.updateCache(allTasks, teamInfo);
        }
        
        // Filter tasks efficiently
        const filteredTasks = filterTasksByCompany(allTasks, teamInfo, currentCompany?.id);
        
        setTasks(filteredTasks);
        setError(null);
      } catch (err) {
        setError('Failed to load tasks');
        toast.error('Failed to load tasks');
      } finally {
        setLoading(false);
        // PHASE 4: Clear request from in-flight map
        inflightRequests.delete(requestKey);
      }
    })();
    
    // PHASE 4: Store request in map
    inflightRequests.set(requestKey, requestPromise);
    
    return requestPromise;
  };

  // Enhanced load deduplication to prevent multiple simultaneous calls
  const loadingRef = useRef(false);
  const pendingLoadRef = useRef<Promise<void> | null>(null);
  
  // Get leaving meeting state to suppress loads during transition
  const leavingMeetingRef = useRef(false);
  
  // Update ref when context changes (avoids adding to useEffect deps)
  useEffect(() => {
    // Import dynamically to avoid circular dependency issues
    import('@/contexts/OptimisticMeetingEndContext').then(({ useOptimisticMeetingEnd }) => {
      // This is just for the ref update, actual check happens in the load effect
    }).catch(() => {
      // Context not available, that's ok
    });
  }, []);
  
  useEffect(() => {
    // Skip if already loading, during transitions, or leaving a meeting
    if (loadingRef.current || pendingLoadRef.current || isTransitioning) {
      logger.log('🚫 useFastTasks: Skipping loadTasks - already loading or transitioning');
      return;
    }
    
    // Only load when we have essential dependencies
    if (!userId || !currentCompany?.id) {
      return;
    }
    
    loadingRef.current = true;
    
    let timeoutId: NodeJS.Timeout;
    const loadPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        loadTasks(false).finally(() => {
          loadingRef.current = false;
          pendingLoadRef.current = null;
          resolve();
        });
      }, 100); // Minimal delay to allow UI to settle
    });
    
    // Store cleanup after promise is created
    (loadPromise as any).cleanup = () => {
      clearTimeout(timeoutId);
      loadingRef.current = false;
      pendingLoadRef.current = null;
    };
    
    pendingLoadRef.current = loadPromise;
    
    return () => {
      if ((loadPromise as any).cleanup) {
        (loadPromise as any).cleanup();
      }
    };
  }, [userId, currentCompany?.id, isTransitioning, showArchived]);

  // Listen for task creation events from other parts of the app
  useEffect(() => {
    const handleTaskCreated = (event: CustomEvent) => {
      // Import the meeting end state context to check for active operations
      import('@/contexts/MeetingEndStateContext').then(({ useMeetingEndState }) => {
        // Don't reload during meeting operations to maintain optimistic state
        logger.log('🔄 useFastTasks: Task creation event received');
        
        // Use batched cache invalidation to prevent cascades
        import('@/hooks/meeting/useBatchedCacheManager').then(({ useBatchedCacheManager }) => {
          // Force refresh the task list when a task is created elsewhere
          cache.clearCache();
          loadTasks(false); // Force reload without cache
        });
      });
    };

    window.addEventListener('taskCreated', handleTaskCreated as EventListener);
    
    return () => {
      window.removeEventListener('taskCreated', handleTaskCreated as EventListener);
    };
  }, []);

  // Integrated subscription using unified manager to prevent conflicts
  useEffect(() => {
    if (!userId) {
      logger.log('🚫 useFastTasks: Skipping subscription setup', { userId: !!userId });
      return;
    }

    // On visibility change from hidden to visible - check staleness
    if (isPageVisible && !previousVisibleRef.current) {
      if (shouldRefetchOnVisibility()) {
        logger.log('🔄 useFastTasks: Page visible after extended absence, silent reloading');
        loadTasks(false, undefined, true);
      } else {
        logger.log('✅ useFastTasks: Page visible but data still fresh, skipping reload');
      }
    }
    
    previousVisibleRef.current = isPageVisible;

    // Defer to unified subscription manager - no fallback subscription needed
    logger.log('✅ useFastTasks: Delegating subscription to unified manager');
    setSubscriptionReady(true);
    
    // Remove fallback subscription completely to prevent competition
    return () => {
      setSubscriptionReady(false);
    };
  }, [userId, currentCompany?.id, isCreating, isPageVisible, isTransitioning]);

  // Enhanced add task function with company validation
  const addTask = async (
    title: string,
    description: string = '',
    dueDate?: string,
    taskType: 'personal' | 'team' = 'personal',
    teamId?: string,
    teamName?: string,
    assignedTo?: string | string[],
    status: 'todo' | 'in-progress' | 'done' = 'todo',
    splitPerMember: boolean = false
  ): Promise<FastTask | undefined> => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    // Validate team access for team tasks
    if (taskType === 'team' && teamId) {
      const hasAccess = await validateTeamAccess(teamId, userId, currentCompany?.id);
      if (!hasAccess) {
        toast.error('You do not have access to this team');
        return;
      }
    }

    // Adding task optimistically
    setIsCreating(true);

    // Optimistic task for immediate UI feedback - now includes userId and companyId
    const optimisticTask = createOptimisticTask(
      title, description, dueDate, taskType, teamId, teamName, assignedTo, status, userId, currentCompany?.id
    );

    // Add optimistic task immediately
    setTasks(prev => [optimisticTask, ...prev]);

    try {
      const newTask = await createTask(
        userId, title, description, dueDate, taskType, teamId, teamName, assignedTo, status,
        currentCompany?.id,
        splitPerMember
      );

      // Task created successfully
      
      // Track to prevent unnecessary reloads
      cache.addRecentlyCreatedId(newTask.id);
      
      // Replace optimistic task with real data
      setTasks(prev => prev.map(task => 
        task.id === optimisticTask.id ? newTask : task
      ));
      
      // Invalidate cache
      cache.clearCache();
      
      
      setError(null);
      
      // Return the created task so callers can use it
      return newTask;
    } catch (err) {
      // Error adding task
      
      // Remove optimistic task on error
      setTasks(prev => prev.filter(task => task.id !== optimisticTask.id));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
      setError(errorMessage);
      toast.error(errorMessage);
      return undefined;
    } finally {
      setIsCreating(false);
    }
  };

  // Enhanced toggle task function with better error handling
  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) {
      toast.error('Task not found');
      return;
    }

    const newStatus = task.status === 'done' ? 'todo' : 'done';

    // Enhanced permission check for task toggles
    const hasPermission = 
      task.taskType === 'personal' ? task.userId === userId :
      task.taskType === 'team' ? (
        // Allow toggle if user is assigned to the task or is a team member
        task.assignedTo?.includes(userId) || 
        // Check if user is a team member (will be validated by RLS)
        task.teamId !== null
      ) : false;

    if (!hasPermission) {
      toast.error(
        task.taskType === 'personal' 
          ? 'You can only toggle your own personal tasks'
          : 'You can only toggle tasks assigned to you or your team'
      );
      return;
    }

    try {
      await updateTaskHandler(id, { status: newStatus });
    } catch (error) {
      
      // Show more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('row-level security')) {
          toast.error('Permission denied: You cannot modify this task');
        } else if (error.message.includes('network')) {
          toast.error('Network error: Please check your connection and try again');
        } else {
          toast.error(`Failed to update task: ${error.message}`);
        }
      } else {
        toast.error('Failed to update task. Please try again.');
      }
      
      throw error; // Re-throw so the UI can handle it
    }
  };

  // Enhanced update task function with better error reporting
  const updateTaskHandler = async (id: string, updates: Partial<FastTask>) => {
    // Store original task for potential rollback
    const originalTask = tasks.find(task => task.id === id);
    if (!originalTask) {
      throw new Error('Task not found');
    }

    // Apply optimistic update immediately
    setTasks(prev => prev.map(task => 
      task.id === id 
        ? { ...task, ...updates, updatedAt: new Date().toISOString() }
        : task
    ));
    
    try {
      await updateTask(id, updates);
      
      // Invalidate cache for future loads
      cache.clearCache();
      
      setError(null);
    } catch (err) {
      
      // Rollback optimistic update on error
      setTasks(prev => prev.map(task => 
        task.id === id ? originalTask : task
      ));
      
      // Set more specific error messages
      let errorMessage = 'Failed to update task';
      if (err instanceof Error) {
        if (err.message.includes('row-level security')) {
          errorMessage = 'Permission denied: You cannot modify this task';
        } else if (err.message.includes('cannot create team tasks')) {
          errorMessage = 'You cannot create team tasks in companies you do not have access to';
        } else {
          errorMessage = `Update failed: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Replace deleteTaskHandler with archiveTaskHandler
  const archiveTaskHandler = async (id: string) => {
    return await archiveTaskOptimistically(id);
  };

  // Keep original delete for permanent deletion if needed
  const deleteTaskHandler = async (id: string) => {
    try {
      await deleteTask(id);
      
      // Invalidate cache
      cache.clearCache();
      
      setError(null);
      toast.success('Task deleted permanently');
    } catch (err) {
      setError('Failed to delete task');
      toast.error('Failed to delete task');
    }
  };

  // STEP 4: Enhance clearCompleted to accept permission parameters
  const clearCompleted = async (options?: {
    onlyMyTasks?: boolean;
    permissionLevel?: string;
  }) => {
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    try {
      // STEP 4: Use new permission-based function if options provided, otherwise use original
      const result = options 
        ? await clearCompletedTasksWithPermissions(userId, options)
        : await clearCompletedTasks(userId);
      
      logger.log('🔍 useFastTasks clearCompleted: Using', options ? 'permission-based' : 'original', 'function, result:', result);
      
      // Remove only the actually archived tasks from local state
      const archivedIds = result.taskIds || [];
      setTasks(prev => prev.filter(task => !archivedIds.includes(task.id)));
      
      logger.log('🔍 useFastTasks: Removed', archivedIds.length, 'tasks from local state, IDs:', archivedIds);
      
      // Invalidate cache
      cache.clearCache();
      
      setError(null);
      
      // Show toast with undo action
      toast.success(`${result.count} completed task${result.count === 1 ? '' : 's'} archived`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const { undoArchiveTasks } = await import('@/hooks/fast-tasks/operations');
              await undoArchiveTasks(result.taskIds);
              
              // Refresh tasks to show unarchived tasks
              await loadTasks(false);
              
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
  };

  // Filter and search tasks - with broadcast remote updates overlay
  const filteredTasks = useMemo(() => {
    // BROADCAST SYNC: Apply remote updates as overlay during render
    // Now uses full status string to correctly handle all 3 states
    let filtered = tasks.map(task => {
      const remoteUpdate = remoteUpdates[task.id];
      if (remoteUpdate) {
        // Apply remote status change directly (no boolean conversion)
        const newStatus = remoteUpdate.status;
        if (task.status !== newStatus) {
          logger.log('📡 [useFastTasks] Overlaying remote status:', { taskId: task.id, from: task.status, to: newStatus });
          return { ...task, status: newStatus };
        }
      }
      return task;
    });

    // Apply task type filter - but during meetings, show completed tasks too
    const isInMeeting = !!activeMeetingId;
    
    logger.log('🔄 useFastTasks: Re-filtering tasks', { 
      activeMeetingId, 
      isInMeeting, 
      filter, 
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'done').length,
      remoteUpdatesCount: Object.keys(remoteUpdates).length
    });
    
    if (filter === 'personal') {
      if (isInMeeting) {
        // During meetings: show both active and completed personal tasks
        filtered = filtered.filter(task => task.taskType === 'personal');
      } else {
        // Normal mode: hide completed personal tasks
        filtered = filtered.filter(task => task.taskType === 'personal' && task.status !== 'done');
      }
    } else if (filter === 'team') {
      if (isInMeeting) {
        // During meetings: show active team tasks + completed tasks only from current/previous cycle
        filtered = filtered.filter(task => {
          if (task.taskType !== 'team') return false;
          // Non-completed tasks always shown
          if (task.status !== 'done') return true;
          // Completed tasks: only show if within meeting cycle (current + previous week)
          return isWithinMeetingCycle(task.createdAt);
        });
      } else {
        // Normal mode: hide completed team tasks
        filtered = filtered.filter(task => task.taskType === 'team' && task.status !== 'done');
      }
    } else if (filter === 'active') {
      // Active shows all non-completed tasks (personal + all team tasks)
      // Let the "showOnlyMyTasks" toggle handle the final filtering
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

    // Remove isOptimistic flag from returned tasks
    return filtered.map(({ isOptimistic, ...task }) => task as FastTask);
  }, [tasks, filter, searchTerm, activeMeetingId, remoteUpdates]); // Added remoteUpdates to dependencies

  // Task counts - updated to reflect new "active" = personal tasks logic
  const taskCounts: TaskCounts = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(task => task.status !== 'done').length, // All non-completed tasks
    completed: tasks.filter(task => task.status === 'done').length,
    personal: tasks.filter(task => task.taskType === 'personal' && task.status !== 'done').length,
    team: tasks.filter(task => task.taskType === 'team' && task.status !== 'done').length, // Only show non-completed team tasks
  }), [tasks, userId]);

  // Convert archiving tasks to pending archives format
  const pendingArchives = Array.from(archivingTasks).map(taskId => {
    const task = tasks.find(t => t.id === taskId);
    return {
      taskId,
      title: task?.title || 'Unknown Task',
      timeLeft: 5 // Default timeout
    };
  });

  // Create a wrapper for undoArchive that only takes taskId
  const undoArchiveWrapper = async (taskId: string) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (originalTask && undoArchive) {
      return await undoArchive(taskId, originalTask);
    }
    return Promise.resolve();
  };

  return {
    tasks: filteredTasks,
    allTasks: tasks, // Raw unfiltered tasks for pages that do their own status filtering (e.g., MobileTasksPage)
    filter,
    setFilter,
    taskCounts,
    addTask,
    updateTask: updateTaskHandler,
    deleteTask: deleteTaskHandler,
    archiveTask: archiveTaskHandler, // New archive function
    toggleTask,
    clearCompleted,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    isCreating,
    subscriptionReady,
    canCreateTasks: !!userId && subscriptionReady,
    // Archiving state
    archivingTasks,
    pendingArchives,
    undoArchive: undoArchiveWrapper, // Use wrapper that matches expected signature
    // BROADCAST SYNC: Functions for real-time status sync
    applyRemoteStatusUpdate,
    clearRemoteStatusUpdate,
    // Refetch function for pull-to-refresh
    refetch: () => loadTasks(false),
  };
};
