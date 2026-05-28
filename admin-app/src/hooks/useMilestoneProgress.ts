import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Add function to update milestone progress
export const updateMilestoneProgress = async (milestoneId: string, progress: number) => {
  try {
    logger.log('🎯 Updating milestone progress:', { milestoneId, progress });
    
    const { data, error } = await supabase
      .from('goal_milestones')
      .update({ progress })
      .eq('id', milestoneId)
      .select('*');

    if (error) {
      logger.error('❌ Milestone update error:', error);
      throw error;
    }
    
    logger.log('✅ Milestone updated successfully:', data);
    return true;
  } catch (error) {
    logger.error('❌ Failed to update milestone progress:', error);
    return false;
  }
};