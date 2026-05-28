
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { logger } from '@/lib/logger';
import { filterGeneralTeam } from '@/utils/teamFilters';
import { requestDeduplicator } from '@/utils/requestDeduplicator';
import { teamCacheInvalidator } from '@/utils/teamCacheInvalidation';

interface UserTeam {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  description?: string;
  role?: string;
  is_leadership?: boolean;
}

export const useOptimizedUserTeams = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [contextError, setContextError] = useState<string | null>(null);
  const [fallbackTeams, setFallbackTeams] = useState<UserTeam[]>([]);
  
  // Safely try to get MultiCompany context
  let multiCompanyContext;
  let hasValidContext = false;

  try {
    multiCompanyContext = useMultiCompany();
    hasValidContext = true;
  } catch (error) {
    // Avoid calling setState during render — track via local variable only.
    // The contextError state is set once via useEffect below.
    if (!contextError) {
      logger.warn('useOptimizedUserTeams: MultiCompany context not available:', error);
    }
  }

  // Set context error safely via effect (not during render)
  useEffect(() => {
    if (!hasValidContext && !contextError) {
      setContextError('MultiCompany context not available');
    }
  }, [hasValidContext, contextError]);

  const { currentCompany, loading: companyLoading } = multiCompanyContext || {
    currentCompany: null,
    loading: false
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previousCompanyId, setPreviousCompanyId] = useState<string | null>(null);

  // Clear data when company changes with better debugging
  useEffect(() => {
    const currentCompanyId = currentCompany?.id || null;
    
    if (previousCompanyId !== null && previousCompanyId !== currentCompanyId) {
      // invalidate cache on company change
      queryClient.invalidateQueries({ queryKey: ['userTeams'] });
      // 🎯 PHASE 4: Invalidate request deduplicator cache
      requestDeduplicator.invalidateCache(`teams-${previousCompanyId}`);
    }
    
    setPreviousCompanyId(currentCompanyId);
  }, [currentCompany?.id, previousCompanyId, queryClient]);

  // Listen for optimistic team creation events to invalidate cache immediately
  useEffect(() => {
    const handleOptimisticTeamCreation = async () => {
      if (user && currentCompany?.id) {
        await teamCacheInvalidator.invalidateTeamCaches(queryClient, currentCompany?.id, user.id);
      }
    };

    window.addEventListener('optimistic-team-creation', handleOptimisticTeamCreation);
    return () => window.removeEventListener('optimistic-team-creation', handleOptimisticTeamCreation);
  }, [queryClient, user, currentCompany?.id]);

  // 🎯 PHASE 4: Optimized fallback query with request deduplication
  const fetchTeamsWithoutContext = useCallback(async () => {
    if (!user) return [];
    
    return requestDeduplicator.deduplicate(
      `teams-fallback-${user.id}`,
      async () => {
        try {
          // Check if user is super admin - if so, fetch all teams
          const isSuperAdmin = profile?.role === 'super_admin';
          
          if (isSuperAdmin) {
            const { data: allTeams, error: allTeamsError } = await supabase
              .from('teams')
              .select(`
                id,
                name,
                description,
                company_id,
                is_leadership,
                companies:company_id (
                  id,
                  name
                )
              `);

            if (allTeamsError) throw allTeamsError;

            const userTeams = (allTeams || [])
              .map(team => {
                const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
                const company = companiesArray?.[0];
                
                return {
                  id: team.id,
                  name: team.name,
                  description: team.description || '',
                  company_id: team.company_id,
                  company_name: company?.name || 'Unknown Company',
                  role: 'super_admin',
                  is_leadership: team.is_leadership || false
                };
              })
              .filter(Boolean) as UserTeam[];

            setFallbackTeams(userTeams);
            return userTeams;
          }

          // Regular user: fetch team memberships
          const { data: memberships, error: membershipError } = await supabase
            .from('team_members')
          .select(`
            team_id,
            teams!inner (
                id,
                name,
                description,
                company_id,
                is_leadership,
                companies:company_id (
                  id,
                  name
                )
              )
            `)
            .eq('user_id', user.id);

          if (membershipError) throw membershipError;

          const userTeams = (memberships || [])
            .map(membership => {
              const team = membership.teams as any;
              if (!team) return null;

              const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
              const company = companiesArray?.[0];
              
              return {
                id: team.id,
                name: team.name,
                description: team.description || '',
                company_id: team.company_id,
                company_name: company?.name || 'Unknown Company',
                role: 'member',
                is_leadership: team.is_leadership || false
              };
            })
            .filter(Boolean) as UserTeam[];

          setFallbackTeams(userTeams);
          return userTeams;
        } catch (error) {
          logger.error('useOptimizedUserTeams: Fallback fetch error:', error);
          throw error;
        }
      },
      5 * 60 * 1000 // 5 minutes cache
    );
  }, [user, profile]);

  // 🎯 PHASE 4: Main optimized teams fetching with request deduplication
  const {
    data: allTeams = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['userTeams', user?.id, currentCompany?.id, hasValidContext],
    queryFn: async () => {
      const startTime = performance.now();
      if (!user) {
        return [];
      }

      // If context is not available, use fallback
      if (!hasValidContext) {
        const result = await fetchTeamsWithoutContext();
        return result;
      }

      // 🎯 PHASE 4: Deduplicated team fetching with stable cache key
      const cacheKey = `teams-${user.id}-${currentCompany?.id}`;
      
      return requestDeduplicator.deduplicate(
        cacheKey,
        async () => {
          try {
            // Check if user is super admin
            const isSuperAdmin = profile?.role === 'super_admin';
            
            if (isSuperAdmin && currentCompany) {
              // Super admin: fetch all teams in current company
              const { data: allTeams, error: allTeamsError } = await supabase
                .from('teams')
                .select(`
                  id,
                  name,
                  description,
                  company_id,
                  is_leadership,
                  companies:company_id (
                    id,
                    name
                  )
                `)
                .eq('company_id', currentCompany?.id);

              if (allTeamsError) {
                logger.error('useOptimizedUserTeams: Error fetching all teams:', allTeamsError);
                throw allTeamsError;
              }

              const userTeams = (allTeams || []).map(team => {
                const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
                const company = companiesArray?.[0];
                
                return {
                  id: team.id,
                  name: team.name,
                  description: team.description || '',
                  company_id: team.company_id,
                  company_name: company?.name || 'Unknown Company',
                  role: 'super_admin', // Mark as super admin access
                  is_leadership: team.is_leadership || false
                };
              });

              return userTeams;
            }

            // Regular user: Get user's team memberships
            const { data: memberships, error: membershipError } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', user.id);

            if (membershipError) {
              logger.error('useOptimizedUserTeams: Membership error:', membershipError);
              throw membershipError;
            }

            if (!memberships || memberships.length === 0) {
              return [];
            }

            // Step 2: Get team details for regular users
            const teamIds = memberships.map(m => m.team_id);
            const { data: teams, error: teamsError } = await supabase
              .from('teams')
              .select(`
                id,
                name,
                description,
                company_id,
                is_leadership,
                companies:company_id (
                  id,
                  name
                )
              `)
              .in('id', teamIds);

            if (teamsError) {
              logger.error('useOptimizedUserTeams: Teams error:', teamsError);
              throw teamsError;
            }
            
            // Step 3: Combine the data for regular users
            const userTeams = memberships
              .map(membership => {
                const team = teams?.find(t => t.id === membership.team_id);
                if (!team) return null;

                const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
                const company = companiesArray?.[0];
                
                const processedTeam = {
                  id: team.id,
                  name: team.name,
                  description: team.description || '',
                  company_id: team.company_id,
                  company_name: company?.name || 'Unknown Company',
                  role: 'member', // Default role since team roles removed
                  is_leadership: team.is_leadership || false
                };
                
                return processedTeam;
              })
              .filter((team: any) => {
                return team !== null && 
                       team.id && 
                       team.name && 
                       team.company_id;
              }) as UserTeam[];

            return userTeams;
          } catch (error) {
            logger.error('useOptimizedUserTeams: Error in query function:', error);
            throw error;
          }
        },
        10 * 60 * 1000 // 10 minutes cache for better performance
      );
    },
    enabled: !!user, // Enable when we have user (fallback will handle no context)
    staleTime: 15 * 60 * 1000, // 15 minutes (longer cache for better performance)
    gcTime: 60 * 60 * 1000, // 60 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Only fetch on initial mount
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: (failureCount, error) => {
      if (failureCount < 1) { // Reduced retries
        logger.error(`useOptimizedUserTeams: Query failed (attempt ${failureCount + 1}):`, error);
        return true;
      }
      return false;
    }
  });

  // Handle errors with toast notification
  useEffect(() => {
    if (error) {
      logger.error('useOptimizedUserTeams: Error fetching teams:', error);
      toast({
        title: "Error",
        description: `Failed to fetch user teams: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // 🎯 REAL-TIME TEAM MEMBERSHIP UPDATES - Listen for team_members changes
  useEffect(() => {
    if (!user?.id) return;

    logger.debug('🔄 useOptimizedUserTeams: Setting up real-time subscription for team membership changes');
    
    const channel = supabase
      .channel('team-membership-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'team_members',
          filter: `user_id=eq.${user.id}` // Only listen to changes for this user
        },
        async (payload) => {
          logger.debug('🔄 useOptimizedUserTeams: Team membership changed, invalidating cache', payload);
          
          // Invalidate and refetch team data immediately
          queryClient.invalidateQueries({ queryKey: ['userTeams'] });
          
          // Also invalidate the request deduplicator cache
          if (currentCompany?.id) {
            requestDeduplicator.invalidateCache(`teams-${user.id}-${currentCompany?.id}`);
          }
          requestDeduplicator.invalidateCache(`teams-fallback-${user.id}`);
          
          // Force refetch to get updated data immediately
          refetch();
        }
      )
      .subscribe();

    return () => {
      logger.debug('🔄 useOptimizedUserTeams: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id, queryClient, refetch]);

  // Memoized helper function to get teams for current company only
  const getCurrentCompanyTeams = useMemo(() => {
    // filter teams to current company or return fallback

    if (!currentCompany && hasValidContext) {
      return [];
    }
    
    // If no context, return all fallback teams
    if (!hasValidContext) {
      return fallbackTeams;
    }
    
    // TEMPORARY FIX: If company ID is invalid (like "487"), return all teams
    if (currentCompany && (typeof currentCompany?.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentCompany?.id))) {
      logger.warn('useOptimizedUserTeams: CORRUPTED COMPANY ID DETECTED, returning all teams as workaround:', currentCompany?.id);
      return allTeams;
    }
    
    const filteredTeams = allTeams.filter(team => team.company_id === currentCompany!.id);
    return filteredTeams;
  }, [allTeams, currentCompany, hasValidContext, fallbackTeams]);

  // Memoized helper function to get teams from all companies
  const getAllTeams = useMemo(() => {
    const teams = hasValidContext ? allTeams : fallbackTeams;
    return teams;
  }, [allTeams, fallbackTeams, hasValidContext]);

  // Get filtered teams for current company (memoized)
  const currentCompanyTeams = getCurrentCompanyTeams;

  // Calculate loading state more intelligently
  const finalLoading = hasValidContext ? 
    (isLoading || (companyLoading && !currentCompany)) : 
    isLoading;

  // Final state calculated - logging reduced to prevent console spam

  return {
    teams: filterGeneralTeam(currentCompanyTeams), // Filter General team from UI display
    allTeams: filterGeneralTeam(getAllTeams), // Filter General team from all teams too
    currentCompanyTeams: filterGeneralTeam(currentCompanyTeams),
    loading: finalLoading,
    refetch,
    error: contextError || error?.message || null,
  };
};
