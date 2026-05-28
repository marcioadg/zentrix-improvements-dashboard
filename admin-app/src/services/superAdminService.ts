import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Service to check super admin status via company membership
export const checkSuperAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('company_members')
      .select('permission_level')
      .eq('user_id', userId)
      .eq('permission_level', 'super_admin')
      .limit(1);

    if (error) {
      logger.error('Error checking super admin status:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    logger.error('Error in checkSuperAdminStatus:', error);
    return false;
  }
};

// Hook version that can be used in components
export const useSuperAdminStatus = () => {
  // This will be replaced by a proper React Query hook
  // For now, we'll rely on the unified user management system
  return { checkSuperAdminStatus };
};