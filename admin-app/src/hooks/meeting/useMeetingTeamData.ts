
import { useEffect } from 'react';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useMeetingTeamData = (
  teamId: string | undefined,
  setTeamInfo: (info: { name: string; company_id: string } | null) => void
) => {
  const { teams, loading: teamsLoading } = useUserTeams();
  const { currentCompany, loading: companyLoading } = useMultiCompany();

  // Fetch team information for display purposes only - do not switch company context
  useEffect(() => {
    const fetchTeamInfo = async () => {
      if (!teamId) return;

      try {
        const { data: teamData, error } = await supabase
          .from('teams')
          .select(`
            name,
            company_id,
            companies!inner(id, name, slug)
          `)
          .eq('id', teamId)
          .single();

        if (error) throw error;

        setTeamInfo({
          name: teamData.name,
          company_id: teamData.company_id
        });

        // REMOVED: Automatic company switching logic
        // The meeting should respect the currently selected company from the switcher
        // Users should manually switch companies if needed before entering a meeting
        logger.log('Meeting: Team info fetched for display:', {
          teamName: teamData.name,
          teamCompanyId: teamData.company_id,
          currentCompanyId: currentCompany?.id,
          companiesMatch: currentCompany?.id === teamData.company_id
        });

      } catch (error) {
        logger.error('Meeting: Error fetching team info:', error);
        setTeamInfo(null);
      }
    };

    fetchTeamInfo();
  }, [teamId, currentCompany?.id]); // Removed setTeamInfo to prevent infinite loop

  return {
    teams,
    teamsLoading,
    companyLoading,
    currentCompany,
  };
};
