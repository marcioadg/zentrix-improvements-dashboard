/**
 * Hook to check if current user can end a meeting
 * Permissions: Scriber OR Director-level and above (director, admin, owner, super_admin)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useCanEndMeeting = (scriberId?: string | null) => {
  const [canEnd, setCanEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();

  useEffect(() => {
    const checkPermission = async () => {
      if (!user?.id) {
        setCanEnd(false);
        setLoading(false);
        return;
      }

      try {
        // Check 1: Is user the scriber?
        if (scriberId && user.id === scriberId) {
          setCanEnd(true);
          setLoading(false);
          return;
        }

        // Check 2: Is user a super admin?
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'super_admin') {
          setCanEnd(true);
          setLoading(false);
          return;
        }

        // Check 3: Is user director-level or above in the company?
        if (!currentCompany?.id) {
          setCanEnd(false);
          setLoading(false);
          return;
        }

        const { data: companyMember } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', user.id)
          .eq('company_id', currentCompany?.id)
          .eq('status', 'active')
          .single();

        // Director-level and above: director, admin, owner, super_admin
        const directorOrAbove = ['director', 'admin', 'owner', 'super_admin'].includes(
          companyMember?.permission_level || ''
        );

        setCanEnd(directorOrAbove);

      } catch (error) {
        logger.error('Error checking meeting end permission:', error);
        setCanEnd(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [user?.id, scriberId, currentCompany?.id]);

  return { canEnd, loading };
};
