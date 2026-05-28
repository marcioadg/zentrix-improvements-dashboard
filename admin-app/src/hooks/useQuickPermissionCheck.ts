import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiCompany } from '@/contexts/MultiCompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export const useQuickPermissionCheck = () => {
  const { user } = useAuth();
  const { currentCompany } = useMultiCompany();
  const [hasBasicAccess, setHasBasicAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => user?.id, [user?.id]);
  const companyId = useMemo(() => currentCompany?.id, [currentCompany?.id]);

  useEffect(() => {
    const checkBasicAccess = async () => {
      if (!userId || !companyId) {
        setHasBasicAccess(false);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Quick check: Get user's permission level from company membership
        const { data: companyMember, error } = await supabase
          .from('company_members')
          .select('permission_level')
          .eq('user_id', userId)
          .eq('company_id', companyId)
          .single();

        if (error) {
          logger.error('Quick permission check error:', error);
          setHasBasicAccess(false);
          setLoading(false);
          return;
        }

        const permissionLevel = companyMember?.permission_level;
        
        // For analyzer, only allow manager, director, or super_admin
        const allowedLevels = ['manager', 'director', 'super_admin'];
        const hasAccess = allowedLevels.includes(permissionLevel || '');
        
        logger.log('🚀 Quick permission check:', {
          userId,
          companyId,
          permissionLevel,
          hasAccess
        });

        setHasBasicAccess(hasAccess);
      } catch (error) {
        logger.error('Quick permission check failed:', error);
        setHasBasicAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkBasicAccess();
  }, [userId, companyId]);

  return {
    hasBasicAccess,
    loading,
    userId,
    companyId
  };
};