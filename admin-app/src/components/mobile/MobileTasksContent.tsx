import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { Users, ChevronDown, Check } from 'lucide-react';
import { useFastTasks, type FastTask } from '@/hooks/useFastTasks';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMeetingModalsState } from '@/hooks/useMeetingModalsState';
import { useNavigationTransition } from '@/contexts/NavigationTransitionContext';
import { useMeetingEndState } from '@/contexts/MeetingEndStateContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksPageStatusBroadcast } from '@/hooks/tasks/useTasksPageStatusBroadcast';
import { supabase } from '@/integrations/supabase/client';
import { MobileTasksTabs } from '@/components/tasks/mobile/MobileTasksTabs';
import { MobileTasksTabContent } from '@/components/tasks/mobile/MobileTasksTabContent';
import { celebrate } from '@/lib/celebration';
import { MobileTasksSkeleton } from '@/components/tasks/TasksSkeleton';
import { MeetingEndIndicator } from '@/components/tasks/MeetingEndIndicator';
import { useMobileDataPreloader } from '@/hooks/mobile/useMobileDataPreloader';
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
import { useMobileShell } from '@/contexts/MobileShellContext';
import { AddGoalModal } from '@/components/modals/AddGoalModal';
import { logger } from '@/utils/logger';

// Lazy load modals for better initial load performance
const AddTaskModal = lazy(() => import('@/components/tasks/mobile/AddTaskModal').then(module => ({ default: module.AddTaskModal })));

/**
 * MobileTasksContent - Content-only version for MobileShell
 * Does NOT render header, FAB, or bottom nav (those are in MobileShell)
 */
export const MobileTasksContent: React.FC = () => {
  const shell = useMobileShell();
  
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
    allTasks: tasks,
    taskCounts,
    loading,
    addTask,
    archiveTask,
    updateTask: updateTaskHandler,
    applyRemoteStatusUpdate,
    clearRemoteStatusUpdate,
  } = tasksHook;

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

  // Enhanced protection system
  React.useEffect(() => {
    const checkAndEndProtection = () => {
      const hasOperations = hasActiveOperations();
      const inProtectionPeriod = isInProtectionPeriod();
      
      if (!loading && tasks.length >= 0) {
        if (!isTransitioning && !inProtectionPeriod && !hasOperations) {
          endTransition();
          endMeetingEnd();
          return true;
        }
        return false;
      }
      return false;
    };

    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let safetyTimeout: ReturnType<typeof setTimeout> | undefined;

    const timer = setTimeout(() => {
      if (!checkAndEndProtection()) {
        pollInterval = setInterval(() => {
          if (checkAndEndProtection()) {
            clearInterval(pollInterval);
            clearTimeout(safetyTimeout);
          }
        }, 500);

        safetyTimeout = setTimeout(() => {
          clearInterval(pollInterval);
          endTransition();
          endMeetingEnd();
        }, 15000);
      }
    }, 3000);

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
  
  // Local task modal state (for page-specific Add Task modal)
  const [showLocalTaskModal, setShowLocalTaskModal] = useState(false);
  
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

  // Calculate task counts per team for dropdown display
  const teamTaskCounts = useMemo(() => {
    const counts: Record<string, number> = { personal: 0 };
    teams.forEach(t => { counts[t.id] = 0; });
    
    tasks.forEach(task => {
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

  // Filter tasks by selected team and myTasksOnly
  const filteredTasksByTeam = useMemo(() => {
    return tasks.filter(task => {
      if (myTasksOnly && user?.id) {
        if (task.taskType === 'team') {
          const isAssigned = task.assignedTo?.includes(user.id);
          if (!isAssigned) return false;
        } else {
          if (task.userId !== user.id) return false;
        }
      }
      
      if (selectedTeamId === 'all') return true;
      if (selectedTeamId === 'personal' && task.taskType === 'personal') return true;
      if (task.taskType === 'team' && task.teamId === selectedTeamId) return true;
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
    clearRemoteStatusUpdate(taskId);
    
    if (status === 'done') {
      celebrate();
    }
    
    await handleUpdateTask(taskId, { status });
    publishStatusChange(taskId, status);
  }, [handleUpdateTask, clearRemoteStatusUpdate, publishStatusChange]);

  // Transform taskCounts to match MobileTasksTabs interface
  const mobileTaskCounts = useMemo(() => ({
    todo: tasksByStatus.todo.length,
    inprogress: tasksByStatus.inprogress.length,
    done: tasksByStatus.done.length,
    total: tasks.length
  }), [tasksByStatus, tasks]);

  // Wrapper for addTask
  const handleAddTask = useCallback(async (
    title: string,
    description?: string,
    teamSelection?: { type: 'personal' | 'team'; teamId?: string },
    dueDate?: string
  ): Promise<boolean> => {
    try {
      const result = await addTask(
        title,
        description || '',
        dueDate || '',
        teamSelection?.type || 'personal',
        teamSelection?.teamId,
        teamSelection?.type === 'team' ? teams.find(t => t.id === teamSelection?.teamId)?.name : undefined
      );
      return !!result;
    } catch (error) {
      logger.error('❌ MobileTasksContent handleAddTask error:', error);
      return false;
    }
  }, [addTask, teams]);

  const handleArchive = useCallback(async (taskId: string) => {
    await archiveTask(taskId);
  }, [archiveTask]);

  if (loading) {
    return <MobileTasksSkeleton />;
  }

  return (
    <>
      <MeetingEndIndicator />
      
      {/* Page-specific controls */}
      <div className="px-4 pt-2">
        {/* Team Dropdown */}
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
                    "text-xs px-2 py-0.5 rounded-[4px] bg-muted",
                    selectedTeamId === 'all' && "bg-[var(--active)]/10 text-[var(--active)] font-medium"
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
                    "text-xs px-2 py-0.5 rounded-[4px] bg-muted",
                    selectedTeamId === 'personal' && "bg-[var(--active)]/10 text-[var(--active)] font-medium"
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
                            "text-xs px-2 py-0.5 rounded-[4px] bg-muted",
                            isSelected && "bg-[var(--active)]/10 text-[var(--active)] font-medium"
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
          
          {/* My Tasks Toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="my-tasks-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
              My tasks
            </Label>
            <Switch
              id="my-tasks-toggle"
              checked={myTasksOnly}
              onCheckedChange={async (checked) => {
                setMyTasksOnly(checked);
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
            />
          </div>
        </div>
      </div>

      {/* Tasks List with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4">
          <MobileTasksTabs 
            taskCounts={mobileTaskCounts} 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            showArchived={showArchived}
            onToggleArchived={setShowArchived}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <MobileTasksTabContent
            filteredTasks={tasksByStatus}
            activeTab={activeTab}
            teams={teams.map(t => ({ id: t.id, name: t.name, company_id: t.company_id }))}
            onStatusChange={handleStatusChange}
            onArchive={handleArchive}
            onUpdateTask={handleUpdateTask}
          />
        </div>
      </Tabs>

      {/* Page-specific Add Task Modal */}
      <Suspense fallback={null}>
        <AddTaskModal
          open={showLocalTaskModal}
          onOpenChange={setShowLocalTaskModal}
          onAddTask={handleAddTask}
          teamOptions={teamOptions}
        />
      </Suspense>
      
      {/* Goal modal from shell */}
      <AddGoalModal 
        open={shell.showGoalModal}
        onOpenChange={shell.setShowGoalModal}
        onSuccess={() => shell.setShowGoalModal(false)}
      />
    </>
  );
};

export default MobileTasksContent;
