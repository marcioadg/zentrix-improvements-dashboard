
// Add this import to fix "React refers to UMD global" error
import * as React from "react";
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useSafeUserTeams } from '@/hooks/useSafeUserTeams';
import { useNewMeetingTimer } from '@/contexts/NewMeetingTimerContext';
import { useOptimisticIssueArchiving } from './useOptimisticIssueArchiving';
import { logger } from '@/utils/logger';

export interface Issue {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'resolved';
  issue_type: 'short_term' | 'long_term';
  team_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  vote_count?: number;
  created_by: string;
}

export const useIssues = (teamId: string, issueType?: 'short_term' | 'long_term') => {
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<Record<string, number>>({});
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastFetchParams, setLastFetchParams] = useState<string>('');

  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useSafeUserTeams();
  const { meetingId } = useNewMeetingTimer();

  const fetchIssues = async (forceRefresh = false) => {
    if (!teamId) return;

    // Create a unique key for this fetch to avoid duplicate requests
    const fetchParams = `${teamId}_${currentCompany?.id}_${meetingId || 'no-meeting'}`;
    
    // Skip fetch if we already have data for the same params and it's not a force refresh
    // But ensure we actually have issues for the current teamId
    const hasRelevantData = allIssues.length > 0 && allIssues.some(issue => issue.team_id === teamId);
    if (!forceRefresh && lastFetchParams === fetchParams && hasRelevantData) {
      logger.log('[useIssues] Using cached data, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      // Wait for teams and company to load before validating
      if (teamsLoading || !currentCompany) {
        logger.log('[useIssues] Still loading data', { teamsLoading, hasCurrentCompany: !!currentCompany });
        return;
      }

      // More lenient team access validation - allow if teams are still loading or if we have company context
      const team = teams.find((t) => t.id === teamId);
      const hasValidCompanyContext = currentCompany?.id;
      
      // If no team found but we have company context, try to proceed (might be a loading issue)
      if (!team && hasValidCompanyContext) {
        logger.log("[useIssues] Team not found in loaded teams, but have company context - proceeding", { 
          teamId, 
          currentCompanyId: currentCompany?.id,
          availableTeams: teams.map(t => t.id),
          teamsCount: teams.length
        });
        // Allow the query to proceed - the database will enforce proper access control
      } else if (!team && !hasValidCompanyContext) {
        logger.warn("[useIssues] No team access and no company context", { 
          teamId, 
          availableTeams: teams.map(t => t.id) 
        });
        setAllIssues([]);
        setLoading(false);
        return; // Don't show error toast as this might be a loading state
      }

      // Check if team belongs to current company - only fail if we have team data and it's definitely wrong
      if (team && team.company_id !== currentCompany?.id) {
        logger.warn("[useIssues] ⚠️ Team belongs to different company - clearing issues during company switch", { 
          currentCompanyId: currentCompany?.id, 
          teamCompanyId: team.company_id,
          teamId 
        });
        setAllIssues([]);
        setLoading(false);
        // Toast removed - this is expected during company switches
        return;
      }

      logger.log("[useIssues] Validation passed", { 
        teamId, 
        companyId: currentCompany?.id, 
        teamCompanyId: team?.company_id,
        hasTeamData: !!team
      });

      setLoading(true);
      
      logger.log('[useIssues] Fetching issues with meeting context:', {
        teamId,
        issueType,
        meetingId
      });
      
      logger.log('[useIssues] About to call get_issues_with_vote_counts with params:', {
        p_team_id: teamId,
        p_issue_type: null,
        p_meeting_state_id: meetingId || null
      });
      
      // Fetch ALL issues for this team, not filtered by type for better caching
      const { data, error } = await supabase.rpc('get_issues_with_vote_counts', {
        p_team_id: teamId,
        p_issue_type: null, // Fetch all types for caching
        p_meeting_state_id: meetingId || null
      });
      
      logger.log('[useIssues] RPC call result:', { data, error });

      if (error) throw error;

      const typedIssues: Issue[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status === 'resolved' ? 'resolved' : 'open',
        issue_type: item.issue_type,
        team_id: item.team_id,
        owner_id: item.owner_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        archived: item.archived,
        vote_count: item.vote_count || 0,
        created_by: item.owner_id // Fallback for created_by
      }));

      logger.log('[useIssues] Fetched issues with vote counts:', typedIssues.map(i => ({
        title: i.title,
        vote_count: i.vote_count,
        issue_type: i.issue_type
      })));

      setAllIssues(typedIssues);
      setLastFetchParams(fetchParams);
      logger.log(`[useIssues] Cached ${typedIssues.length} issues for team ${teamId}`);
    } catch (error) {
      logger.error('Error fetching issues:', error);
      setAllIssues([]);
      toast({
        title: "Error",
        description: "Failed to fetch issues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addIssue = async (title: string, description?: string, ownerId?: string, isPublic?: boolean) => {
    if (!user || !teamId) return false;
    
    // Wait for teams to load before validating
    if (teamsLoading) {
      logger.log('[useIssues] Teams still loading for add operation');
      return false;
    }
    
    const team = teams.find((t) => t.id === teamId);
    if (!currentCompany || !team || team.company_id !== currentCompany?.id) {
      logger.warn("[useIssues] Attempted ADD to team outside company!", { currentCompany, teamId });
      toast({
        title: "Access Denied",
        description: "Invalid team or company.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Create optimistic issue to show immediately at the beginning
      const optimisticIssue: Issue = {
        id: `temp-${Date.now()}`, // Temporary ID
        title,
        description: description || '',
        team_id: teamId,
        owner_id: ownerId || user.id,
        created_by: user.id,
        issue_type: issueType || 'short_term',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: false,
        vote_count: 0,
      };

      // Add optimistic issue at the beginning of the list
      setAllIssues(prev => [optimisticIssue, ...prev]);

      const { data, error } = await supabase
        .from('issues')
        .insert({
          title,
          description,
          team_id: teamId,
          owner_id: ownerId || user.id,
          created_by: user.id,
          issue_type: issueType || 'short_term',
          status: 'open',
          is_public: (issueType || 'short_term') === 'long_term' ? (isPublic || false) : false,
        })
        .select()
        .single();
      if (error) throw error;
      
      // Replace optimistic issue with real data at the beginning
      setAllIssues(prev => {
        const withoutOptimistic = prev.filter(issue => issue.id !== optimisticIssue.id);
        const realIssue: Issue = {
          ...data,
          vote_count: 0,
          created_by: data.created_by || data.owner_id,
        };
        return [realIssue, ...withoutOptimistic];
      });
      
      toast({ title: 'Issue added', description: `"${title}" has been added to the issues list.` });
      return true;
    } catch (error) {
      // Remove optimistic issue on error
      setAllIssues(prev => prev.filter(issue => !issue.id.startsWith('temp-')));
      toast({ title: 'Error', description: 'Failed to add issue', variant: 'destructive' });
      return false;
    }
  };

  const updateIssue = async (id: string, updates: Partial<Issue>) => {
    try {
      logger.log('useIssues: Updating issue', { id, updates });
      
      // Check if this is an issue type change
      const isIssueTypeChange = updates.issue_type && updates.issue_type !== issueType;
      
      if (isIssueTypeChange) {
        // For issue type changes, don't apply optimistic updates
        // Just update the database and let real-time handle the UI changes
        logger.log('useIssues: Issue type change detected, skipping optimistic update');
      } else {
        // For other updates, apply optimistic update
        setAllIssues(prev =>
          prev.map(issue =>
            issue.id === id ? { ...issue, ...updates } : issue
          )
        );
      }

      const { error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id);

      if (error) {
        logger.error('useIssues: Database update error', error);
        // Revert optimistic update on error
        await fetchIssues();
        throw error;
      }

      logger.log('useIssues: Issue updated successfully');
      
      // For issue type changes, refresh to get the updated state
      if (isIssueTypeChange) {
        await fetchIssues(true); // Force refresh
        toast({
          title: "Success",
          description: `Issue moved to ${updates.issue_type === 'short_term' ? 'short-term' : 'long-term'} successfully`,
        });
      } else {
        toast({
          title: "Success",
          description: updates.archived ? "Issue archived successfully" : "Issue updated successfully",
        });
      }

      return true;
    } catch (error) {
      logger.error('Error updating issue:', error);
      toast({
        title: "Error",
        description: "Failed to update issue",
        variant: "destructive",
      });
      return false;
    }
  };

  const { archiveIssueOptimistically } = useOptimisticIssueArchiving(allIssues, setAllIssues);

  const archiveIssue = async (id: string) => {
    logger.log('useIssues: Archiving issue', id);
    return archiveIssueOptimistically(id);
  };

  const markOptimisticUpdate = (issueId: string) => {
    logger.log('Optimistic update for issue:', issueId);
  };

  // Filter issues based on issue type from cached data (exclude archived issues)
  const issues = React.useMemo(() => {
    return allIssues.filter(issue => 
      (!issueType || issue.issue_type === issueType) && !issue.archived
    );
  }, [allIssues, issueType]);

  useEffect(() => {
    fetchIssues();
    // eslint-disable-next-line
  }, [teamId, currentCompany?.id, teams, teamsLoading, meetingId]);

  useEffect(() => {
    // Add company-id and meeting-id to channel name for isolation
    if (!teamId || !currentCompany || teamsLoading) return;
    
    const channelName = `issues_${teamId}_${issueType || 'all'}_${currentCompany?.id}_${meetingId || 'no-meeting'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `team_id=eq.${teamId}` },
        async (payload) => {
          logger.log('Issues table change detected:', payload);
          // Only refresh for non-vote related changes (title, description, status, archived)
          // Vote count updates are handled by useVoting hook to prevent race conditions
          await fetchIssues(true); // Force refresh on real-time updates
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, issueType, currentCompany?.id, teamsLoading, meetingId]);

  // Note: Removed vote changes subscription since we now use live vote counts for sorting
  // This eliminates the "blink" issue and provides real-time accurate sorting

  return {
    issues,
    loading,
    countdown,
    addIssue,
    updateIssue,
    archiveIssue,
    markOptimisticUpdate,
    refetch: fetchIssues,
    realtimeConnected,
  };
};
