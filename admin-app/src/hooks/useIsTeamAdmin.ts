
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useIsTeamAdmin = (teamId?: string) => {
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  useEffect(() => {
    const checkTeamAdmin = async () => {
      if (!user?.id || !teamId || !currentCompany?.id) {
        setIsTeamAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check global super admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'super_admin') {
          setIsTeamAdmin(true);
          setLoading(false);
          return;
        }

        // Check company-level management permission (this now determines team admin status)
        const { data: companyMember } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', user.id)
          .eq('company_id', currentCompany?.id)
          .eq('status', 'active')
          .single();

        // Only director and manager have team admin privileges
        if (companyMember?.permission_level && 
            ['director', 'manager'].includes(companyMember.permission_level)) {
          setIsTeamAdmin(true);
        } else {
          setIsTeamAdmin(false);
        }

      } catch (error) {
        logger.error('Error checking team admin status:', error);
        setIsTeamAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkTeamAdmin();
  }, [user?.id, teamId, currentCompany?.id]);

  return { isTeamAdmin, loading };
};
