import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { TeamData } from './useTeams';
import { filterGeneralTeam } from '@/utils/teamFilters';
import { logger } from '@/utils/logger';

export interface CompanyDataState {
  teams: TeamData[];
  selectedTeamId: string | null;
  loading: boolean;
  error: string | null;
}

// Unified company data hook that manages teams and team selection
export const useCompanyData = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Unified teams query with proper company filtering
  const {
    data: teams = [],
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams
  } = useQuery({
    queryKey: ['company-teams', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany || !user) {
        logger.log('🔍 useCompanyData: Missing company or user');
        return [];
      }

      logger.log('🔍 useCompanyData: Fetching teams for company:', currentCompany?.name);

      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          company_id,
          created_at,
          team_members (
            id,
            user_id
          )
        `)
        .eq('company_id', currentCompany?.id)
        .order('name');

      if (error) {
        logger.error('🚨 useCompanyData: Teams fetch error:', error);
        throw error;
      }

      // Filter teams where user is a member
      const userTeams = teamsData?.filter(team => 
        team.team_members?.some(member => member.user_id === user.id)
      ) || [];

      const processedTeams: TeamData[] = userTeams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        company_id: team.company_id,
        created_at: team.created_at,
        member_count: team.team_members?.length || 0
      }));

      logger.log('✅ useCompanyData: Fetched teams:', {
        company: currentCompany?.name,
        teamCount: processedTeams.length,
        teams: processedTeams.map(t => ({ id: t.id, name: t.name }))
      });

      return filterGeneralTeam(processedTeams);
    },
    enabled: !!currentCompany && !!user,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Smart team selection logic
  const selectTeam = useCallback((teamId: string | null) => {
    if (!teamId || !teams.find(t => t.id === teamId)) {
      // If invalid team or null, select first available team
      const firstTeam = teams[0];
      setSelectedTeamId(firstTeam?.id || null);
      logger.log('🔄 useCompanyData: Auto-selected team:', firstTeam?.name || 'none');
    } else {
      setSelectedTeamId(teamId);
      logger.log('🔄 useCompanyData: Selected team:', teams.find(t => t.id === teamId)?.name);
    }
  }, [teams]);

  // Auto-select first team when teams change - simplified to avoid race conditions
  useEffect(() => {
    logger.log('🔄 useCompanyData useEffect triggered:', {
      teamsLength: teams.length,
      currentSelectedTeamId: selectedTeamId,
      firstTeamId: teams[0]?.id,
      triggeredBy: 'teams_changed'
    });
    
    if (teams.length > 0 && !selectedTeamId) {
      // Only auto-select if no team is currently selected
      const firstTeam = teams[0];
      logger.log('🔄 useCompanyData: Auto-selecting first team:', firstTeam.name);
      setSelectedTeamId(firstTeam.id);
    }
  }, [teams]); // Only depend on teams, not selectedTeamId

  // Reset selection when company changes
  useEffect(() => {
    logger.log('🔄 useCompanyData: Company changed, resetting selection', {
      newCompanyId: currentCompany?.id,
      prevSelection: selectedTeamId
    });
    setSelectedTeamId(null);
  }, [currentCompany?.id]);

  // Invalidate cache when company changes
  const handleCompanyChange = useCallback(() => {
    logger.log('🧹 useCompanyData: Clearing cache for company change');
    queryClient.invalidateQueries({ queryKey: ['company-teams'] });
    setSelectedTeamId(null);
  }, [queryClient]);

  logger.log('🔍 useCompanyData hook return:', {
    teamsCount: teams.length,
    selectedTeamId,
    selectedTeamName: teams.find(t => t.id === selectedTeamId)?.name,
    loading: teamsLoading
  });

  return {
    teams,
    selectedTeamId,
    selectedTeam: teams.find(t => t.id === selectedTeamId) || null,
    loading: teamsLoading,
    error: teamsError?.message || null,
    selectTeam,
    refetchTeams,
    handleCompanyChange,
  };
};