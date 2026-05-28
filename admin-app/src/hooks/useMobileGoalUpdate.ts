import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { logger } from '@/utils/logger';

export const useMobileGoalUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateGoalStatus = async (
    goalId: string,
    newStatus: string,
    currentProgress: number,
    notes?: string
  ): Promise<boolean> => {
    setIsUpdating(true);
    logger.debug('🎯 Updating goal status:', { goalId, newStatus, currentProgress });

    try {
      // Calculate sync changes (for celebration logic and auto-completion)
      const syncResult = syncProgressFromStatus(newStatus, currentProgress);
      
      // Prepare update data - always include the progress from the slider
      const updateData: any = {
        status: newStatus,
        progress: syncResult.progress !== undefined ? syncResult.progress : currentProgress,
        updated_at: new Date().toISOString()
      };

      logger.debug('📊 Updating goal with progress:', updateData.progress);

      // Update in database
      const { error } = await supabase
        .from('team_goals')
        .update(updateData)
        .eq('id', goalId);

      if (error) {
        logger.error('❌ Failed to update goal status:', error);
        toast({
          variant: "destructive",
          title: "Update failed",
          description: error.message
        });
        return false;
      }

      // Trigger celebration if needed
      if (syncResult.shouldCelebrate) {
        logger.debug('🎉 Triggering celebration!');
        triggerCelebrationSafely();
      }

      // Show success toast
      toast({
        title: "Goal updated",
        description: `Status changed to ${formatStatus(newStatus)}`
      });

      logger.debug('✅ Goal status updated successfully');
      return true;
    } catch (error) {
      logger.error('❌ Error updating goal:', error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update goal status"
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateGoalStatus,
    isUpdating
  };
};

function formatStatus(status: string): string {
  switch (status) {
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'on_track':
      return 'On Track';
    case 'at_risk':
      return 'At Risk';
    case 'off_track':
      return 'Off Track';
    case 'complete':
      return 'Complete';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
}
