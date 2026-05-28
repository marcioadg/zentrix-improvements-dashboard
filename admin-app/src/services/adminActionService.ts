
import { supabase } from '@/integrations/supabase/client';
import type { AdminAction } from '@/types/superAdmin';
import { logger } from '@/utils/logger';

export const loadAdminActions = async (): Promise<AdminAction[]> => {
  try {
    const { data, error } = await supabase
      .from('admin_actions')
      .select(`
        *,
        admin_user:profiles!admin_user_id(full_name),
        affected_user:profiles!user_affected_id(full_name),
        company:companies!company_id(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.warn('Error loading admin actions:', error);
      return [];
    }
    
    // Transform the data to flatten the joined fields
    return (data || []).map(action => ({
      ...action,
      admin_user_name: action.admin_user?.full_name || 'Unknown User',
      affected_user_name: action.affected_user?.full_name || undefined,
      company_name: action.company?.name || undefined
    }));
  } catch (error) {
    logger.warn('Error loading admin actions:', error);
    return [];
  }
};

export const logAdminAction = async (
  actionType: string,
  description: string,
  details?: any,
  targetType?: string,
  targetId?: string,
  companyId?: string,
  userAffectedId?: string,
  success: boolean = true
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('admin_actions')
      .insert({
        admin_user_id: user.id,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        description,
        details,
        company_id: companyId,
        user_affected_id: userAffectedId,
        success
      });
  }
};

export const logAccessDenied = async (
  description: string,
  targetType?: string,
  targetId?: string,
  companyId?: string,
  details?: any
) => {
  await logAdminAction(
    'access_denied',
    description,
    details,
    targetType,
    targetId,
    companyId,
    undefined,
    false
  );
};
