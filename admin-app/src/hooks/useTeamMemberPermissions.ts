import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useTeamMemberPermissions = (teamId?: string) => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [canRemoveMembers, setCanRemoveMembers] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || !teamId || !currentCompany?.id) {
        setCanRemoveMembers(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Check global super admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'super_admin') {
          setCanRemoveMembers(true);
          setLoading(false);
          return;
        }

        // Check company-wide management permission
        const { data: companyMember } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', user.id)
          .eq('company_id', currentCompany?.id)
          .eq('status', 'active')
          .single();

        if (companyMember?.permission_level && 
            ['director', 'manager'].includes(companyMember.permission_level)) {
          setCanRemoveMembers(true);
        } else {
          setCanRemoveMembers(false);
        }

      } catch (error) {
        logger.error('Error checking team member permissions:', error);
        setCanRemoveMembers(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [user?.id, teamId, currentCompany?.id]);

  return { canRemoveMembers, loading };
};