
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { teamMembersCache } from './useTeamMembersCache';
import { logger } from '@/utils/logger';

interface TeamMember {
  id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

export const useTeamMembers = (teamId: string) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(!teamId ? false : true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!teamId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (process.env.NODE_ENV === 'development') {
          logger.debug('🔍 useTeamMembers: Fetching members for team:', teamId);
        }

        // Use cache to fetch team members
        const processedMembers = await teamMembersCache.getTeamMembers<TeamMember>({
          teamId,
          cacheKey: `team-members-${teamId}`,
          fetchFn: async () => {
            // Single optimized query with all needed data joined
            const { data, error } = await supabase
              .from('team_members')
              .select(`
                id,
                user_id,
                joined_at,
                profiles:user_id (
                  full_name,
                  email,
                  avatar_url,
                  role
                ),
                teams!inner (
                  company_id
                )
              `)
              .eq('team_id', teamId)
              .order('joined_at');

            if (error) {
              logger.error('🚨 useTeamMembers: Database error:', error);
              throw error;
            }

            // Get company_id from the first result for company members query
            const teamsArray = Array.isArray(data?.[0]?.teams) ? data?.[0]?.teams : [data?.[0]?.teams];
            const companyId = teamsArray?.[0]?.company_id;
            let companyMemberStatuses: { [key: string]: string } = {};
            
            if (companyId && data && data.length > 0) {
              const { data: companyMembers } = await supabase
                .from('company_members')
                .select('user_id, status')
                .eq('company_id', companyId)
                .in('user_id', data.map(m => m.user_id));
                
              companyMembers?.forEach(cm => {
                companyMemberStatuses[cm.user_id] = cm.status;
              });
            }

            if (process.env.NODE_ENV === 'development') {
              logger.debug('🔍 useTeamMembers: Loaded', data?.length || 0, 'members for team', teamId);
            }

            // Process the data to handle the array structure from joins and filter out inactive users
            return (data || [])
              .filter(member => {
                // Filter out inactive users - check both profile role and company member status
                const profileArray = Array.isArray(member.profiles) ? member.profiles : [member.profiles];
                const profile = profileArray?.[0];
                const companyMemberStatus = companyMemberStatuses[member.user_id];
                
                // Only include users with active profile role AND active company membership status
                return profile && 
                       profile.role !== 'inactive' && 
                       companyMemberStatus === 'active';
              })
              .map(member => {
                // Handle profiles array - Supabase returns relationships as arrays
                const profileArray = Array.isArray(member.profiles) ? member.profiles : [member.profiles];
                const profile = profileArray?.[0];
                
                return {
                  id: member.id,
                  user_id: member.user_id,
                  joined_at: member.joined_at,
                  profiles: profile ? {
                    full_name: profile.full_name || '',
                    email: profile.email || '',
                    avatar_url: profile.avatar_url || undefined
                  } : undefined
                };
              });
          },
        });

        setMembers(processedMembers);
      } catch (error) {
        logger.error('🚨 useTeamMembers: Error fetching team members:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch team members');
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();

    // Subscribe to cache invalidation
    const unsubscribe = teamMembersCache.subscribe(() => {
      logger.debug('🔄 useTeamMembers: Cache invalidated, refetching...');
      fetchTeamMembers();
    });

    return unsubscribe;
  }, [teamId]);

  return {
    members,
    loading,
    error,
  };
};
