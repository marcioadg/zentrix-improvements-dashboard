/**
 * MobileTasksPage - Mobile-only Tasks page (/m/tasks)
 * 
 * Uses mobile-specific components exclusively:
 * - MobileMeetingModalsManager instead of desktop MeetingModalsManager
 * - MobileAddTaskModal for adding tasks
 * - MobileEditFastTaskModal for editing
 */
import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { CheckSquare, Users, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { useFastTasks, type FastTask } from '@/hooks/useFastTasks';
import MobileBottomNav from '@/components/MobileBottomNav';

import { useUserTeams } from '@/hooks/useUserTeams';
import { useMeetingModalsState } from '@/hooks/useMeetingModalsState';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksPageStatusBroadcast } from '@/hooks/tasks/useTasksPageStatusBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { MobileTasksTabs } from './mobile/MobileTasksTabs';
import { MobileTasksTabContent } from './mobile/MobileTasksTabContent';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { celebrate } from '@/lib/celebration';
import { MobileTasksListSkeleton } from '@/components/mobile/MobileSkeletons';
import { MeetingEndIndicator } from './MeetingEndIndicator';
import { useMobileDataPreloader } from '@/hooks/mobile/useMobileDataPreloader';
import { DesktopRecommendedDialog } from '@/components/mobile/DesktopRecommendedDialog';
import { MobileUnifiedFAB, MobilePageHeader } from '@/components/mobile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useHeadlines } from '@/hooks/useHeadlines';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// Lazy load modals for better initial load performance - Step 4
// AddTaskModal lazy import removed - using MobileMeetingModalsManager's MobileAddTaskModal instead

