
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export interface CompanyDeletionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  access_type: 'direct' | 'team_member';
  team_names?: string[];
}

export interface CompanyDeletionDetails {
  users: CompanyDeletionUser[];
  teams: { id: string; name: string; member_count: number }[];
  metrics_count: number;
  tasks_count: number;
  issues_count: number;
}

export const useCompanyDeletionDetails = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchDeletionDetails = async (companyId: string): Promise<CompanyDeletionDetails | null> => {
    try {
      setLoading(true);
      logger.log('Fetching deletion details for company:', companyId);

      // Get direct company members
      const { data: companyMembers, error: companyMembersError } = await supabase
        .from('company_members')
        .select('user_id, permission_level')
        .eq('company_id', companyId);

      if (companyMembersError) {
        logger.error('Error fetching company members:', companyMembersError);
        throw companyMembersError;
      }

      // Get profiles for direct company members
      const directUserIds = (companyMembers || []).map(cm => cm.user_id);
      let directUsers: CompanyDeletionUser[] = [];
      
      if (directUserIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', directUserIds);

        if (profilesError) {
          logger.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        directUsers = (profiles || []).map(profile => {
          const memberInfo = companyMembers?.find(cm => cm.user_id === profile.id);
          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: memberInfo?.permission_level || 'member',
            access_type: 'direct' as const
          };
        });
      }

      // Get teams for this company
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', companyId);

      if (teamsError) {
        logger.error('Error fetching teams:', teamsError);
        throw teamsError;
      }

      const teamIds = (teams || []).map(t => t.id);

      // Get team members for these teams
      let teamUsers: CompanyDeletionUser[] = [];
      let teamsWithMembers: { id: string; name: string; member_count: number }[] = [];

      if (teamIds.length > 0) {
        const { data: teamMembers, error: teamMembersError } = await supabase
          .from('team_members')
          .select('user_id, team_id')
          .in('team_id', teamIds);

        if (teamMembersError) {
          logger.error('Error fetching team members:', teamMembersError);
          throw teamMembersError;
        }

        // Get unique user IDs from team members who are not already direct company members
        const directUserIdSet = new Set(directUserIds);
        const teamUserIds = [...new Set(
          (teamMembers || [])
            .map(tm => tm.user_id)
            .filter(userId => !directUserIdSet.has(userId))
        )];

        if (teamUserIds.length > 0) {
          const { data: teamUserProfiles, error: teamUserProfilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .in('id', teamUserIds);

          if (teamUserProfilesError) {
            logger.error('Error fetching team user profiles:', teamUserProfilesError);
            throw teamUserProfilesError;
          }

          // Group team names by user
          const userTeamMap = new Map<string, string[]>();
          (teamMembers || []).forEach(tm => {
            if (!directUserIdSet.has(tm.user_id)) {
              const team = teams?.find(t => t.id === tm.team_id);
              if (team) {
                if (!userTeamMap.has(tm.user_id)) {
                  userTeamMap.set(tm.user_id, []);
                }
                userTeamMap.get(tm.user_id)?.push(team.name);
              }
            }
          });

          teamUsers = (teamUserProfiles || []).map(profile => ({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: 'member', // Legacy field removed - team members have team-specific permissions
            access_type: 'team_member' as const,
            team_names: userTeamMap.get(profile.id) || []
          }));
        }

        // Calculate team member counts
        teamsWithMembers = (teams || []).map(team => {
          const memberCount = (teamMembers || []).filter(tm => tm.team_id === team.id).length;
          return {
            id: team.id,
            name: team.name,
            member_count: memberCount
          };
        });
      } else {
        teamsWithMembers = (teams || []).map(team => ({
          id: team.id,
          name: team.name,
          member_count: 0
        }));
      }

      // Get metrics count
      let metricsCount = 0;
      if (teamIds.length > 0) {
        const { count } = await supabase
          .from('weekly_metrics')
          .select('*', { count: 'exact', head: true })
          .in('team_id', teamIds);
        metricsCount = count || 0;
      }

      // Get tasks count
      let tasksCount = 0;
      if (teamIds.length > 0) {
        const { count } = await supabase
          .from('team_tasks')
          .select('*', { count: 'exact', head: true })
          .in('team_id', teamIds);
        tasksCount = count || 0;
      }

      // Get issues count
      let issuesCount = 0;
      if (teamIds.length > 0) {
        const { count } = await supabase
          .from('issues')
          .select('*', { count: 'exact', head: true })
          .in('team_id', teamIds);
        issuesCount = count || 0;
      }

      const allUsers = [...directUsers, ...teamUsers];

      logger.log('Deletion details:', {
        users: allUsers.length,
        teams: teamsWithMembers.length,
        metrics: metricsCount,
        tasks: tasksCount,
        issues: issuesCount
      });

      return {
        users: allUsers,
        teams: teamsWithMembers,
        metrics_count: metricsCount,
        tasks_count: tasksCount,
        issues_count: issuesCount
      };
    } catch (error) {
      logger.error('Error fetching deletion details:', error);
      toast({
        title: "Error",
        description: "Failed to load deletion details",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchDeletionDetails,
    loading
  };
};
