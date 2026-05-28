import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface UserTeamsParams {
  userId: string;
  currentCompany: { id: string; name: string } | null;
  toast: ReturnType<typeof useToast>['toast'];
}

export const getUserTeams = async ({ userId, currentCompany, toast }: UserTeamsParams) => {
  try {
    // Step 1: Get team memberships for the user first (much faster)
    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);

    if (membershipError) throw membershipError;

    if (!memberships || memberships.length === 0) {
      return [];
    }

    // Step 2: Get team details for those specific teams, filtered by company
    const teamIds = memberships.map(m => m.team_id);
    
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, description, company_id')
      .in('id', teamIds)
      .eq('company_id', currentCompany?.id);

    if (teamsError) throw teamsError;

    // Step 3: Combine the data
    const result = memberships
      .map(membership => {
        const team = teams?.find(t => t.id === membership.team_id);
        if (!team) return null;
        
        return {
          team_id: team.id,
          teams: {
            id: team.id,
            name: team.name,
            description: team.description,
            company_id: team.company_id
          }
        };
      })
      .filter(Boolean);
    
    return result || [];
  } catch (error) {
    logger.error('userTeamsService: Error fetching user teams:', error);
    toast({
      title: "Error",
      description: "Failed to fetch user teams",
      variant: "destructive",
    });
    return [];
  }
};