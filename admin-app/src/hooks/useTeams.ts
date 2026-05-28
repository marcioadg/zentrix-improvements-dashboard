
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { filterGeneralTeam } from '@/utils/teamFilters';
import { logger } from '@/utils/logger';

export interface TeamData {
  id: string;
  name: string;
  description?: string;
  company_id: string;
  created_at: string;
  member_count?: number;
}

export const useTeams = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = async () => {
    if (!user || !currentCompany) {
      logger.log('🔍 useTeams: Missing prerequisites:', {
        hasUser: !!user,
        hasCurrentCompany: !!currentCompany,
        userId: user?.id,
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name
      });
      setTeams([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.log('🔍 useTeams: Fetching teams for company:', {
        userId: user.id,
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name
      });

      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          company_id,
          created_at,
          team_members (
            id
          )
        `)
        .eq('company_id', currentCompany?.id)
        .order('name');

      if (teamsError) {
        logger.error('🚨 useTeams: Database error:', teamsError);
        throw teamsError;
      }

      logger.log('🔍 useTeams: Raw teams data:', {
        currentCompanyId: currentCompany?.id,
        currentCompanyName: currentCompany?.name,
        teamsCount: teamsData?.length || 0,
        teams: teamsData?.map(t => ({
          id: t.id,
          name: t.name,
          companyId: t.company_id,
          memberCount: t.team_members?.length || 0
        })) || []
      });

      const processedTeams: TeamData[] = (teamsData || []).map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        company_id: team.company_id,
        created_at: team.created_at,
        member_count: team.team_members?.length || 0
      }));

      logger.log('🔍 useTeams: Final processed teams:', {
        currentCompanyName: currentCompany?.name,
        currentCompanyId: currentCompany?.id,
        processedTeamsCount: processedTeams.length,
        processedTeams: processedTeams.map(t => ({ 
          name: t.name, 
          id: t.id, 
          companyId: t.company_id,
          memberCount: t.member_count 
        }))
      });

      setTeams(filterGeneralTeam(processedTeams));
    } catch (error) {
      logger.error('🚨 useTeams: Error fetching teams:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [user, currentCompany?.id]);

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
  };
};
