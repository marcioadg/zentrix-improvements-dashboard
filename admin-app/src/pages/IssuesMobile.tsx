/**
 * IssuesMobile - Mobile-only Issues page (/m/issues)
 * 
 * Uses mobile-specific components exclusively:
 * - MobileAddIssueModal instead of desktop AddIssueModal
 * - MobileMeetingModalsManager instead of desktop MeetingModalsManager
 * - MobileEditIssueModal for editing
 */
import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { MessageCircleQuestion, Archive, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';
import { useIssueCounts } from '@/hooks/useIssueCounts';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MobileAddIssueModal, MobileEditIssueModal } from '@/components/mobile/modals';
import { MobileMeetingModalsManager } from '@/components/mobile/MobileMeetingModalsManager';
import { useToast } from '@/hooks/use-toast';
import MobileBottomNav from '@/components/MobileBottomNav';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { useMobileDataPreloader, useMobileFABModals } from '@/hooks/mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import {
  MobilePageHeader,
  MobileCard,
  MobileSegmentedControl,
  MobileTeamDropdown,
  MobileEmptyState,
  MobileIssuesSkeleton,
  MobileUnifiedFAB,
} from '@/components/mobile';
import { useHeadlines } from '@/hooks/useHeadlines';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { logger } from '@/utils/logger';
import { getInitials } from '@/lib/utils';

