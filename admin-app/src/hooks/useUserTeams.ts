
import { useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useQuery } from '@tanstack/react-query';
import { filterGeneralTeam } from '@/utils/teamFilters';

interface Team {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  role?: string;
  is_leadership?: boolean;
}

interface UseUserTeamsResult {
  teams: Team[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<any>;
}

export const useUserTeams = (filterByMembership: boolean = true): UseUserTeamsResult => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { profile } = useProfile();
  const { toast } = useToast();

  const queryEnabled = !!user?.id; // Only run when we have a user

  const queryKey = useMemo(() => (
    ['user-teams', user?.id || 'no-user', currentCompany?.id || 'no-company', filterByMembership, profile?.role]
  ), [user?.id, currentCompany?.id, filterByMembership, profile?.role]);

  const fetchTeams = async (): Promise<Team[]> => {
    if (!user?.id) return [];

    const isSuperAdmin = profile?.role === 'super_admin';
    const isDirector = profile?.role === 'director';
    const hasElevatedAccess = isSuperAdmin || isDirector;

    try {
      // If not filtering by membership, or if super admin/director, fetch all teams for current company
      if (!filterByMembership || (hasElevatedAccess && currentCompany?.id)) {
        if (!currentCompany?.id) return [];
        
        const { data: allTeams, error: allTeamsError } = await supabase
          .from('teams')
          .select('id, name, description, company_id, is_leadership')
          .eq('company_id', currentCompany?.id);

        if (allTeamsError) throw allTeamsError;

        return filterGeneralTeam((allTeams || []).map((team) => ({
          ...team,
          role: hasElevatedAccess ? profile?.role : undefined,
          is_leadership: team.is_leadership || false,
        })));
      }

      // Regular user: fetch only memberships, scoped to current company when available
      const query = supabase
        .from('team_members')
        .select(`
          team_id,
          teams!inner (
            id,
            name,
            description,
            company_id,
            is_leadership
          )
        `)
        .eq('user_id', user.id);

      if (currentCompany?.id) {
        query.eq('teams.company_id', currentCompany?.id);
      }

      const { data: teamMemberships, error: teamsError } = await query;
      if (teamsError) throw teamsError;

      const transformed = (teamMemberships || [])
        .filter((tm: any) => tm.teams && typeof tm.teams === 'object' && !Array.isArray(tm.teams))
        .map((tm: any) => {
          const team = tm.teams as any;
          return {
            id: team.id,
            name: team.name,
            description: team.description,
            company_id: team.company_id,
            is_leadership: team.is_leadership || false,
          } as Team;
        });

      return filterGeneralTeam(transformed);
    } catch (err: any) {
      const message = err?.message || 'Failed to fetch teams';
      // Limit toast noise to meaningful errors
      if (!message.includes('permission') && !message.includes('RLS')) {
        toast({ title: 'Error', description: `Failed to load teams: ${message}`, variant: 'destructive' });
      }
      throw err;
    }
  };

  const { data, isLoading, error, refetch } = useQuery<Team[]>({
    queryKey,
    queryFn: fetchTeams,
    enabled: queryEnabled,
    staleTime: 60_000, // cache for 1 minute
    gcTime: 5 * 60_000,
    retry: 1,
    structuralSharing: true, // Prevent unnecessary re-renders when data is identical
  });

  // Realtime: consolidated channel for teams and memberships with longer debounce
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: NodeJS.Timeout;
    const debouncedRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refetch(), 1000);
    };

    const channel = supabase
      .channel(`user-teams-consolidated-${user.id}-${currentCompany?.id || 'no-company'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: currentCompany?.id ? `company_id=eq.${currentCompany?.id}` : undefined },
        debouncedRefetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${user.id}` },
        debouncedRefetch
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id, refetch]);

  // Stabilize teams reference to prevent cascading re-renders
  const stableTeams = useMemo(() => data || [], [data]);

  return {
    teams: stableTeams,
    loading: isLoading,
    error: error ? (error as any).message || 'Failed to load teams' : null,
    refetch,
  };
};
