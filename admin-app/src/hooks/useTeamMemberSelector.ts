
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { teamMembersCache } from './useTeamMembersCache';
import { logger } from '@/utils/logger';

export interface TeamMemberSelectorUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  is_active?: boolean;
}

export const useTeamMemberSelector = (teamId: string | null) => {
  const [users, setUsers] = useState<TeamMemberSelectorUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTeamMembers = async () => {
    if (!teamId) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use cache to fetch team members
      const processedUsers = await teamMembersCache.getTeamMembers<TeamMemberSelectorUser>({
        teamId,
        cacheKey: `team-member-selector-${teamId}`,
        fetchFn: async () => {
          // Step 1: Get company_id (lightweight query)
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('company_id')
            .eq('id', teamId)
            .single();

          if (teamError) {
            logger.error('❌ useTeamMemberSelector: Team query error:', teamError);
            throw new Error(`Failed to load team: ${teamError.message}`);
          }

          const companyId = teamData?.company_id;

          // Step 2: Run team_members + company_members queries in parallel
          const [teamMembersResult, activeMembersResult] = await Promise.all([
            supabase
              .from('team_members')
              .select(`
                user_id,
                joined_at,
                profiles:user_id (
                  id,
                  full_name,
                  email,
                  avatar_url
                )
              `)
              .eq('team_id', teamId),
            companyId
              ? supabase
                  .from('company_members')
                  .select('user_id')
                  .eq('company_id', companyId)
                  .eq('status', 'active')
              : Promise.resolve({ data: [], error: null }),
          ]);

          if (teamMembersResult.error) {
            logger.error('❌ useTeamMemberSelector: Team members query error:', teamMembersResult.error);
            throw new Error(`Failed to load team members: ${teamMembersResult.error.message}`);
          }

          const teamMembersData = teamMembersResult.data;
          const activeUserIds = new Set(
            activeMembersResult.error ? [] : (activeMembersResult.data?.map(m => m.user_id) || [])
          );

          if (!teamMembersData || teamMembersData.length === 0) {
            return [];
          }

          // Process all team members data (including inactive) with better error handling
          const processed: TeamMemberSelectorUser[] = teamMembersData
            .map(member => {
              // Handle the profiles relationship properly - it's an array
              const profileArray = Array.isArray(member.profiles) ? member.profiles : [member.profiles];
              const profile = profileArray?.[0];
              
              if (!profile || typeof profile !== 'object') {
                return null;
              }

              // Enhanced name resolution with multiple fallbacks
              let displayName = '';
              if (profile.full_name && profile.full_name.trim()) {
                displayName = profile.full_name.trim();
              } else if (profile.email && profile.email.includes('@')) {
                displayName = profile.email.split('@')[0];
              } else if (profile.email) {
                displayName = profile.email;
              } else {
                displayName = 'Unknown User';
              }

              return {
                id: member.user_id,
                full_name: displayName,
                email: profile.email || '',
                avatar_url: profile.avatar_url || undefined,
                is_active: activeUserIds.has(member.user_id),
              } as TeamMemberSelectorUser;
            })
            .filter((user): user is TeamMemberSelectorUser => user !== null)
            .filter(user => user.is_active); // Filter out inactive users
          
          return processed;
        },
      });
      
      setUsers(processedUsers);
      setLoading(false);
      setError(null);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load team members';
      logger.error('❌ useTeamMemberSelector: Fatal error:', {
        teamId,
        error,
        errorMessage
      });
      
      setUsers([]);
      setLoading(false);
      setError(errorMessage);
      
      toast({
        title: "Error Loading Team Members",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadTeamMembers();

    // Subscribe to cache invalidation
    const unsubscribe = teamMembersCache.subscribe(() => {
      loadTeamMembers();
    });

    return unsubscribe;
  }, [teamId]);

  // Manual refresh function for external invalidation
  const refreshTeamMembers = () => {
    loadTeamMembers();
  };

  return {
    users: users || [],
    loading,
    error,
    retry: loadTeamMembers,
    refresh: refreshTeamMembers,
  };
};