// Memoized issue card for list performance
const IssueCard = React.memo(({ 
  issue, 
  selectedIssueType,
  onEdit, 
  onArchive, 
  onMoveType,
  isPending,
  ownerProfile
}: { 
  issue: any;
  selectedIssueType: 'short_term' | 'long_term';
  onEdit: () => void;
  onArchive: () => void;
  onMoveType: () => void;
  isPending?: boolean;
  ownerProfile?: { full_name?: string; avatar_url?: string } | null;
}) => {
  const moveLabel = selectedIssueType === 'short_term' ? 'Long-term' : 'Short-term';
  const initials = getInitials(ownerProfile?.full_name);
  
  return (
    <SwipeableCard
      leftAction={{
        icon: <ArrowRightLeft className="h-5 w-5" />,
        label: moveLabel,
        color: 'bg-[var(--active)]',
        onAction: onMoveType,
      }}
      rightAction={{
        icon: <Archive className="h-5 w-5" />,
        label: 'Archive',
        color: 'bg-status-warning',
        onAction: onArchive,
      }}
    >
      <MobileCard
        interactive
        onClick={onEdit}
        className={isPending ? 'opacity-70' : ''}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2">
              {issue.title}
            </h3>
          </div>
          {ownerProfile && (ownerProfile.avatar_url || initials) && (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={ownerProfile.avatar_url || undefined} />
              {initials && (
                <AvatarFallback className="text-[10px] bg-muted">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
          )}
        </div>
      </MobileCard>
    </SwipeableCard>
  );
});

const IssuesMobile = () => {
  const { issueCounts, loading: countsLoading, getDefaultSelection } = useIssueCounts();
  const { teams: allTeams, loading: teamsLoading } = useSafeUserTeams();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const { preloadAdjacent } = useMobileDataPreloader();
  const fabModals = useMobileFABModals();
  const [isPending, startTransition] = useTransition();
  
  // Local optimistic state for instant UI
  const [optimisticIssues, setOptimisticIssues] = useState<Set<string>>(new Set());
  const [showMyIssuesOnly, setShowMyIssuesOnly] = useState(false);
  const [preferredTeamLoaded, setPreferredTeamLoaded] = useState(false);
  
  const teams = useMemo(() => 
    allTeams.filter(team => issueCounts.some(ic => ic.id === team.id)),
    [allTeams, issueCounts]
  );
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedIssueType, setSelectedIssueType] = useState<'short_term' | 'long_term'>('short_term');
  const [hasSetDefault, setHasSetDefault] = useState(false);
  const [editingIssue, setEditingIssue] = useState<any>(null);

  const { issues, loading: issuesLoading, addIssue, updateIssue, archiveIssue, refetch } = useIssues(selectedTeamId, selectedIssueType);
  const { addHeadline } = useHeadlines(selectedTeamId || undefined);
  const { addMetric, refetch: refetchMetrics } = useWeeklyMetrics(selectedTeamId, 'last_3_weeks');

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

  // Pull to refresh
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch(true);
    },
    disabled: issuesLoading,
  });

  // Preload adjacent pages after mount
  useEffect(() => {
    preloadAdjacent('issues');
  }, [preloadAdjacent]);

  // Load preferred team and toggle from user_settings on mount
  useEffect(() => {
    if (!user?.id || preferredTeamLoaded) return;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('preferred_issues_team_id, mobile_issues_my_only')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!error && data) {
          if (data.preferred_issues_team_id) {
            setSelectedTeamId(data.preferred_issues_team_id);
            setHasSetDefault(true);
          }
          if (data.mobile_issues_my_only !== null) {
            setShowMyIssuesOnly(data.mobile_issues_my_only);
          }
        }
        setPreferredTeamLoaded(true);
      } catch (err) {
        logger.error('Failed to load issues preferences:', err);
        setPreferredTeamLoaded(true);
      }
    };

    loadPreferences();
  }, [user?.id, preferredTeamLoaded]);

  useEffect(() => {
    if (!countsLoading && !hasSetDefault && issueCounts.length > 0) {
      const { teamId, issueType } = getDefaultSelection();
      setSelectedTeamId(teamId);
      setSelectedIssueType(issueType);
      setHasSetDefault(true);
    }
  }, [countsLoading, hasSetDefault, issueCounts, getDefaultSelection]);

  const currentTeam = useMemo(() => 
    issueCounts.find(team => team.id === selectedTeamId),
    [issueCounts, selectedTeamId]
  );

  const teamOptions = useMemo(() => 
    teams.map(team => {
      const teamCount = issueCounts.find(tc => tc.id === team.id);
      const totalCount = (teamCount?.shortTermCount || 0) + (teamCount?.longTermCount || 0);
      return { value: team.id, label: `${team.name} (${totalCount})` };
    }),
    [teams, issueCounts]
  );

  const segments = useMemo(() => [
    { id: 'short_term', label: 'Short-term', count: currentTeam?.shortTermCount || 0 },
    { id: 'long_term', label: 'Long-term' },
  ], [currentTeam]);

  // Optimistic team/type change with transition + persistence
  const handleTeamChange = useCallback(async (teamId: string) => {
    startTransition(() => {
      setSelectedTeamId(teamId);
    });

    // Persist to database
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            preferred_issues_team_id: teamId,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        logger.error('Failed to persist preferred issues team:', err);
      }
    }
  }, [user?.id]);

  const handleTypeChange = useCallback((type: string) => {
    startTransition(() => {
      setSelectedIssueType(type as 'short_term' | 'long_term');
    });
  }, []);

  const handleAddIssue = useCallback(async (issueData: {
    title: string;
    description?: string;
    issueType: 'short_term' | 'long_term';
    teamId: string;
    ownerId?: string;
  }) => {
    return await addIssue(issueData.title, issueData.description, issueData.ownerId);
  }, [addIssue]);

  const handleEditIssue = useCallback(async (updates: any) => {
    if (!editingIssue) return false;
    const success = await updateIssue(editingIssue.id, updates);
    if (success) setEditingIssue(null);
    return success;
  }, [editingIssue, updateIssue]);

  // Instant optimistic archive
  const handleArchiveIssue = useCallback(async (issueId: string, issueTitle: string) => {
    setOptimisticIssues(prev => new Set(prev).add(issueId));
    
    const success = await archiveIssue(issueId);
    
    setOptimisticIssues(prev => {
      const next = new Set(prev);
      next.delete(issueId);
      return next;
    });
    
    if (success) {
      toast({
        title: "Archived",
        description: `"${issueTitle}" archived.`,
      });
    }
  }, [archiveIssue, toast]);

  // Instant optimistic type move
  const handleMoveIssueType = useCallback(async (issue: any, newType: 'short_term' | 'long_term') => {
    setOptimisticIssues(prev => new Set(prev).add(issue.id));
    
    const success = await updateIssue(issue.id, { issue_type: newType });
    
    setOptimisticIssues(prev => {
      const next = new Set(prev);
      next.delete(issue.id);
      return next;
    });
    
    if (success) {
      toast({
        title: "Moved",
        description: `Moved to ${newType.replace('_', '-')}.`,
      });
    }
  }, [updateIssue, toast]);

  // Filter out optimistically removed issues and apply "My issues" filter
  const activeIssues = useMemo(() => 
    issues.filter(issue => {
      if (issue.status === 'resolved' || optimisticIssues.has(issue.id)) return false;
      if (showMyIssuesOnly && user?.id && issue.owner_id !== user.id) return false;
      return true;
    }),
    [issues, optimisticIssues, showMyIssuesOnly, user?.id]
  );

  // Fast loading state - wait for teams, counts, AND preferences to load
  if (teamsLoading || countsLoading || !preferredTeamLoaded) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Issues" icon={MessageCircleQuestion} showSearch />
        <div className="px-4 py-4">
          <MobileIssuesSkeleton />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  // No teams state - use allTeams (raw) not filtered teams
  if (allTeams.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobilePageHeader title="Issues" icon={MessageCircleQuestion} showSearch />
        <MobileEmptyState
          icon={MessageCircleQuestion}
          title="No teams available"
          description="You need to be assigned to a team to track issues."
        />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobilePageHeader title="Issues" icon={MessageCircleQuestion} showSearch>
        {/* Team Dropdown + My Issues Toggle in same row */}
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
            <Label htmlFor="my-issues-filter" className="text-sm text-muted-foreground whitespace-nowrap">
              My issues
            </Label>
            <Switch
              id="my-issues-filter"
              checked={showMyIssuesOnly}
              onCheckedChange={async (checked) => {
                setShowMyIssuesOnly(checked);
                // Persist to database
                if (user?.id) {
                  try {
                    await supabase
                      .from('user_settings')
                      .upsert({
                        user_id: user.id,
                        mobile_issues_my_only: checked,
                        updated_at: new Date().toISOString()
                      }, { onConflict: 'user_id' });
                  } catch (err) {
                    logger.error('Failed to persist my issues toggle:', err);
                  }
                }
              }}
            />
          </div>
        </div>
        
        <MobileSegmentedControl
          segments={segments}
          value={selectedIssueType}
          onChange={handleTypeChange}
        />
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

      {/* Issues List with transition indicator */}
      <div 
        className={`px-4 py-4 space-y-3 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}
        {...pullToRefresh.handlers}
      >
        {issuesLoading ? (
          <MobileIssuesSkeleton />
        ) : activeIssues.length === 0 ? (
          <MobileEmptyState
            icon={MessageCircleQuestion}
            title={`No ${selectedIssueType.replace('_', '-')} issues`}
            description="Tap + to add your first issue"
          />
        ) : (
          activeIssues.map((issue) => {
            const ownerProfile = profiles.find(p => p.id === issue.owner_id);
            return (
              <IssueCard
                key={issue.id}
                issue={issue}
                selectedIssueType={selectedIssueType}
                onEdit={() => setEditingIssue(issue)}
                onArchive={() => handleArchiveIssue(issue.id, issue.title)}
                onMoveType={() => handleMoveIssueType(issue, selectedIssueType === 'short_term' ? 'long_term' : 'short_term')}
                isPending={optimisticIssues.has(issue.id)}
                ownerProfile={ownerProfile}
              />
            );
          })
        )}
      </div>

      {/* Modals - Using mobile-specific modals only */}
      <MobileAddIssueModal
        open={fabModals.showIssueModal}
        onOpenChange={fabModals.setShowIssueModal}
        onAdd={handleAddIssue}
        defaultTeamId={selectedTeamId}
        defaultIssueType={selectedIssueType}
      />

      <MobileEditIssueModal
        open={!!editingIssue}
        onOpenChange={(open) => !open && setEditingIssue(null)}
        issue={editingIssue}
        onSave={handleEditIssue}
      />

      {/* Cross-page modals from FAB - Using MobileMeetingModalsManager */}
      <MobileMeetingModalsManager
        teamId={selectedTeamId}
        showTaskModal={fabModals.showTaskModal}
        showGoalModal={fabModals.showGoalModal}
        showMetricModal={fabModals.showMetricModal}
        showHeadlineModal={fabModals.showHeadlineModal}
        showIssueModal={false}
        setShowTaskModal={fabModals.setShowTaskModal}
        setShowGoalModal={fabModals.setShowGoalModal}
        setShowMetricModal={fabModals.setShowMetricModal}
        setShowHeadlineModal={fabModals.setShowHeadlineModal}
        setShowIssueModal={() => {}}
        onAddTask={async () => {}}
        onAddGoal={async () => {}}
        onAddMetric={handleAddMetric}
        onAddHeadline={handleAddHeadline}
        onAddIssue={async () => false}
        forceUpcomingHeadline
      />

      {/* Unified FAB */}
      <MobileUnifiedFAB
        onAddTask={fabModals.openTaskModal}
        onAddIssue={fabModals.openIssueModal}
        onAddGoal={fabModals.openGoalModal}
        onAddMetric={fabModals.openMetricModal}
        onAddHeadline={fabModals.openHeadlineModal}
      />

      <MobileBottomNav />
    </div>
  );
};

export default IssuesMobile;
