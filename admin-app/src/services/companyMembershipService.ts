
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface CompanyMembership {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  joined_at: string;
  is_primary?: boolean;
  company?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface UserCompanyMembershipsParams {
  userId: string;
  toast: ReturnType<typeof useToast>['toast'];
}

export const getUserCompanyMemberships = async ({ userId, toast }: UserCompanyMembershipsParams): Promise<CompanyMembership[]> => {
  try {
    logger.log('companyMembershipService: Loading memberships for user (company_members):', userId);

    const { data, error } = await supabase
      .from('company_members')
      .select(`
        id,
        user_id,
        company_id,
        permission_level,
        joined_at,
        status,
        companies:company_id (
          id,
          name,
          slug
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;

    const memberships: CompanyMembership[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      role: row.permission_level,
      joined_at: row.joined_at,
      company: row.companies ? { id: row.companies.id, name: row.companies.name, slug: row.companies.slug } : undefined,
      is_primary: false,
    }));

    logger.log('companyMembershipService: Final memberships (company_members):', memberships);
    return memberships;
  } catch (error) {
    logger.error('companyMembershipService: Error fetching user company memberships:', error);
    toast({
      title: 'Error',
      description: 'Failed to fetch user company memberships',
      variant: 'destructive',
    });
    return [];
  }
};

// Helper function to rank permission levels
function getPermissionLevel(level: string): number {
  const levels = {
    'view-only': 0,
    'member': 1,
    'manager': 2,
    'director': 3,
    'admin': 4,
    'owner': 5,
    'super_admin': 6
  };
  return levels[level as keyof typeof levels] || 0;
}

export const updateUserCompanyMemberships = async (
  userId: string,
  selectedCompanyIds: string[],
  currentMemberships: CompanyMembership[]
): Promise<boolean> => {
  try {
    logger.log('companyMembershipService: Updating company memberships via company_members:', {
      userId,
      selectedCompanyIds,
      currentMembershipIds: currentMemberships.map(m => m.company_id)
    });

    const currentCompanyIds = currentMemberships.map(m => m.company_id);
    const toAdd = selectedCompanyIds.filter(id => !currentCompanyIds.includes(id));
    const toRemove = currentCompanyIds.filter(id => !selectedCompanyIds.includes(id));

    logger.log('companyMembershipService: Changes to make:', { toAdd, toRemove });

    // Add new memberships directly in company_members
    if (toAdd.length > 0) {
      const nowIso = new Date().toISOString();
      const newRows = toAdd.map(companyId => ({
        user_id: userId,
        company_id: companyId,
        permission_level: 'member',
        status: 'active',
        joined_at: nowIso,
        updated_at: nowIso,
      }));

      const { error: insertError } = await supabase
        .from('company_members')
        .insert(newRows);
      if (insertError) {
        logger.error('companyMembershipService: Error adding company_members:', insertError);
        throw insertError;
      }
    }

    // Remove memberships from company_members
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('company_members')
        .delete()
        .eq('user_id', userId)
        .in('company_id', toRemove);
      if (deleteError) {
        logger.error('companyMembershipService: Error removing company_members:', deleteError);
        throw deleteError;
      }
    }

    logger.log('companyMembershipService: Company memberships updated successfully');
    return true;
  } catch (error) {
    logger.error('companyMembershipService: Failed to update company memberships:', error);
    throw error;
  }
};
