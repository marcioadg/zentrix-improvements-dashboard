/**
 * GoalsMobile - Mobile-only Goals page (/m/goals)
 * 
 * Uses mobile-specific components exclusively:
 * - MobileAddGoalModal instead of desktop AddGoalModal
 * - MobileMeetingModalsManager instead of desktop MeetingModalsManager
 * - MobileGoalStatusModal for editing
 */
import React, { useState, useMemo, memo, useCallback, useEffect } from 'react';
import { Target, AlertCircle, RefreshCw } from 'lucide-react';
import { MobileAddGoalModal, MobileGoalStatusModal } from '@/components/mobile/modals';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { useMobileGoals, Goal } from '@/hooks/useMobileGoals';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import MobileBottomNav from '@/components/MobileBottomNav';
import { MobileContainer } from '@/components/layout/MobileContainer';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useMobileDataPreloader, useMobileFABModals } from '@/hooks/mobile';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MobilePageHeader,
  MobileCard,
  MobileEmptyState,
  MobileTeamDropdown,
  MobileGoalsSkeleton,
  MobileUnifiedFAB,
} from '@/components/mobile';
import { SwipeHintOverlay, useSwipeHint } from '@/components/mobile/SwipeHintOverlay';
import { useHeadlines } from '@/hooks/useHeadlines';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

// Status info getter (memoized outside component)
const getStatusInfo = (status: Goal['status']) => {
  const statusMap = {
    complete: { color: 'text-accent', bgColor: 'bg-accent/10', label: 'Complete' },
    on_track: { color: 'text-status-success', bgColor: 'bg-status-success/10', label: 'On Track' },
    in_progress: { color: 'text-accent', bgColor: 'bg-accent/10', label: 'In Progress' },
    at_risk: { color: 'text-status-warning', bgColor: 'bg-status-warning/10', label: 'At Risk' },
    off_track: { color: 'text-status-error', bgColor: 'bg-status-error/10', label: 'Off Track' },
    not_started: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Not Started' },
  };
  return statusMap[status] || statusMap.not_started;
};

