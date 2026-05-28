import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { OptimizedFastTaskList } from '@/components/tasks/OptimizedFastTaskList';
import { DraggableTaskList } from '@/components/tasks/DraggableTaskList';
import { EnhancedQuickAddTask } from '@/components/tasks/EnhancedQuickAddTask';
import { EnhancedTaskFilters } from '@/components/tasks/EnhancedTaskFilters';
import { EditTaskModal } from '@/components/modals/EditTaskModal';
import { useFastTasks, FastTask, TaskFilter } from '@/hooks/useFastTasks';
import { useProfile } from '@/hooks/useProfile';
import { useCurrentUserPermissionLevel } from '@/hooks/useUserPermissionLevel';
import { useRequestDeduplication } from '@/hooks/useRequestDeduplication';
import { useTaskSearch } from '@/hooks/useTaskSearch';
import { useUserTeams } from '@/hooks/useUserTeams';
import { filterGeneralTeam } from '@/utils/teamFilters';
import { CheckSquare, AlertCircle, User, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { celebrate } from '@/lib/celebration';
import { TasksSkeleton } from '@/components/tasks/TasksSkeleton';
import { logger } from '@/utils/logger';
import { useLocation } from 'react-router-dom';

export default function Tasks2() {
  const location = useLocation();
  const openAddTask = !!(location.state as { openAddTask?: boolean } | null)?.openAddTask;
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [editingTask, setEditingTask] = useState<FastTask | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all' | 'personal'>('all');
  
  // Get user teams
  const { teams: rawTeams } = useUserTeams();
  const teams = useMemo(() => filterGeneralTeam(rawTeams), [rawTeams]);
  
  // Add permission level for Step 3
  const { permissionLevel } = useCurrentUserPermissionLevel();
  logger.log('🔍 Tasks2: User permission level:', permissionLevel);
  
  const {
    profile
  } = useProfile();
  const {
    deduplicate
  } = useRequestDeduplication({
    ttl: 10000,
    maxSize: 100
  });
  // Track the active tab filter — filtering is done entirely in this component
  const [desiredFilter, setDesiredFilter] = useState<TaskFilter>('active');

  const {
    allTasks: tasks,
    filter,
    setFilter,
    taskCounts,
    addTask,
    updateTask,
    deleteTask,
    archiveTask,
    toggleTask,
    clearCompleted,
    loading,
    error,
    isCreating,
    subscriptionReady,
    canCreateTasks,
    pendingArchives,
    undoArchive
  } = useFastTasks(undefined, undefined, showArchived);

  // Wrapper for toggleTask to add celebration
  const handleToggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== 'done') {
      // Task is being completed
      celebrate();
    }
    await toggleTask(taskId);
  };

  // STEP 4: Pass permission information to clearCompleted
  const handleClearCompleted = async () => {
    logger.log('🔍 Tasks2: handleClearCompleted called with:', { 
      permissionLevel, 
      showOnlyMyTasks 
    });
    
    // STEP 4: Pass permission information to the enhanced clearCompleted function
    return await clearCompleted({
      onlyMyTasks: showOnlyMyTasks,
      permissionLevel: permissionLevel || 'member'
    });
  };

  // Apply search filtering first to all tasks
  const {
    searchTerm,
    setSearchTerm,
    filteredTasks: searchFilteredTasks,
    hasActiveSearch
  } = useTaskSearch(tasks);

  // Helper function to check if user is assigned to task
  const isAssignedToTask = (task: any, userId: string): boolean => {
    // Check if user is in the assignedTo array (camelCase - this is what the frontend uses)
    if (Array.isArray(task.assignedTo) && task.assignedTo.includes(userId)) {
      return true;
    }
    
    // Fallback: check snake_case field (in case it gets fixed later)
    if (Array.isArray(task.assigned_to) && task.assigned_to.includes(userId)) {
      return true;
    }
    
    return false;
  };

  // Then filter based on tab selection, "show only my tasks" toggle, and selected team
  const finalFilteredTasks = React.useMemo(() => {
    let filtered = searchFilteredTasks;
    
    // Apply tab/status filter (previously done by useFastTasks hook)
    if (desiredFilter === 'personal') {
      filtered = filtered.filter(task => task.taskType === 'personal' && task.status !== 'done');
    } else if (desiredFilter === 'team') {
      filtered = filtered.filter(task => task.taskType === 'team' && task.status !== 'done');
    } else if (desiredFilter === 'active') {
      filtered = filtered.filter(task => task.status !== 'done');
    } else if (desiredFilter === 'completed') {
      filtered = filtered.filter(task => task.status === 'done');
    }
    
    // Apply "show only my tasks" filter — skip if profile hasn't loaded yet to avoid
    // filtering everything out with an empty userId
    if (showOnlyMyTasks && profile?.id) {
      filtered = filtered.filter(task => isAssignedToTask(task, profile.id));
    }
    
    // Apply team-specific filter (works across all status tabs)
    if (selectedTeamId === 'personal') {
      // Show only personal tasks
      filtered = filtered.filter(task => task.taskType === 'personal');
    } else if (selectedTeamId !== 'all') {
      // Show tasks for specific team
      filtered = filtered.filter(task => 
        task.taskType === 'team' && task.teamId === selectedTeamId
      );
    }
    
    return filtered;
  }, [searchFilteredTasks, showOnlyMyTasks, profile?.id, selectedTeamId, desiredFilter]);

  // Calculate task counts based on what would be visible for each tab given current filtering
  const filteredTaskCounts = React.useMemo(() => {
    // Start with ALL tasks (not just search-filtered ones for tab counts)
    // But apply search filter for consistency
    let baseFilteredTasks = searchFilteredTasks;

    // Apply "showOnlyMyTasks" filtering if enabled — skip if profile hasn't loaded yet
    if (showOnlyMyTasks && profile?.id) {
      baseFilteredTasks = searchFilteredTasks.filter(task => {
        return isAssignedToTask(task, profile.id);
      });
    }

    // But for tab counts, we need to look at ALL tasks after search+myTasks filter
    // Use the original tasks list, apply search, then myTasks filter, then count per tab
    let allTasksForCounting = tasks.filter(task => {
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search) || task.teamName?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (showOnlyMyTasks && profile?.id) {
        return isAssignedToTask(task, profile.id);
      }
      return true;
    });

    // Calculate what each tab would show with current filtering
    // Filter by selected team if not 'all'
    if (selectedTeamId === 'personal') {
      allTasksForCounting = allTasksForCounting.filter(task => 
        task.taskType === 'personal'
      );
    } else if (selectedTeamId !== 'all') {
      allTasksForCounting = allTasksForCounting.filter(task => 
        task.taskType === 'team' && task.teamId === selectedTeamId
      );
    }

    return {
      total: allTasksForCounting.length,
      active: allTasksForCounting.filter(task => task.status !== 'done').length,
      completed: allTasksForCounting.filter(task => task.status === 'done').length,
      personal: allTasksForCounting.filter(task => task.taskType === 'personal' && task.status !== 'done').length,
      team: allTasksForCounting.filter(task => task.taskType === 'team' && task.status !== 'done').length
    };
  }, [tasks, searchTerm, showOnlyMyTasks, profile?.id, selectedTeamId]);

  // Calculate per-team task counts for the dropdown
  const teamTaskCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Filter tasks based on current settings (search, myTasks)
    let tasksToCount = tasks.filter(task => {
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search) || task.teamName?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (showOnlyMyTasks && profile?.id) {
        return isAssignedToTask(task, profile.id);
      }
      return true;
    });

    // Count only team tasks (not personal) and only active tasks (not done)
    tasksToCount = tasksToCount.filter(task => task.taskType === 'team' && task.status !== 'done');

    // Count tasks per team
    tasksToCount.forEach(task => {
      if (task.teamId) {
        counts[task.teamId] = (counts[task.teamId] || 0) + 1;
      }
    });

    return counts;
  }, [tasks, searchTerm, showOnlyMyTasks, profile?.id]);

  // Calculate personal task count
  const personalTaskCount = React.useMemo(() => {
    let tasksToCount = tasks.filter(task => {
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (showOnlyMyTasks && profile?.id) {
        return isAssignedToTask(task, profile.id);
      }
      return true;
    });

    return tasksToCount.filter(task => task.taskType === 'personal' && task.status !== 'done').length;
  }, [tasks, searchTerm, showOnlyMyTasks, profile?.id]);

  // Convert FastTask to Task format for EditTaskModal
  const convertFastTaskToTask = (fastTask: FastTask) => {
    return {
      id: fastTask.id,
      title: fastTask.title,
      description: fastTask.description,
      due_date: fastTask.dueDate,
      user_id: fastTask.userId,
      team_id: fastTask.teamId,
      completed: fastTask.status === 'done',
      priority: 'medium' as const,
      created_at: fastTask.createdAt,
      updated_at: fastTask.updatedAt,
      task_type: fastTask.taskType,
      assigned_to: fastTask.assignedTo
    };
  };
  const handleEditTask = (task: FastTask) => {
    setEditingTask(task);
  };
  const handleUpdateTask = async (taskId: string, updates: any) => {
    const requestKey = `update-task-${taskId}`;
    await deduplicate(requestKey, async () => {
      try {
        // Convert updates back to FastTask format based on the task type
        const fastTaskUpdates: Partial<FastTask> = {
          title: updates.title,
          description: updates.description,
          dueDate: updates.due_date,
          // Handle due date properly
          status: updates.completed ? 'done' : updates.status || 'todo',
          teamId: updates.team_id
        };

        // Handle assignment field conversion - preserve filtering compatibility
        if (updates.assigned_to !== undefined) {
          if (updates.assigned_to === null) {
            // For personal tasks, don't set assignedTo (let it remain as is for filtering)
            if (updates.team_id === null) {
              // Personal task - keep assignedTo as is to maintain filtering
              fastTaskUpdates.assignedTo = editingTask?.assignedTo || [profile?.id].filter(Boolean);
            } else {
              fastTaskUpdates.assignedTo = [];
            }
          } else if (Array.isArray(updates.assigned_to)) {
            fastTaskUpdates.assignedTo = updates.assigned_to;
          } else {
            fastTaskUpdates.assignedTo = [updates.assigned_to];
          }
        }

        // Handle user_id updates
        if (updates.user_id !== undefined) {
          fastTaskUpdates.userId = updates.user_id;
        }

        // Handle task type changes
        if (updates.team_id === null) {
          fastTaskUpdates.taskType = 'personal';
          fastTaskUpdates.teamId = undefined;
          fastTaskUpdates.teamName = undefined;
          // For personal tasks, ensure current user remains in assignedTo for filtering
          if (!fastTaskUpdates.assignedTo) {
            fastTaskUpdates.assignedTo = [profile?.id].filter(Boolean);
          }
        } else if (updates.team_id) {
          fastTaskUpdates.taskType = 'team';
          fastTaskUpdates.teamId = updates.team_id;
          // FIXED: Include team name if provided in updates
          if (updates.team_name !== undefined) {
            fastTaskUpdates.teamName = updates.team_name;
          }
        }
        
        // Celebrate when task is completed
        if (fastTaskUpdates.status === 'done') {
          celebrate();
        }
        
        await updateTask(taskId, fastTaskUpdates);
      } catch (error) {
        throw error; // Re-throw to show error in UI
      }
    });
    setEditingTask(null);
  };

  // Handle archive task with optimistic updates
  const handleArchiveTask = async (taskId: string) => {
    try {
      await archiveTask(taskId); // Use the optimistic archive function
    } catch (error) {
      // Error handled by toast in archiveTask
    }
  };
  const handleAddTask = async (title: string, description?: string, dueDate?: string, taskType: 'personal' | 'team' = 'personal', teamId?: string, teamName?: string, assignedTo?: string[], splitPerMember?: boolean) => {
    const finalAssignedTo = assignedTo && assignedTo.length > 0 ? assignedTo : (profile?.id ? [profile.id] : undefined);
    await addTask(title, description || '', dueDate, taskType, teamId, teamName, finalAssignedTo, 'todo', splitPerMember || false);
  };

  // Handle task reordering
  const handleReorderTasks = async (reorderedTasks: FastTask[]) => {
    try {
      // Update each task's order position in the database
      const updatePromises = reorderedTasks.map((task, index) => updateTask(task.id, {
        orderPosition: index
      }));
      await Promise.all(updatePromises);
    } catch (error) {
      toast.error('Failed to reorder tasks');
    }
  };
  
  if (loading) {
    return <TasksSkeleton taskCount={8} showFilters={true} showQuickAdd={true} />;
  }
  return <div className="px-6 py-6 animate-content-in" data-tour="task-section">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Tasks</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage and track your team's work items</p>
      </div>

      {/* Error Alert */}
      {error && <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>}


      {/* Task Filters */}
      <div className="mb-6">
        <EnhancedTaskFilters 
          filter={desiredFilter} 
          onFilterChange={setDesiredFilter} 
          taskCounts={filteredTaskCounts} 
          onClearCompleted={handleClearCompleted}
          showOnlyMyTasks={showOnlyMyTasks} 
          onToggleMyTasks={setShowOnlyMyTasks} 
          showArchived={showArchived} 
          onToggleArchived={setShowArchived}
          teams={teams}
          selectedTeamId={selectedTeamId}
          onTeamSelect={setSelectedTeamId}
          teamTaskCounts={teamTaskCounts}
          personalTaskCount={personalTaskCount}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />
      </div>

      {/* Search Results Info */}
      {hasActiveSearch && <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Found {finalFilteredTasks.length} task{finalFilteredTasks.length !== 1 ? 's' : ''} matching "{searchTerm}"
            {finalFilteredTasks.length === 0 && <span className="ml-2 text-warning">Try different search terms</span>}
          </p>
        </div>}

      {/* Task List Section */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          <DraggableTaskList
            tasks={finalFilteredTasks}
            onToggleTask={handleToggleTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onArchiveTask={handleArchiveTask}
            onEditTask={handleEditTask}
            pendingArchives={pendingArchives}
            onUndoArchive={undoArchive}
            onReorderTasks={handleReorderTasks}
            onAddTask={handleAddTask}
            isCreating={isCreating}
            canCreateTasks={canCreateTasks}
            currentUserId={profile?.id}
            defaultTeamId={selectedTeamId !== 'all' && selectedTeamId !== 'personal' ? selectedTeamId : undefined}
            autoExpandAddTask={openAddTask}
          />
        </CardContent>
      </Card>

      {/* Edit Task Modal */}
      {editingTask && <EditTaskModal open={!!editingTask} onOpenChange={open => !open && setEditingTask(null)} task={convertFastTaskToTask(editingTask)} onUpdate={handleUpdateTask} />}
    </div>;
}