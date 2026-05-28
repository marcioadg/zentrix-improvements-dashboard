import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { teamsFetchCircuitBreaker } from '@/utils/circuitBreaker';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { filterGeneralTeam } from '@/utils/teamFilters';

interface UserTeam {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  role?: string;
}

interface UseUserTeamsResilientResult {
  teams: UserTeam[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasValidTeams: boolean;
}

export const useUserTeamsResilient = (): UseUserTeamsResilientResult => {
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { user } = useAuth();
  const { currentCompany, loading: companyLoading } = useMultiCompanyAccess();
  const { toast } = useToast();

  const fetchTeams = useCallback(async (isRetry = false) => {
    // Reset circuit breaker and clear cache to avoid render limit issues
    if (!isRetry) {
      teamsFetchCircuitBreaker.forceReset();
      const userKey = `resilient-teams-${user?.id}-${currentCompany?.id || 'no-company'}`;
      requestDeduplicator.resetCircuitBreaker(userKey);
      requestDeduplicator.clearCache(userKey);
    }
    
    // Add maximum retry safeguard
    if (retryCount >= 3) {
      logger.warn('useUserTeamsResilient: Maximum retries reached, stopping');
      setLoading(false);
      return;
    }

    if (!user) {
      logger.debug('useUserTeamsResilient: No user, clearing teams');
      setTeams([]);
      setLoading(false);
      setError(null);
      return;
    }

    if (companyLoading) {
      logger.debug('useUserTeamsResilient: Company still loading, waiting...');
      return;
    }

    const requestKey = `resilient-teams-${user.id}-${currentCompany?.id || 'no-company'}`;

    try {
      setLoading(true);
      setError(null);

      const result = await teamsFetchCircuitBreaker.execute(async () => {
        return await requestDeduplicator.deduplicate(requestKey, async () => {
          if (!currentCompany) {
            logger.debug('useUserTeamsResilient: No current company, using fallback approach');
            
            const { data: fallbackTeams, error: fallbackError } = await supabase
              .from('team_members')
              .select(`
                team_id,
                teams!inner (
                  id,
                  name,
                  description,
                  company_id
                )
              `)
              .eq('user_id', user.id);

            if (fallbackError) throw fallbackError;

            const transformedTeams = (fallbackTeams || [])
              .filter(tm => tm.teams && typeof tm.teams === 'object' && !Array.isArray(tm.teams))
              .map(tm => {
                const team = tm.teams as any;
                return {
                  id: team.id,
                  name: team.name,
                  description: team.description,
                  company_id: team.company_id
                };
              });

            logger.info('useUserTeamsResilient: Fallback teams loaded', { count: transformedTeams.length });
            return transformedTeams;
          }

          logger.debug('useUserTeamsResilient: Fetching teams for company', { company: currentCompany?.name });

          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select(`
              team_id,
              teams!inner (
                id,
                name,
                description,
                company_id
              )
            `)
            .eq('user_id', user.id)
            .eq('teams.company_id', currentCompany?.id);

          if (teamError) throw teamError;

          const transformedTeams = (teamData || [])
            .filter(tm => tm.teams && typeof tm.teams === 'object' && !Array.isArray(tm.teams))
            .map(tm => {
              const team = tm.teams as any;
              return {
                id: team.id,
                name: team.name,
                description: team.description,
                company_id: team.company_id
              };
            });

          logger.info('useUserTeamsResilient: Teams loaded successfully', {
            company: currentCompany?.name,
            teamCount: transformedTeams.length
          });

          return transformedTeams;
        });
      }, 'fetch-user-teams');

      setTeams(filterGeneralTeam(result));
      setError(null);
      setRetryCount(0);
    } catch (fetchError) {
      logger.error('useUserTeamsResilient: Fetch error', fetchError);
      const errorMessage = fetchError instanceof Error ? 
        fetchError.message : 'Failed to fetch teams';
      setError(errorMessage);
      
      // Only retry on specific types of errors and not circuit breaker errors
      if (!isRetry && retryCount < 2 && 
          !errorMessage.includes('Circuit breaker is OPEN') &&
          (errorMessage.includes('network') || 
           errorMessage.includes('timeout') ||
           errorMessage.includes('fetch') ||
           errorMessage.includes('INSUFFICIENT_RESOURCES'))) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchTeams(true);
        }, 1000 * (retryCount + 1));
      } else if (!isRetry && !errorMessage.includes('Circuit breaker is OPEN')) {
        toast({
          title: "Teams Loading Error",
          description: `Unable to load teams: ${errorMessage}`,
          variant: "destructive",
        });
      }
      
      // Keep any existing teams on error to avoid losing data
      if (teams.length === 0) {
        setTeams([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, currentCompany, companyLoading, toast, retryCount, teams.length]);

  useEffect(() => {
    // Clear any existing cache and reset counters on mount
    if (user?.id) {
      const userKey = `resilient-teams-${user.id}-${currentCompany?.id || 'no-company'}`;
      requestDeduplicator.resetCircuitBreaker(userKey);
    }
    
    // Add a small delay to prevent immediate firing
    const timeoutId = setTimeout(() => {
      fetchTeams();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user?.id, currentCompany?.id, companyLoading]);

  const hasValidTeams = teams.length > 0 && !loading && !error;

  return {
    teams,
    loading,
    error,
    refetch: () => fetchTeams(false),
    hasValidTeams
  };
};
