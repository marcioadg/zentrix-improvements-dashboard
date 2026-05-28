
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CompanyMembership {
  id: string;
  name: string;
  role: string;
}

export const useUserCompanyMemberships = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompanyAccess();
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemberships = async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    try {
      // Get user's permission level from company_members
      if (currentCompany) {
        const { data: companyMembership } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', user.id)
          .eq('company_id', currentCompany?.id)
          .limit(1)
          .single();

        setMemberships([{
          id: currentCompany?.id,
          name: currentCompany?.name,
          role: companyMembership?.permission_level || 'member'
        }]);
      } else {
        setMemberships([]);
      }
    } catch (error) {
      logger.error('Error fetching company memberships:', error);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [user, currentCompany]);

  return {
    memberships,
    companies: memberships, // For compatibility
    loading,
    refetch: fetchMemberships,
  };
};
