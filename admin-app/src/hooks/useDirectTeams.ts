
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDirectCompanies } from '@/hooks/useDirectCompanies';
import { supabase } from '@/integrations/supabase/client';
import { filterGeneralTeam } from '@/utils/teamFilters';
import { logger } from '@/utils/logger';

interface Team {
  id: string;
  name: string;
  description?: string;
  company_id: string;
}

export const useDirectTeams = () => {
  const { user } = useAuth();
  const { currentCompany } = useDirectCompanies();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      if (!user) {
        logger.log('useDirectTeams: No authenticated user');
        setTeams([]);
        setLoading(false);
        return;
      }

      if (!currentCompany) {
        logger.log('useDirectTeams: No current company selected');
        setTeams([]);
        setLoading(false);
        return;
      }

      try {
        logger.log('useDirectTeams: Fetching teams for company:', currentCompany?.name);
        
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, description, company_id')
          .eq('company_id', currentCompany?.id)
          .order('name');

        if (error) throw error;
        
        // Filter out General team and teams without names, then set state
        const filteredTeams = filterGeneralTeam(data || []).filter(team => team.name?.trim());
        
        logger.log('useDirectTeams: Loaded teams for company:', currentCompany?.name, {
          originalCount: data?.length || 0,
          filteredCount: filteredTeams.length,
          filteredTeams: filteredTeams.map(t => ({ id: t.id, name: t.name }))
        });
        
        setTeams(filteredTeams);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user, currentCompany?.id]);

  return { teams, loading, error };
};
