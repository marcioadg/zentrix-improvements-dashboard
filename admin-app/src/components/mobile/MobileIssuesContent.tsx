import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { MessageCircleQuestion, Archive, ArrowRightLeft } from 'lucide-react';
import { useIssues } from '@/hooks/useIssues';
import { useIssueCounts } from '@/hooks/useIssueCounts';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AddIssueModal } from '@/components/modals/AddIssueModal';
import { EditIssueModal } from '@/components/modals/EditIssueModal';
import { useToast } from '@/hooks/use-toast';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { useMobileDataPreloader } from '@/hooks/mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  MobileCard,
  MobileSegmentedControl,
  MobileTeamDropdown,
  MobileEmptyState,
  MobileIssuesSkeleton,
} from '@/components/mobile';
import { useMobileShell } from '@/contexts/MobileShellContext';
import { logger } from '@/utils/logger';

// Memoized issue card
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
  const initials = ownerProfile?.full_name?.trim()
    ? ownerProfile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  
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
          {ownerProfile && (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={ownerProfile.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </MobileCard>
    </SwipeableCard>
  );
});

/**
 * MobileIssuesContent - Content-only version for MobileShell
 */
export const MobileIssuesContent: React.FC = () => {
  const shell = useMobileShell();
  const { issueCounts, loading: countsLoading, getDefaultSelection } = useIssueCounts();
  const { teams: allTeams, loading: teamsLoading } = useSafeUserTeams();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const { toast } = useToast();
  const { preloadAdjacent } = useMobileDataPreloader();
  const [isPending, startTransition] = useTransition();
  
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

  const { issues, loading: issuesLoading, addIssue, updateIssue, archiveIssue } = useIssues(selectedTeamId, selectedIssueType);

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

  const handleTeamChange = useCallback(async (teamId: string) => {
    startTransition(() => {
      setSelectedTeamId(teamId);
    });

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
    isPublic?: boolean;
  }) => {
    return await addIssue(issueData.title, issueData.description, issueData.ownerId, issueData.isPublic);
  }, [addIssue]);

  const handleEditIssue = useCallback(async (updates: any) => {
    if (!editingIssue) return false;
    const success = await updateIssue(editingIssue.id, updates);
    if (success) setEditingIssue(null);
    return success;
  }, [editingIssue, updateIssue]);

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

  // Fast loading state
  if (teamsLoading || countsLoading) {
    return (
      <div className="px-4 py-4">
        <MobileIssuesSkeleton />
      </div>
    );
  }

  // No teams state
  if (teams.length === 0) {
    return (
      <div className="px-4 py-4">
        <MobileEmptyState
          icon={MessageCircleQuestion}
          title="No teams available"
          description="You need to be assigned to a team to track issues."
        />
      </div>
    );
  }

  return (
    <>
      {/* Page-specific controls */}
      <div className="px-4 pt-2">
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
      </div>

      {/* Issues List with transition indicator */}
      <div className={`px-4 py-4 space-y-3 transition-opacity duration-150 ${isPending ? 'opacity-60' : ''}`}>
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

      {/* Modals */}
      <AddIssueModal
        open={shell.showIssueModal}
        onOpenChange={shell.setShowIssueModal}
        onAdd={handleAddIssue}
        defaultTeamId={selectedTeamId}
        defaultIssueType={selectedIssueType}
      />

      <EditIssueModal
        open={!!editingIssue}
        onOpenChange={(open) => !open && setEditingIssue(null)}
        issue={editingIssue}
        onSave={handleEditIssue}
      />
    </>
  );
};

export default MobileIssuesContent;
