
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { logger } from '@/utils/logger';

interface UserTeam {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  description?: string;
  role?: string;
}

interface SafeUserTeamsResult {
  teams: UserTeam[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasValidTeams: boolean;
}

export const useSafeUserTeams = (): SafeUserTeamsResult => {
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    if (!user) {
      logger.debug('useSafeUserTeams: No user authenticated');
      setTeams([]);
      setLoading(false);
      setError(null);
      return;
    }

    const requestKey = `user-teams-${user.id}`;
    
    try {
      setLoading(true);
      setError(null);
      
      // Reset circuit breaker if it's been triggered
      requestDeduplicator.resetCircuitBreaker(requestKey);

      const result = await requestDeduplicator.deduplicate(requestKey, async () => {
        logger.debug('useSafeUserTeams: Fetching teams for user', { userId: user.id });

        const { data: memberships, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id);

        if (membershipError) {
          logger.error('useSafeUserTeams: Membership error', membershipError);
          throw membershipError;
        }

        if (!memberships || memberships.length === 0) {
          logger.debug('useSafeUserTeams: No team memberships found');
          return [];
        }

        const teamIds = memberships.map(m => m.team_id);
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            description,
            company_id,
            companies:company_id (
              id,
              name
            )
          `)
          .in('id', teamIds);

        if (teamsError) {
          logger.error('useSafeUserTeams: Teams error', teamsError);
          throw teamsError;
        }

        const userTeams: UserTeam[] = memberships
          .map(membership => {
            const team = teams?.find(t => t.id === membership.team_id);
            if (!team) return null;

            const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
            const company = companiesArray?.[0];
            
            const userTeam: UserTeam = {
              id: team.id,
              name: team.name,
              company_id: team.company_id,
              company_name: company?.name || 'Unknown Company'
            };

            // Only add optional properties if they have meaningful values
            if (team.description) {
              userTeam.description = team.description;
            }
            
            // Default role since team roles removed
            userTeam.role = 'member';

            return userTeam;
          })
          .filter((team): team is UserTeam => {
            return team !== null && 
                   Boolean(team.id) && 
                   Boolean(team.name) && 
                   Boolean(team.company_id);
          });

        logger.info('useSafeUserTeams: Successfully fetched teams', { 
          count: userTeams.length,
          teams: userTeams.map(t => ({ id: t.id, name: t.name, company: t.company_name }))
        });

        return userTeams;
      });

      setTeams(result);
      setError(null);
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch teams';
      logger.error('useSafeUserTeams: Fetch error', { error: fetchError, userId: user.id });
      
      setError(errorMessage);
      
      if (!errorMessage.includes('network') && !errorMessage.includes('timeout') && !errorMessage.includes('render cycles')) {
        toast({
          title: "Teams Loading Error",
          description: `Unable to load teams: ${errorMessage}`,
          variant: "destructive",
        });
      }
      
      if (teams.length === 0) {
        setTeams([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const hasValidTeams = teams.length > 0 && !loading && !error;

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
    hasValidTeams
  };
};
