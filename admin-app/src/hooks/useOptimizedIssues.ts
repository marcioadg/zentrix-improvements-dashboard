
import { useState, useEffect, useCallback, useRef } from 'react';
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

export const useOptimizedIssues = (teamId: string, issueType?: 'short_term' | 'long_term') => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { currentCompany } = useMultiCompany();
  const { teams, loading: teamsLoading } = useSafeUserTeams();
  const { meetingId } = useNewMeetingTimer();

  const fetchIssues = useCallback(async () => {
    if (!teamId || teamsLoading) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Validate team access
      const team = teams.find((t) => t.id === teamId);
      if (!currentCompany || !team || team.company_id !== currentCompany?.id) {
        setIssues([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Use the RPC function with meeting context
      const { data, error } = await supabase.rpc('get_issues_with_vote_counts', {
        p_team_id: teamId,
        p_issue_type: issueType || null,
        p_meeting_state_id: meetingId || null
      });

      if (signal.aborted) return;
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
        created_by: item.owner_id
      }));

      setIssues(typedIssues);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      logger.error('Error fetching issues:', error);
      setIssues([]);
      toast({
        title: "Error",
        description: "Failed to fetch issues",
        variant: "destructive",
      });
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [teamId, issueType, currentCompany?.id, teams, teamsLoading, meetingId, toast]);

  const addIssue = useCallback(async (title: string, description?: string, ownerId?: string, isPublic?: boolean) => {
    // Previously this returned false if teamsLoading was true, causing silent failure when adding too quickly.
    // New logic: proceed if we have user and teamId; only perform local validation if team/company data is ready.
    if (!user || !teamId) {
      logger.warn('⚠️ addIssue blocked: missing user or teamId', { hasUser: !!user, teamId });
      toast({
        title: "Error",
        description: "Missing user or team context.",
        variant: "destructive",
      });
      return false;
    }

    const team = teams.find((t) => t.id === teamId);
    const canValidateAccess = !!currentCompany && !!team && !teamsLoading;

    if (canValidateAccess && team!.company_id !== currentCompany!.id) {
      toast({
        title: "Access Denied",
        description: "Invalid team or company.",
        variant: "destructive",
      });
      return false;
    }

    if (teamsLoading && (!team || !currentCompany)) {
      logger.warn('ℹ️ addIssue proceeding while team data is loading; relying on RLS for validation', {
        teamsLoading,
        hasTeamInCache: !!team,
        hasCompany: !!currentCompany,
      });
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
      setIssues(prev => [optimisticIssue, ...prev]);

      logger.log('📝 addIssue inserting into DB', {
        title,
        team_id: teamId,
        owner_id: ownerId || user.id,
        issue_type: issueType || 'short_term',
      });

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
      setIssues(prev => {
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
      logger.error('❌ addIssue failed, rolling back optimistic item:', error);
      // Remove optimistic issue on error
      setIssues(prev => prev.filter(issue => !issue.id.startsWith('temp-')));
      toast({ title: 'Error', description: 'Failed to add issue', variant: 'destructive' });
      return false;
    }
  }, [user, teamId, issueType, currentCompany, teams, teamsLoading, toast, setIssues]);

  const updateIssue = useCallback(async (id: string, updates: Partial<Issue>) => {
    try {
      // Optimistic update
      setIssues(prev =>
        prev.map(issue =>
          issue.id === id ? { ...issue, ...updates } : issue
        )
      );

      const { data: updatedRows, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id)
        .select('id');

      if (error) {
        // Revert optimistic update on error
        await fetchIssues();
        throw error;
      }

      if (!updatedRows || updatedRows.length === 0) {
        // RLS blocked the update — revert optimistic update and show error
        await fetchIssues();
        toast({
          title: "Error",
          description: "You don't have permission to edit this issue",
          variant: "destructive",
        });
        return false;
      }

      // Refetch to sync local state with DB after successful update
      await fetchIssues();

      const isIssueTypeChange = updates.issue_type && updates.issue_type !== issueType;
      if (isIssueTypeChange) {
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
  }, [issueType, fetchIssues, toast]);

  const { archiveIssueOptimistically } = useOptimisticIssueArchiving(issues, setIssues);

  const archiveIssue = useCallback(async (id: string) => {
    return archiveIssueOptimistically(id);
  }, [archiveIssueOptimistically]);

  // Fetch issues when dependencies change
  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Set up real-time subscription with debouncing
  useEffect(() => {
    if (!teamId || !currentCompany || teamsLoading) return;
    
    const channelName = `issues_${teamId}_${issueType || 'all'}_${currentCompany?.id}`;
    let timeoutId: NodeJS.Timeout;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `team_id=eq.${teamId}` },
        () => {
          // Debounce real-time updates
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            fetchIssues();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [teamId, issueType, currentCompany?.id, teamsLoading, fetchIssues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    issues,
    loading,
    countdown,
    addIssue,
    updateIssue,
    archiveIssue,
    refetch: fetchIssues,
  };
};
