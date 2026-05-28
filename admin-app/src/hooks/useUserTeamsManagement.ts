
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface UserTeamAssignment {
  team_id: string;
  team_name: string;
  selected: boolean;
}

export const useUserTeamsManagement = (targetUserId?: string) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const { toast } = useToast();
  const [teamAssignments, setTeamAssignments] = useState<UserTeamAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTeamAssignments = async () => {
    if (!user || !currentCompany || !targetUserId) {
      setTeamAssignments([]);
      return;
    }

    setLoading(true);
    try {
      // Get all teams in the company
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', currentCompany?.id)
        .order('name');

      if (teamsError) throw teamsError;

      // Get user's current team memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', targetUserId);

      if (membershipsError) throw membershipsError;

      // Combine data
      const assignments: UserTeamAssignment[] = (teams || [])
        .filter(team => team.name.toLowerCase() !== 'general')
        .map(team => {
          const membership = memberships?.find(m => m.team_id === team.id);
          return {
            team_id: team.id,
            team_name: team.name,
            selected: !!membership
          };
        });

      setTeamAssignments(assignments);
    } catch (error) {
      logger.error('Error loading team assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load team assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamAssignments();
  }, [user, currentCompany?.id, targetUserId]);

  // Realtime: refresh assignments when teams or memberships change
  useEffect(() => {
    if (!user || !currentCompany?.id || !targetUserId) return;

    const channels: any[] = [];

    const chTeams = supabase
      .channel(`team-mgmt-teams-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `company_id=eq.${currentCompany?.id}` },
        () => {
          logger.log('useUserTeamsManagement: Realtime teams change, reloading');
          loadTeamAssignments();
        }
      )
      .subscribe();
    channels.push(chTeams);

    const chMemberships = supabase
      .channel(`team-mgmt-memberships-${targetUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members', filter: `user_id=eq.${targetUserId}` },
        () => {
          logger.log('useUserTeamsManagement: Realtime membership change, reloading');
          loadTeamAssignments();
        }
      )
      .subscribe();
    channels.push(chMemberships);

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user?.id, currentCompany?.id, targetUserId]);

  const toggleTeamSelection = (teamId: string) => {
    setTeamAssignments(prev =>
      prev.map(assignment =>
        assignment.team_id === teamId
          ? { ...assignment, selected: !assignment.selected }
          : assignment
      )
    );
  };


  const saveTeamAssignments = async (): Promise<boolean> => {
    if (!user || !currentCompany || !targetUserId) return false;

    try {
      const selectedTeamIds = teamAssignments.filter(a => a.selected).map(a => a.team_id);
      const allTeamIds = teamAssignments.map(a => a.team_id);

      // Get current memberships for this user in these teams
      const { data: currentMemberships, error: fetchError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', targetUserId)
        .in('team_id', allTeamIds);

      if (fetchError) throw fetchError;

      const currentTeamIds = currentMemberships?.map(m => m.team_id) || [];

      // Calculate diff
      const teamsToRemove = currentTeamIds.filter(id => !selectedTeamIds.includes(id));
      const teamsToAdd = selectedTeamIds.filter(id => !currentTeamIds.includes(id));

      // Auto-unassign items before removing from each team (scoped per user + team)
      for (const teamId of teamsToRemove) {
        const { error: rpcError } = await supabase.rpc('unassign_member_from_team', {
          p_user_id: targetUserId,
          p_team_id: teamId
        });

        if (rpcError) {
          logger.error('Error unassigning member from team:', rpcError);
          throw rpcError;
        }
      }

      // Remove memberships (scoped to user + specific teams only)
      if (teamsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('user_id', targetUserId)
          .in('team_id', teamsToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new memberships
      if (teamsToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('team_members')
          .insert(
            teamsToAdd.map(teamId => ({
              user_id: targetUserId,
              team_id: teamId
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Team assignments updated successfully",
      });

      return true;
    } catch (error) {
      logger.error('Error saving team assignments:', error);
      toast({
        title: "Error",
        description: "Failed to save team assignments",
        variant: "destructive",
      });
      return false;
    }
  };

  const resetSelections = () => {
    loadTeamAssignments();
  };

  return {
    teamAssignments,
    loading,
    toggleTeamSelection,
    saveTeamAssignments,
    resetSelections,
    refetch: loadTeamAssignments
  };
};
