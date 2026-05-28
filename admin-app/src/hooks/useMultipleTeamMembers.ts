import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TeamMemberUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface UseMultipleTeamMembersResult {
  allUsers: TeamMemberUser[];
  usersInAllTeams: string[];
  getUserTeams: (userId: string) => string[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch members from multiple teams and calculate intersection
 * Returns all unique users and identifies which users belong to ALL selected teams
 */
export const useMultipleTeamMembers = (teamIds: string[]): UseMultipleTeamMembersResult => {
  const [allUsers, setAllUsers] = useState<TeamMemberUser[]>([]);
  const [userTeamMap, setUserTeamMap] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      // If no teams selected, reset state
      if (!teamIds || teamIds.length === 0) {
        setAllUsers([]);
        setUserTeamMap(new Map());
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        logger.log('🔍 useMultipleTeamMembers: Fetching members for teams:', teamIds);

        // Fetch all team members for the selected teams
        const { data: teamMembersData, error: fetchError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            team_id,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .in('team_id', teamIds);

        if (fetchError) {
          logger.error('❌ Error fetching team members:', fetchError);
          setError(fetchError.message);
          return;
        }

        logger.log('✅ Fetched team members:', teamMembersData);

        // Build user-to-teams mapping
        const userTeamsMapping = new Map<string, string[]>();
        const uniqueUsersMap = new Map<string, TeamMemberUser>();

        teamMembersData?.forEach((tm: any) => {
          const userId = tm.user_id;
          const teamId = tm.team_id;
          const profile = tm.profiles;

          // Add to user-teams mapping
          if (!userTeamsMapping.has(userId)) {
            userTeamsMapping.set(userId, []);
          }
          userTeamsMapping.get(userId)!.push(teamId);

          // Add to unique users map (profile info)
          if (profile && !uniqueUsersMap.has(userId)) {
            uniqueUsersMap.set(userId, {
              id: profile.id,
              full_name: profile.full_name || 'Unknown User',
              email: profile.email || '',
              avatar_url: profile.avatar_url
            });
          }
        });

        setUserTeamMap(userTeamsMapping);
        setAllUsers(Array.from(uniqueUsersMap.values()));

        logger.log('✅ useMultipleTeamMembers: Processed data', {
          totalUsers: uniqueUsersMap.size,
          userTeamMapping: Array.from(userTeamsMapping.entries())
        });

      } catch (err) {
        logger.error('❌ Unexpected error in useMultipleTeamMembers:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [JSON.stringify(teamIds)]); // Use JSON.stringify for stable array comparison

  // Calculate users who belong to ALL selected teams
  const usersInAllTeams = useMemo(() => {
    if (teamIds.length === 0) return [];

    const users = Array.from(userTeamMap.keys()).filter(userId => {
      const userTeams = userTeamMap.get(userId) || [];
      // User must be in ALL selected teams
      return teamIds.every(teamId => userTeams.includes(teamId));
    });

    logger.log('✅ usersInAllTeams calculated:', {
      requiredTeams: teamIds,
      usersInAll: users
    });

    return users;
  }, [userTeamMap, teamIds]);

  // Helper function to get which teams a user belongs to
  const getUserTeams = (userId: string): string[] => {
    return userTeamMap.get(userId) || [];
  };

  return {
    allUsers,
    usersInAllTeams,
    getUserTeams,
    loading,
    error
  };
};
