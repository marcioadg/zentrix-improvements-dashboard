
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Company {
  id: string;
  name: string;
}

interface ValidateTeamCompanyParams {
  teamId: string;
  userAccessibleCompanies: Company[];
  userRole?: string;
  toast: ReturnType<typeof useToast>['toast'];
}

export const validateTeamCompany = async ({
  teamId,
  userAccessibleCompanies,
  userRole,
  toast
}: ValidateTeamCompanyParams): Promise<boolean> => {
  try {
    logger.log('🔍 validateTeamCompany: Validating team assignment:', {
      teamId,
      accessibleCompanies: userAccessibleCompanies.map(c => ({ id: c.id, name: c.name })),
      userRole
    });

    // Super admins can assign users to any team across companies
    if (userRole === 'super_admin') {
      logger.log('✅ validateTeamCompany: Super admin - bypassing company validation');
      return true;
    }

    if (!userAccessibleCompanies || userAccessibleCompanies.length === 0) {
      logger.error('❌ validateTeamCompany: No accessible companies');
      toast({
        title: "Error",
        description: "No company access available for team assignment",
        variant: "destructive",
      });
      return false;
    }

    // Get the team's company to validate user has access
    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name, company_id, companies!inner(id, name)')
      .eq('id', teamId)
      .single();

    if (error) {
      logger.error('❌ validateTeamCompany: Error fetching team:', error);
      toast({
        title: "Error",
        description: "Failed to validate team assignment",
        variant: "destructive",
      });
      return false;
    }

    if (!team) {
      logger.error('❌ validateTeamCompany: Team not found');
      toast({
        title: "Error",
        description: "Team not found",
        variant: "destructive",
      });
      return false;
    }

    // Check if user has access to the team's company
    const hasCompanyAccess = userAccessibleCompanies.some(
      company => company.id === team.company_id
    );

    // Fix array access for companies relationship
    const companiesArray = Array.isArray(team.companies) ? team.companies : [team.companies];
    const teamCompany = companiesArray?.[0];
    const teamCompanyName = teamCompany?.name || 'Unknown Company';

    logger.log('🔍 validateTeamCompany: Multi-company access validation:', {
      teamName: team.name,
      teamCompanyId: team.company_id,
      userAccessibleCompanyIds: userAccessibleCompanies.map(c => c.id),
      hasAccess: hasCompanyAccess,
      enforcement: 'MULTI-COMPANY - assignments allowed across accessible companies'
    });

    if (!hasCompanyAccess) {
      logger.error('❌ validateTeamCompany: COMPANY ACCESS VIOLATION - User lacks access to team company');
      toast({
        title: "Access Denied", 
        description: `Cannot assign user to team "${team.name}" in ${teamCompanyName}. You don't have access to this company.`,
        variant: "destructive",
      });
      return false;
    }

    logger.log('✅ validateTeamCompany: Team assignment validation passed - user has company access');
    return true;
  } catch (error) {
    logger.error('❌ validateTeamCompany: Unexpected error:', error);
    toast({
      title: "Error",
      description: "Failed to validate team assignment",
      variant: "destructive",
    });
    return false;
  }
};