// Memoized goal card with optimistic state support
const GoalCard = memo(({ 
  goal, 
  onClick,
  onArchive,
  isPending,
  showHint,
  onDismissHint
}: { 
  goal: Goal; 
  onClick: () => void;
  onArchive: (id: string) => void;
  isPending?: boolean;
  showHint?: boolean;
  onDismissHint?: () => void;
}) => {
  const statusInfo = getStatusInfo(goal.status);
  
  return (
    <div className="relative">
      <SwipeableCard
        leftAction={{
          icon: <Target className="h-5 w-5" />,
          label: 'Edit',
          color: 'bg-primary',
          onAction: () => {
            onDismissHint?.();
            onClick();
          },
        }}
        rightAction={{
          icon: <AlertCircle className="h-5 w-5" />,
          label: 'Archive',
          color: 'bg-status-warning',
          onAction: () => {
            onDismissHint?.();
            onArchive(goal.id);
          },
        }}
        onSwipeStart={onDismissHint}
      >
        <MobileCard 
          interactive
          onClick={onClick}
          className={isPending ? 'opacity-70' : ''}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-2">
                {goal.title}
              </h3>
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-[4px] text-xs font-semibold ${statusInfo.bgColor} ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {goal.progress || 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {goal.target_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(goal.target_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                  {goal.owner_name && (
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={goal.owner_avatar || undefined} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {goal.owner_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            </div>
          </div>
        </MobileCard>
      </SwipeableCard>
      
      {/* Swipe hint overlay - only on first card */}
      {showHint && onDismissHint && (
        <SwipeHintOverlay show={showHint} onDismiss={onDismissHint} />
      )}
    </div>
  );
});

const GoalsMobile = () => {
  const { user } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [optimisticGoals, setOptimisticGoals] = useState<Set<string>>(new Set());
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [preferredTeamLoaded, setPreferredTeamLoaded] = useState(false);
  const [myGoalsOnly, setMyGoalsOnly] = useState(true); // Default true, will be loaded from DB
  const [myGoalsOnlyLoaded, setMyGoalsOnlyLoaded] = useState(false);
  
  const { goals, loading: goalsLoading, refetch, archiveGoal } = useMobileGoals(myGoalsOnly, selectedTeamId || undefined);
  const { teams, loading: teamsLoading } = useOptimizedUserTeams();
  const { preloadAdjacent } = useMobileDataPreloader();
  const fabModals = useMobileFABModals();
  const { showHint, dismissHint } = useSwipeHint();
  const { addHeadline } = useHeadlines(selectedTeamId || undefined);
  const { addMetric, refetch: refetchMetrics } = useWeeklyMetrics(selectedTeamId, 'last_3_weeks');
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

  // Load preferred team and toggle from user_settings on mount
  useEffect(() => {
    if (!user?.id || preferredTeamLoaded) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferred_goals_team_id, mobile_goals_my_only')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.preferred_goals_team_id) {
            setSelectedTeamId(data.preferred_goals_team_id);
          }
          if (data.mobile_goals_my_only !== null) {
            setMyGoalsOnly(data.mobile_goals_my_only);
          }
        }
        setPreferredTeamLoaded(true);
        setMyGoalsOnlyLoaded(true);
      } catch (err) {
        logger.error('Failed to load goals preferences:', err);
        setPreferredTeamLoaded(true);
        setMyGoalsOnlyLoaded(true);
      }
    };

    loadPreferences();
  }, [user?.id, preferredTeamLoaded]);

  // Preload adjacent pages
  useEffect(() => {
    preloadAdjacent('goals');
  }, [preloadAdjacent]);

  // Team options for dropdown
  const teamOptions = useMemo(() => 
    teams.map(team => ({ value: team.id, label: team.name })),
    [teams]
  );

  // Auto-select first team if no preferred team
  useEffect(() => {
    if (!teamsLoading && preferredTeamLoaded && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
    // Validate selectedTeamId exists
    if (preferredTeamLoaded && selectedTeamId && teams.length > 0) {
      const teamExists = teams.some(t => t.id === selectedTeamId);
      if (!teamExists) {
        setSelectedTeamId(teams[0].id);
      }
    }
  }, [teams, teamsLoading, selectedTeamId, preferredTeamLoaded]);

  // Handle team change with persistence
  const handleTeamChange = useCallback(async (teamId: string) => {
    setSelectedTeamId(teamId);

    // Persist to database in background
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            preferred_goals_team_id: teamId,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (err) {
        logger.error('Failed to persist preferred goals team:', err);
      }
    }
  }, [user?.id]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    disabled: goalsLoading,
  });

  const handleAddGoalSuccess = useCallback(() => {
    fabModals.setShowGoalModal(false);
    // Immediately refetch to show the new goal
    refetch();
  }, [fabModals, refetch]);

  const handleGoalClick = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    setIsStatusModalOpen(true);
  }, []);

  const handleStatusUpdateSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const undoArchive = useCallback(async (goalId: string, goalTitle?: string) => {
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId);

      if (error) throw error;

      await refetch();
      sonnerToast.success(`"${goalTitle || 'Goal'}" restored`);
    } catch (err) {
      logger.error('Failed to restore goal:', err);
      sonnerToast.error('Failed to restore goal');
    }
  }, [refetch]);

  // Optimistic archive with instant UI feedback + Undo
  const handleArchive = useCallback(async (goalId: string) => {
    const goalTitle = goals.find(g => g.id === goalId)?.title;

    setOptimisticGoals(prev => new Set(prev).add(goalId));

    const success = await archiveGoal(goalId);

    setOptimisticGoals(prev => {
      const next = new Set(prev);
      next.delete(goalId);
      return next;
    });

    if (success) {
      sonnerToast.success(`"${goalTitle || 'Goal'}" archived`, {
        action: {
          label: 'Undo',
          onClick: () => undoArchive(goalId, goalTitle),
        },
      });
    } else {
      sonnerToast.error('Failed to archive goal');
    }
  }, [archiveGoal, goals, undoArchive]);

  // Filter goals by selected team and remove optimistically archived
  const filteredGoals = useMemo(() => {
    let filtered = goals.filter(g => !optimisticGoals.has(g.id));
    // Note: useMobileGoals fetches all user goals, we could add team filtering if needed
    return filtered;
  }, [goals, optimisticGoals]);


  const isLoading = goalsLoading || teamsLoading || !preferredTeamLoaded;

  return (
    <MobileContainer>
      <MobilePageHeader title="Goals" icon={Target} showSearch>
        {/* Team Selector and My Goals Toggle */}
        <div className="flex items-center justify-between gap-3 mb-3">
          {teams.length > 1 && (
            <MobileTeamDropdown
              value={selectedTeamId}
              onChange={handleTeamChange}
              options={teamOptions}
              className="flex-1"
            />
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor="my-goals-toggle" className="text-sm text-muted-foreground whitespace-nowrap">
              My goals
            </Label>
            <Switch
              id="my-goals-toggle"
              checked={myGoalsOnly}
              onCheckedChange={async (checked) => {
                setMyGoalsOnly(checked);
                // Persist to database
                if (user?.id) {
                  try {
                    await supabase
                      .from('user_settings')
                      .upsert({
                        user_id: user.id,
                        mobile_goals_my_only: checked,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'user_id' });
                  } catch (err) {
                    logger.error('Failed to persist my goals toggle:', err);
                  }
                }
              }}
            />
          </div>
        </div>
      </MobilePageHeader>

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

      {/* Goals List */}
      <div 
        className="px-4 py-4 space-y-3"
        {...pullToRefresh.handlers}
      >
        {isLoading ? (
          <MobileGoalsSkeleton />
        ) : filteredGoals.length === 0 ? (
          <MobileEmptyState
            icon={Target}
            title="No goals yet"
            description="Tap + to set your first goal"
          />
        ) : (
          filteredGoals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => handleGoalClick(goal)}
              onArchive={handleArchive}
              isPending={optimisticGoals.has(goal.id)}
              showHint={index === 0 && showHint}
              onDismissHint={dismissHint}
            />
          ))
        )}
      </div>

      {/* Unified FAB */}
      <MobileUnifiedFAB
        onAddTask={fabModals.openTaskModal}
        onAddIssue={fabModals.openIssueModal}
        onAddGoal={fabModals.openGoalModal}
        onAddMetric={fabModals.openMetricModal}
        onAddHeadline={fabModals.openHeadlineModal}
      />

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Modals - Using mobile-specific modals only */}
      <MobileAddGoalModal 
        open={fabModals.showGoalModal}
        onOpenChange={fabModals.setShowGoalModal}
        teamId={selectedTeamId}
        isTeamGoal={true}
        onSuccess={handleAddGoalSuccess}
      />

      {selectedGoal && (
        <MobileGoalStatusModal 
          goal={selectedGoal}
          open={isStatusModalOpen}
          onOpenChange={setIsStatusModalOpen}
          onSuccess={handleStatusUpdateSuccess}
        />
      )}

      {/* Cross-page modals from FAB - Using MobileMeetingModalsManager */}
      <MobileMeetingModalsManager
        teamId={selectedTeamId}
        showTaskModal={fabModals.showTaskModal}
        showGoalModal={false}
        showMetricModal={fabModals.showMetricModal}
        showHeadlineModal={fabModals.showHeadlineModal}
        showIssueModal={fabModals.showIssueModal}
        setShowTaskModal={fabModals.setShowTaskModal}
        setShowGoalModal={() => {}}
        setShowMetricModal={fabModals.setShowMetricModal}
        setShowHeadlineModal={fabModals.setShowHeadlineModal}
        setShowIssueModal={fabModals.setShowIssueModal}
        onAddTask={async () => {}}
        onAddGoal={async () => {}}
        onAddMetric={handleAddMetric}
        onAddHeadline={handleAddHeadline}
        onAddIssue={async () => false}
        forceUpcomingHeadline
      />
    </MobileContainer>
  );
};

export default GoalsMobile;
