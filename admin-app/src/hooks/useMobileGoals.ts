import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'on_track' | 'at_risk' | 'off_track' | 'complete';
  target_date: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  progress?: number | null;
  owner_name?: string | null;
  owner_avatar?: string | null;
}

export const useMobileGoals = (myGoalsOnly: boolean = false, teamId?: string) => {
  const { currentCompany } = useMultiCompany();
  const { user } = useAuth();

  const fetchGoals = async (): Promise<Goal[]> => {
    if (!user?.id || !currentCompany?.id) {
      logger.log('useMobileGoals: Missing user or company', { userId: user?.id, companyId: currentCompany?.id });
      return [];
    }

    logger.log('useMobileGoals: Fetching goals', {
      userId: user?.id,
      companyId: currentCompany?.id,
      myGoalsOnly,
      teamId,
    });

    // If we are not in “My goals” mode, hide goals owned by users who are no longer active/pending in the company.
    // This matches desktop behavior where inactive company members are excluded.
    let allowedOwnerIds: Set<string> | null = null;
    if (!myGoalsOnly) {
      try {
        const { data: members, error: membersError } = await supabase
          .from('company_members')
          .select('user_id, status')
          .eq('company_id', currentCompany?.id)
          .in('status', ['active', 'pending']);

        if (membersError) {
          logger.error('useMobileGoals: Error fetching company members for filtering:', membersError);
        } else {
          allowedOwnerIds = new Set((members || []).map((m) => m.user_id).filter(Boolean));
          logger.log('useMobileGoals: Allowed owner ids count:', allowedOwnerIds.size);
        }
      } catch (err) {
        logger.error('useMobileGoals: Failed to load company members for filtering:', err);
      }
    }

    let query = supabase
      .from('team_goals')
      .select(`
        id,
        owner_id,
        title,
        description,
        status,
        target_date,
        progress,
        created_at,
        updated_at,
        team_id,
        teams!inner(company_id),
        profiles!fk_team_goals_owner(full_name, avatar_url)
      `)
      .eq('teams.company_id', currentCompany?.id)
      .eq('archived', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    // Filter by team if provided
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    // Filter by user if myGoalsOnly is true
    if (myGoalsOnly) {
      query = query.eq('owner_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('useMobileGoals: Error fetching goals:', error);
      throw error;
    }

    const beforeCount = data?.length || 0;
    const filteredData = allowedOwnerIds
      ? (data || []).filter((g: any) => !g.owner_id || allowedOwnerIds!.has(g.owner_id))
      : (data || []);

    logger.log('useMobileGoals: Fetched goals count:', beforeCount);
    if (allowedOwnerIds) {
      logger.log('useMobileGoals: Goals after filtering inactive owners:', filteredData.length);
    }

    // Map team_goals to Goal interface
    return filteredData.map((goal: any) => {
      const profile = goal.profiles as { full_name?: string; avatar_url?: string } | null;
      return {
        id: goal.id,
        user_id: goal.owner_id,
        title: goal.title,
        description: goal.description,
        status: goal.status as Goal['status'],
        target_date: goal.target_date,
        company_id: currentCompany?.id,
        created_at: goal.created_at,
        updated_at: goal.updated_at,
        progress: goal.progress,
        owner_name: profile?.full_name || null,
        owner_avatar: profile?.avatar_url || null,
      };
    });
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mobile-goals', user?.id, currentCompany?.id, myGoalsOnly, teamId],
    queryFn: fetchGoals,
    enabled: !!user?.id && !!currentCompany?.id,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    structuralSharing: true,
  });

  // Listen for goal creation events (matches pattern from useTeamGoals)
  useEffect(() => {
    const handleGoalCreated = (event: CustomEvent) => {
      logger.log('📱 useMobileGoals: Goal created event received, refetching...', event.detail);
      refetch();
    };

    window.addEventListener('goal-created-success', handleGoalCreated as EventListener);
    window.addEventListener('meeting-goal-created', handleGoalCreated as EventListener);
    
    return () => {
      window.removeEventListener('goal-created-success', handleGoalCreated as EventListener);
      window.removeEventListener('meeting-goal-created', handleGoalCreated as EventListener);
    };
  }, [refetch]);

  // Simple real-time subscription with long debounce
  useEffect(() => {
    if (!user?.id || !currentCompany?.id) return;

    let debounceTimer: NodeJS.Timeout;
    const debouncedRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refetch(), 1000);
    };

    const channel = supabase
      .channel(`mobile-goals-${user.id}-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_goals',
          filter: `owner_id=eq.${user.id}`,
        },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id, refetch]);

  const stableGoals = useMemo(() => data || [], [data]);

  // Archive a goal
  const archiveGoal = async (goalId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('team_goals')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId);

      if (error) {
        logger.error('useMobileGoals: Error archiving goal:', error);
        return false;
      }

      // Refetch to update the list (await to avoid flicker when UI removes optimistic filter)
      await refetch();
      return true;
    } catch (err) {
      logger.error('useMobileGoals: Failed to archive goal:', err);
      return false;
    }
  };

  return {
    goals: stableGoals,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    archiveGoal,
  };
};
