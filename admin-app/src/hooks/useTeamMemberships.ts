
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

interface TeamMembership {
  team_id: string;
  team_name: string;
  user_id: string;
  is_member: boolean;
}

export const useTeamMemberships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Record<string, TeamMembership[]>>({});
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTeamsAndMemberships = async () => {
    if (!user) {
      setMemberships({});
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      logger.log('Loading teams and memberships...');
      
      // Load all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load all team members
      const { data: teamMembersData, error: membersError } = await supabase
        .from('team_members')
        .select('team_id, user_id');

      if (membersError) throw membersError;

      // Load all profiles to get user information
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Create membership mapping
      const membershipMap: Record<string, TeamMembership[]> = {};
      
      profilesData?.forEach(profile => {
        membershipMap[profile.id] = teamsData?.map(team => ({
          team_id: team.id,
          team_name: team.name,
          user_id: profile.id,
          is_member: teamMembersData?.some(tm => 
            tm.team_id === team.id && tm.user_id === profile.id
          ) || false
        })) || [];
      });

      setMemberships(membershipMap);
      logger.log('Teams and memberships loaded successfully');
    } catch (error) {
      logger.error('Error loading team memberships:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team memberships',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTeamMembership = async (userId: string, teamId: string, isCurrentlyMember: boolean) => {
    try {
      if (isCurrentlyMember) {
        // Remove from team
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('user_id', userId)
          .eq('team_id', teamId);

        if (error) throw error;
      } else {
        // Add to team
        const { error } = await supabase
          .from('team_members')
          .insert({
            user_id: userId,
            team_id: teamId
          });

        if (error) throw error;
      }

      // Update local state
      setMemberships(prev => ({
        ...prev,
        [userId]: prev[userId]?.map(membership => 
          membership.team_id === teamId 
            ? { ...membership, is_member: !isCurrentlyMember }
            : membership
        ) || []
      }));

      toast({
        title: 'Success',
        description: `Team membership ${isCurrentlyMember ? 'removed' : 'added'} successfully`,
      });

    } catch (error) {
      logger.error('Error toggling team membership:', error);
      toast({
        title: 'Error',
        description: 'Failed to update team membership',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadTeamsAndMemberships();
  }, [user]);

  return {
    memberships,
    teams,
    loading,
    toggleTeamMembership,
    refetch: loadTeamsAndMemberships,
  };
};