export const MobileTasksPage = () => {
  const location = useLocation();
  
  // Performance tracking for dev
  const perfStart = process.env.NODE_ENV === 'development' ? performance.now() : 0;
  
  // Add archived toggle state
  const [showArchived, setShowArchived] = useState(false);
  
  // My tasks only toggle - load from database
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [myTasksOnlyLoaded, setMyTasksOnlyLoaded] = useState(false);
  
  // Get company ID for broadcast channel
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();
  
  // Use single stable hook to prevent competing data loading
  const tasksHook = useFastTasks(undefined, undefined, showArchived);
  
  const {
    allTasks: tasks, // Use raw unfiltered tasks - MobileTasksPage does its own status filtering
    taskCounts,
    loading,
    addTask,
    archiveTask,
    updateTask: updateTaskHandler,
    applyRemoteStatusUpdate,
    clearRemoteStatusUpdate,
    refetch,
  } = tasksHook;

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    disabled: loading,
  });

  // Preload adjacent mobile pages for instant navigation
  const { preloadAdjacent } = useMobileDataPreloader();
  useEffect(() => {
    preloadAdjacent('tasks');
  }, [preloadAdjacent]);

  // BROADCAST SYNC: Initialize broadcast channel for real-time task status sync
  const { publishStatusChange } = useTasksPageStatusBroadcast(
    currentCompany?.id || null,
    applyRemoteStatusUpdate
  );

  // Navigation and meeting end state contexts
  const { isTransitioning, endTransition } = useNavigationTransition();
  const { isInProtectionPeriod, endMeetingEnd, hasActiveOperations } = useMeetingEndState();

  // Enhanced protection system that waits for ALL background operations to complete
  React.useEffect(() => {
    const checkAndEndProtection = () => {
      const hasOperations = hasActiveOperations();
      const inProtectionPeriod = isInProtectionPeriod();
      
      if (!loading && tasks.length >= 0) {
        if (!isTransitioning && !inProtectionPeriod && !hasOperations) {
          logger.log('✅ MobileTasksPage: All systems ready - ending protection');
          endTransition();
          endMeetingEnd();
          return true; // Protection ended
        } else {
          logger.log('⏳ MobileTasksPage: Waiting for completion', {
            isTransitioning,
            inProtectionPeriod,
            hasOperations,
            loading,
            tasksCount: tasks.length
          });
          return false; // Still waiting
        }
      }
      return false;
    };

    // Initial check
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;

    const timer = setTimeout(() => {
      if (!checkAndEndProtection()) {
        // If initial check fails, set up polling for active operations
        pollInterval = setInterval(() => {
          if (checkAndEndProtection()) {
            clearInterval(pollInterval);
            clearTimeout(safetyTimeout);
          }
        }, 500); // Poll every 500ms

        // Safety timeout after 15 seconds
        safetyTimeout = setTimeout(() => {
          clearInterval(pollInterval);
          logger.log('⚠️ MobileTasksPage: Safety timeout - forcing protection end');
          endTransition();
          endMeetingEnd();
        }, 15000);
      }
    }, 3000); // Initial delay increased to 3 seconds for leave operations

    return () => {
      clearTimeout(timer);
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
    };
  }, [loading, tasks.length, isTransitioning, isInProtectionPeriod, endTransition, endMeetingEnd, hasActiveOperations]);

  const { teams } = useUserTeams();
  const [selectedTeamId, setSelectedTeamId] = useState<string | 'all' | 'personal'>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [preferredTeamLoaded, setPreferredTeamLoaded] = useState(false);
  
  // Load preferred team and myTasksOnly from user_settings on mount
  useEffect(() => {
    if (!user?.id || preferredTeamLoaded) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferred_tasks_team_id, mobile_tasks_my_only')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.preferred_tasks_team_id) {
            setSelectedTeamId(data.preferred_tasks_team_id);
          }
          if (data.mobile_tasks_my_only !== null) {
            setMyTasksOnly(data.mobile_tasks_my_only);
          }
        }
        setPreferredTeamLoaded(true);
        setMyTasksOnlyLoaded(true);
      } catch (err) {
        logger.error('Failed to load task preferences:', err);
        setPreferredTeamLoaded(true);
        setMyTasksOnlyLoaded(true);
      }
    };

    loadPreferences();
  }, [user?.id, preferredTeamLoaded]);

  // Handle team change with persistence
  const handleTeamChange = useCallback(async (teamId: string | 'all' | 'personal') => {
    setSelectedTeamId(teamId);
    setDropdownOpen(false);

    // Persist to database in background
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            preferred_tasks_team_id: teamId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (err) {
        logger.error('Failed to persist preferred tasks team:', err);
      }
    }
  }, [user?.id]);
  
  // Modal state management
  const modalState = useMeetingModalsState();

  // Headline hook for FAB headline creation
  const effectiveTeamId = selectedTeamId !== 'personal' && selectedTeamId !== 'all' ? selectedTeamId : undefined;
  const { addHeadline } = useHeadlines(effectiveTeamId);
  const { addMetric, refetch: refetchMetrics } = useWeeklyMetrics(effectiveTeamId || '', 'last_3_weeks');
  const { toast } = useToast();

  const handleAddHeadline = useCallback(async (
    title: string,
    content: string,
    teamId?: string,
    meetingId?: string,
    ownerId?: string,
    targetMeetingType?: 'weekly' | 'quarterly'
  ) => {
    try {
      await addHeadline(title, content, teamId, meetingId, targetMeetingType);
    } catch (error) {
      logger.error('Error adding headline:', error);
    }
  }, [addHeadline]);

  // Handler for adding metrics via FAB
  const handleAddMetric = useCallback(async (metricData: {
    metric_name: string;
    unit: string;
    target_value?: number;
    target_logic?: string;
    owner_id: string;
    team_id?: string;
    is_formula?: boolean;
    formula_components?: any[];
    aggregation_type?: string;
  }) => {
    try {
      await addMetric(metricData);
      toast({ title: "Metric Added", description: `${metricData.metric_name} has been added.` });
      await refetchMetrics(true);
    } catch (error) {
      logger.error('Error adding metric:', error);
      toast({ title: "Error", description: "Failed to add metric.", variant: "destructive" });
    }
  }, [addMetric, toast, refetchMetrics]);

  // Calculate task counts per team for dropdown display
  const teamTaskCounts = useMemo(() => {
    const counts: Record<string, number> = { personal: 0 };
    teams.forEach(t => { counts[t.id] = 0; });
    
    tasks.forEach(task => {
      // Apply my tasks filter if active
      if (myTasksOnly && user) {
        const isAssigned = task.assignedTo?.includes(user.id);
        const isCreator = task.userId === user.id;
        if (!isAssigned && !isCreator) return;
      }
      
      if (task.taskType === 'personal') {
        counts.personal = (counts.personal || 0) + 1;
      } else if (task.teamId) {
        counts[task.teamId] = (counts[task.teamId] || 0) + 1;
      }
    });
    return counts;
  }, [tasks, teams, myTasksOnly, user]);

  const totalTaskCount = useMemo(() => {
    if (myTasksOnly && user) {
      return tasks.filter(task => {
        const isAssigned = task.assignedTo?.includes(user.id);
        const isCreator = task.userId === user.id;
        return isAssigned || isCreator;
      }).length;
    }
    return tasks.length;
  }, [tasks, myTasksOnly, user]);

  // Filter tasks by selected team and myTasksOnly, then create tasksByStatus
  const filteredTasksByTeam = useMemo(() => {
    return tasks.filter(task => {
      // First apply my tasks only filter
      if (myTasksOnly && user?.id) {
        // For TEAM tasks: only show if user is explicitly assigned
        // For PERSONAL tasks: show if user owns it (userId matches)
        if (task.taskType === 'team') {
          const isAssigned = task.assignedTo?.includes(user.id);
          if (!isAssigned) return false;
        } else {
          // Personal task - check ownership
          if (task.userId !== user.id) return false;
        }
      }
      
      // Apply team filter
      if (selectedTeamId === 'all') {
        return true;
      }
      if (selectedTeamId === 'personal' && task.taskType === 'personal') {
        return true;
      }
      if (task.taskType === 'team' && task.teamId === selectedTeamId) {
        return true;
      }
      return false;
    });
  }, [tasks, selectedTeamId, myTasksOnly, user?.id]);

  // Create tasksByStatus from filtered tasks
  const tasksByStatus = useMemo(() => ({
    todo: filteredTasksByTeam.filter(t => t.status === 'todo'),
    inprogress: filteredTasksByTeam.filter(t => t.status === 'in-progress'),
    done: filteredTasksByTeam.filter(t => t.status === 'done')
  }), [filteredTasksByTeam]);

  
  const [activeTab, setActiveTab] = useState('todo');

  // Team options with personal
  const teamOptions = useMemo(() => [
    { id: 'personal', name: 'Personal' },
    ...teams.map(team => ({ id: team.id, name: team.name }))
  ], [teams]);

  const getDisplayText = () => {
    if (selectedTeamId === 'all') return 'Team';
    if (selectedTeamId === 'personal') return 'Personal';
    const team = teams.find(t => t.id === selectedTeamId);
    return team ? team.name : 'Team';
  };

  const getDisplayCount = () => {
    if (selectedTeamId === 'all') return totalTaskCount;
    return teamTaskCounts[selectedTeamId] || 0;
  };

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<FastTask>) => {
    await updateTaskHandler(taskId, updates);
  }, [updateTaskHandler]);

  const handleStatusChange = useCallback(async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    // BROADCAST SYNC: Clear any stale remote status before local update
    clearRemoteStatusUpdate(taskId);
    
    // Celebrate when task is completed
    if (status === 'done') {
      celebrate();
    }
    
    await handleUpdateTask(taskId, { status });
    
    // BROADCAST SYNC: Publish full status to other users (not boolean)
    publishStatusChange(taskId, status);
  }, [handleUpdateTask, clearRemoteStatusUpdate, publishStatusChange]);

  // Transform taskCounts to match MobileTasksTabs interface
  const mobileTaskCounts = useMemo(() => ({
    todo: tasksByStatus.todo.length,
    inprogress: tasksByStatus.inprogress.length,
    done: tasksByStatus.done.length,
    total: tasks.length
  }), [tasksByStatus, tasks]);

  // Wrapper for addTask to match AddTaskModal interface
  const handleAddTask = useCallback(async (
    title: string,
    description?: string,
    teamSelection?: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string
  ): Promise<boolean> => {
    logger.log('📝 MobileTasksPage handleAddTask called:', { title, teamSelection, dueDate });
    try {
      const result = await addTask(
        title,
        description || '',
        dueDate || '',
        teamSelection?.type || 'personal',
        teamSelection?.teamId,
        teamSelection?.type === 'team' ? teams.find(t => t.id === teamSelection?.teamId)?.name : undefined
      );
      logger.log('📝 MobileTasksPage handleAddTask result:', result);
      return !!result;
    } catch (error) {
      logger.error('❌ MobileTasksPage handleAddTask error:', error);
      return false;
    }
  }, [addTask, teams]);

  const handleArchive = useCallback(async (taskId: string) => {
    await archiveTask(taskId);
  }, [archiveTask]);

  if (loading) {
    return (
      <div className="h-[100dvh] min-h-0 bg-background flex flex-col overflow-hidden">
        <MobilePageHeader title="Tasks" icon={CheckSquare} showSearch />
        <div className="flex-1 overflow-auto px-4 py-4">
          <MobileTasksListSkeleton />
        </div>
        <MobileUnifiedFAB
          onAddTask={() => {}}
          onAddIssue={() => {}}
          onAddGoal={() => {}}
          onAddMetric={() => {}}
          onAddHeadline={() => {}}
        />
        <MobileBottomNav />
      </div>
    );
  }

  // Performance tracking for dev
  if (process.env.NODE_ENV === 'development' && !loading) {
    const loadTime = performance.now() - perfStart;
    logger.log(`⚡ MobileTasksPage: Loaded with useFastTasks in ${loadTime.toFixed(1)}ms (${tasks.length} tasks)`);
  }

  return (
    <div className="h-[100dvh] min-h-0 bg-background flex flex-col overflow-hidden">
      <MeetingEndIndicator />
      
      <MobilePageHeader title="Tasks" icon={CheckSquare} showSearch>
        {/* Team Dropdown - like desktop /tasks */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 min-w-[130px] justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="truncate max-w-[80px]">{getDisplayText()}</span>
                  <span className="text-xs opacity-70">({getDisplayCount()})</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="bg-background border shadow-lg z-50 min-w-[200px] max-h-[340px] overflow-y-auto p-1"
            >
              <DropdownMenuItem
                onClick={() => handleTeamChange('all')}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
                  "hover:bg-accent focus:bg-accent",
                  selectedTeamId === 'all' && "bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-2">
                    {selectedTeamId === 'all' && <Check className="h-4 w-4 text-primary" />}
                    <span className={cn("font-medium", selectedTeamId === 'all' && "text-primary")}>
                      All Teams
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full bg-muted",
                    selectedTeamId === 'all' && "bg-primary/10 text-primary font-medium"
                  )}>
                    {totalTaskCount}
                  </span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => handleTeamChange('personal')}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
                  "hover:bg-accent focus:bg-accent",
                  selectedTeamId === 'personal' && "bg-accent/50"
                )}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-2">
                    {selectedTeamId === 'personal' && <Check className="h-4 w-4 text-primary" />}
                    <span className={cn("font-medium", selectedTeamId === 'personal' && "text-primary")}>
                      Personal
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full bg-muted",
                    selectedTeamId === 'personal' && "bg-primary/10 text-primary font-medium"
                  )}>
                    {teamTaskCounts.personal || 0}
                  </span>
                </div>
              </DropdownMenuItem>
              
              {teams.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  {teams.map((team) => {
                    const count = teamTaskCounts[team.id] || 0;
                    const isSelected = selectedTeamId === team.id;
                    
                    return (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => handleTeamChange(team.id)}
                        className={cn(
                          "cursor-pointer rounded-md px-3 py-2.5 transition-colors",
                          "hover:bg-accent focus:bg-accent",
                          isSelected && "bg-accent/50"
                        )}
                      >
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-2">
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                            <span className={cn("truncate max-w-[120px]", isSelected && "text-primary font-medium")}>
                              {team.name}
                            </span>
                          </div>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full bg-muted flex-shrink-0",
                            isSelected && "bg-primary/10 text-primary font-medium"
                          )}>
                            {count}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* My Tasks Only Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="my-tasks-mobile" className="text-xs text-muted-foreground whitespace-nowrap">
              My tasks
            </Label>
            <Switch
              id="my-tasks-mobile"
              checked={myTasksOnly}
              onCheckedChange={async (checked) => {
                setMyTasksOnly(checked);
                // Persist to database
                if (user?.id) {
                  try {
                    await supabase
                      .from('user_settings')
                      .upsert({
                        user_id: user.id,
                        mobile_tasks_my_only: checked,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'user_id' });
                  } catch (err) {
                    logger.error('Failed to persist my tasks toggle:', err);
                  }
                }
              }}
              className="scale-90"
            />
          </div>
        </div>
      </MobilePageHeader>

      {/* Tabs below header */}
      <div className="px-4">
        <MobileTasksTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          taskCounts={mobileTaskCounts}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
        />
      </div>

      {/* Pull to Refresh Indicator */}
      {pullToRefresh.isPulling && (
        <div 
          className="flex justify-center py-4 transition-opacity"
          style={{ opacity: pullToRefresh.progress / 100 }}
        >
          <RefreshCw 
            className={`h-6 w-6 text-primary ${pullToRefresh.isRefreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${pullToRefresh.progress * 3.6}deg)` }}
          />
        </div>
      )}

      {/* Task content - scrollable area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-24"
        {...pullToRefresh.handlers}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <MobileTasksTabContent
            activeTab={activeTab}
            filteredTasks={tasksByStatus}
            onStatusChange={handleStatusChange}
            onArchive={handleArchive}
            onUpdateTask={handleUpdateTask}
            teams={teams}
          />
        </Tabs>
      </div>

      {/* Cross-page modals from FAB - Using MobileMeetingModalsManager */}
      <MobileMeetingModalsManager
        teamId={selectedTeamId !== 'personal' && selectedTeamId !== 'all' ? selectedTeamId : ''}
        showTaskModal={modalState.showTaskModal}
        showGoalModal={modalState.showGoalModal}
        showMetricModal={modalState.showMetricModal}
        showHeadlineModal={modalState.showHeadlineModal}
        showIssueModal={modalState.showIssueModal}
        setShowTaskModal={modalState.setShowTaskModal}
        setShowGoalModal={modalState.setShowGoalModal}
        setShowMetricModal={modalState.setShowMetricModal}
        setShowHeadlineModal={modalState.setShowHeadlineModal}
        setShowIssueModal={modalState.setShowIssueModal}
        onAddTask={async (task) => {
          const isTeamTask = selectedTeamId !== 'personal' && selectedTeamId !== 'all';
          const teamId = isTeamTask ? selectedTeamId : undefined;
          const teamName = isTeamTask ? teams.find(t => t.id === selectedTeamId)?.name : undefined;
          const assignees = Array.isArray(task.assigned_to) ? task.assigned_to : task.assigned_to ? [task.assigned_to] : [];
          
          await addTask(
            task.title,
            task.description || '',
            task.due_date,
            isTeamTask ? 'team' : 'personal',
            teamId,
            teamName,
            assignees
          );
        }}
        onAddGoal={async () => {}}
        onAddMetric={handleAddMetric}
        onAddHeadline={handleAddHeadline}
        onAddIssue={async () => false}
        forceUpcomingHeadline
      />


      {/* Unified FAB */}
      <MobileUnifiedFAB
        onAddTask={modalState.openTaskModal}
        onAddIssue={modalState.openIssueModal}
        onAddGoal={modalState.openGoalModal}
        onAddMetric={modalState.openMetricModal}
        onAddHeadline={modalState.openHeadlineModal}
      />

      <MobileBottomNav />
      <DesktopRecommendedDialog />
    </div>
  );
};