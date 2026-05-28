

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { logger } from '@/utils/logger';


export const useTeamAssignment = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { companies, currentCompany } = useMultiCompany();
  const { toast } = useToast();

  const assignUserToTeams = async (userId: string, teamIds: string[]): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      logger.log('useTeamAssignment: Assigning user to teams across companies:', teamIds);
      
      // Get all companies the current user has access to
      const accessibleCompanyIds = companies.map(c => c.id);
      
      // Validate that all target teams belong to companies the user has access to
      if (teamIds.length > 0) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, company_id, companies!inner(id, name)')
          .in('id', teamIds);

        if (teamsError) {
          logger.error('Error validating teams:', teamsError);
          throw new Error('Failed to validate team access');
        }

        // Check if user has access to all target team companies
        const unauthorizedTeams = teamsData?.filter(team => 
          !accessibleCompanyIds.includes(team.company_id)
        ) || [];

        if (unauthorizedTeams.length > 0) {
          const teamNames = unauthorizedTeams.map(t => t.name).join(', ');
          toast({
            title: "Access Denied",
            description: `Cannot assign user to team(s): ${teamNames}. You don't have access to the required companies.`,
            variant: "destructive",
          });
          return false;
        }
      }

      // Get all teams in the CURRENT company only
      const { data: currentCompanyTeams, error: currentTeamsError } = await supabase
        .from('teams')
        .select('id')
        .eq('company_id', currentCompany?.id);

      if (currentTeamsError) {
        logger.error('Error fetching current company teams:', currentTeamsError);
        throw new Error('Failed to fetch current company teams');
      }

      const currentCompanyTeamIds = currentCompanyTeams?.map(t => t.id) || [];

      // Get user's current team memberships in the current company
      const { data: currentMemberships, error: currentMembershipsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .in('team_id', currentCompanyTeamIds);

      if (currentMembershipsError) {
        logger.error('Error fetching current team memberships:', currentMembershipsError);
        throw new Error('Failed to fetch current team memberships');
      }

      const currentTeamIds = currentMemberships?.map(m => m.team_id) || [];

      // Calculate the diff: what needs to be added and what needs to be removed
      const teamsToAdd = teamIds.filter(id => !currentTeamIds.includes(id));
      const teamsToRemove = currentTeamIds.filter(id => !teamIds.includes(id));

      logger.log('useTeamAssignment: Incremental update - Add:', teamsToAdd, 'Remove:', teamsToRemove);

      const unassignSummary: string[] = [];

      // Remove user from teams that were deselected
      if (teamsToRemove.length > 0) {
        // Get team names for better error messages
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamsToRemove);

        const teamMap = new Map(teamsData?.map(t => [t.id, t.name]) || []);

        // Auto-unassign items before removing from each team
        for (const teamId of teamsToRemove) {
          const { data: result, error: rpcError } = await supabase.rpc('unassign_member_from_team', {
            p_user_id: userId,
            p_team_id: teamId
          });

          if (rpcError) {
            logger.error('Error unassigning member from team:', rpcError);
            throw rpcError;
          }

          if (result) {
            const r = typeof result === 'string' ? JSON.parse(result) : result;
            const teamName = teamMap.get(teamId) || 'team';
            const parts: string[] = [];
            if (r.goals_unassigned > 0) parts.push(`${r.goals_unassigned} goal(s)`);
            if (r.metrics_unassigned > 0) parts.push(`${r.metrics_unassigned} metric(s)`);
            if (r.issues_unassigned > 0) parts.push(`${r.issues_unassigned} issue(s)`);
            if ((r.kanban_tasks_unassigned || 0) + (r.fast_tasks_unassigned || 0) > 0) {
              parts.push(`${(r.kanban_tasks_unassigned || 0) + (r.fast_tasks_unassigned || 0)} task(s)`);
            }
            if (parts.length > 0) {
              unassignSummary.push(`"${teamName}": ${parts.join(', ')}`);
            }
          }
        }

        if (unassignSummary.length > 0) {
          logger.log('useTeamAssignment: Auto-unassigned items:', unassignSummary);
        }

        // Proceed with removal
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('user_id', userId)
          .in('team_id', teamsToRemove);

        if (deleteError) {
          logger.error('Error removing team memberships:', deleteError);
          throw deleteError;
        }
      }

      // Add user to newly selected teams
      if (teamsToAdd.length > 0) {
        const teamMemberships = teamsToAdd.map(teamId => ({
          user_id: userId,
          team_id: teamId
        }));

        const { error: insertError } = await supabase
          .from('team_members')
          .insert(teamMemberships);

        if (insertError) {
          logger.error('Error adding new team memberships:', insertError);
          throw insertError;
        }
      }

      const successDesc = unassignSummary.length > 0
        ? `Team assignments updated. Unassigned: ${unassignSummary.join('; ')}`
        : "Team assignments updated successfully";

      toast({
        title: "Success",
        description: successDesc,
      });

      return true;
    } catch (error) {
      logger.error('useTeamAssignment: Error updating team assignments:', error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to update team assignments";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    assignUserToTeams,
    loading
  };
};
