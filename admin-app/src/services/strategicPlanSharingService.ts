import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class StrategicPlanSharingService {
  static async updatePlanSharing(planId: string, companyShared: boolean): Promise<void> {
    const { error } = await supabase
      .from('strategic_plans')
      .update({ 
        company_shared: companyShared,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      logger.error('Error updating plan sharing:', error);
      throw new Error('Failed to update plan sharing settings');
    }
  }

  static async getPlanSharingStatus(planId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('strategic_plans')
      .select('company_shared')
      .eq('id', planId)
      .single();

    if (error) {
      logger.error('Error getting plan sharing status:', error);
      return false;
    }

    return data?.company_shared || false;
  }

  static async updatePlanTitle(planId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('strategic_plans')
      .update({ 
        title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      logger.error('Error updating plan title:', error);
      throw new Error('Failed to update plan title');
    }
  }
}