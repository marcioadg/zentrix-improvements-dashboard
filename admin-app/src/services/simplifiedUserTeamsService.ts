
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface SimpleTeam {
  id: string;
  name: string;
  description: string;
  company_id: string;
}

export const getSimplifiedUserTeams = async (userId: string, companyId: string) => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams:team_id!inner (
          id,
          name,
          description,
          company_id
        )
      `)
      .eq('user_id', userId)
      .eq('teams.company_id', companyId);

    if (error) throw error;
    
    return data || [];
  } catch (error) {
    logger.error('Error fetching simplified user teams:', error);
    return [];
  }
};
