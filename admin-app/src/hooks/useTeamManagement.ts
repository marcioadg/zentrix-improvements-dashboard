import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types/team';
import { 
  loadTeamsForCompany, 
  createTeamWithMembers, 
  updateTeamWithMembers, 
  deleteTeamCompletely 
} from '@/services/teamOperationsService';
import { teamCacheInvalidator } from '@/utils/teamCacheInvalidation';
import { logger } from '@/utils/logger';

export const useTeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadTeams = async () => {
    if (!user || !currentCompany) {
      logger.log('useTeamManagement: No user or current company, clearing teams');
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      logger.log('useTeamManagement: Loading teams for company:', currentCompany?.name);
      const data = await loadTeamsForCompany(currentCompany?.id);
      logger.log('useTeamManagement: Loaded teams for company:', currentCompany?.name, data.length);
      setTeams(data);
    } catch (error) {
      logger.error('useTeamManagement: Error loading teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive",
      });
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentCompany?.id]);

  // Realtime: refresh teams list on any change within current company
  useEffect(() => {
    if (!user || !currentCompany?.id) return;

    const channel = supabase
      .channel(`teams-realtime-${currentCompany?.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `company_id=eq.${currentCompany?.id}` },
        () => {
          logger.log('useTeamManagement: Realtime teams change detected, reloading');
          loadTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentCompany?.id]);

  const createTeam = async (name: string, description?: string, memberIds?: string[], isLeadership?: boolean, hasStrategicPlan?: boolean) => {
    if (!user || !currentCompany) {
      throw new Error('User or company not found');
    }

    try {
      logger.log('useTeamManagement: Creating team for company:', currentCompany?.name);
      
      // Trigger optimistic update in onboarding context by dispatching event
      const optimisticEvent = new CustomEvent('optimistic-team-creation', { 
        detail: { team: { id: 'temp-' + Date.now(), name, description } } 
      });
      window.dispatchEvent(optimisticEvent);
      
      const teamData = await createTeamWithMembers(name, currentCompany?.id, user.id, description, memberIds, isLeadership, hasStrategicPlan);

      // Dispatch again with real team data
      const realTeamEvent = new CustomEvent('optimistic-team-creation', { 
        detail: { team: teamData } 
      });
      window.dispatchEvent(realTeamEvent);

      // Optimistically update local state
      setTeams(prev => [...prev, teamData]);

      // Trigger optimistic update for strategy teams specifically
      teamCacheInvalidator.triggerOptimisticTeamCreation(teamData, user.id);

      // Invalidate team caches across all hooks for immediate UI updates
      await teamCacheInvalidator.invalidateTeamCaches(queryClient, currentCompany?.id, user.id);

      toast({
        title: "Success",
        description: "Team created successfully",
      });

      return teamData;
    } catch (error) {
      logger.error('useTeamManagement: Error in createTeam:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTeam = async (teamId: string, updates: { name?: string; description?: string; is_leadership?: boolean; has_strategic_plan?: boolean }) => {
    if (!user || !currentCompany) {
      throw new Error('User or company not found');
    }

    try {
      logger.log('useTeamManagement: Updating team for company:', currentCompany?.name);
      const teamData = await updateTeamWithMembers(teamId, currentCompany?.id, updates);

      // Optimistically update local state with the returned data
      setTeams(prev => prev.map(team => 
        team.id === teamId ? teamData : team
      ));

      toast({
        title: "Success",
        description: "Team updated successfully",
      });

      return teamData;
    } catch (error) {
      logger.error('useTeamManagement: Error in updateTeam:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update team",
        variant: "destructive",
      });
      // Refresh teams to ensure UI is in sync
      loadTeams();
      throw error;
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!user || !currentCompany) {
      throw new Error('User or company not found');
    }

    try {
      logger.log('useTeamManagement: Deleting team for company:', currentCompany?.name);
      
      // Dispatch optimistic deletion event
      window.dispatchEvent(new CustomEvent('optimistic-team-deletion', { detail: { teamId } }));
      
      await deleteTeamCompletely(teamId, currentCompany?.id);

      // Optimistically update local state
      setTeams(prev => prev.filter(team => team.id !== teamId));

      toast({
        title: "Success",
        description: "Team deleted successfully",
      });

      logger.log('useTeamManagement: Team deleted successfully');
    } catch (error) {
      logger.error('useTeamManagement: Error in deleteTeam:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete team",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    teams,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    refetch: loadTeams,
  };
};

// Re-export the Team interface for backward compatibility
export type { Team } from '@/types/team';
