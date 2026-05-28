
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';
import { logger } from '@/utils/logger';

// Clean metric ID by removing test prefix
const cleanId = (id: string): string => {
  return id ? id.replace(/^test-/, '') : id;
};

export const useMetricsUpdater = () => {
  const { toast } = useToast();

  const updateMetricOwner = useCallback(async (metricId: string, newOwnerId: string | null) => {
    logger.log('🔄 Starting metric owner update:', { metricId, newOwnerId });

    try {
      // Clean the ID to remove test prefix
      const cleanedId = cleanId(metricId);
      logger.log('Using cleaned ID:', { original: metricId, cleaned: cleanedId });

      // First, get the metric details from the metrics table
      const { data: metricInfo, error: fetchError } = await supabase
        .from('metrics')
        .select('metric_name, owner_id, team_id')
        .eq('id', cleanedId)
        .single();

      if (fetchError) {
        logger.error('Failed to fetch metric info:', fetchError);
        throw fetchError;
      }

      logger.log('Updating all entries for metric:', { 
        metricName: metricInfo.metric_name, 
        originalOwner: metricInfo.owner_id,
        newOwner: newOwnerId,
        teamId: metricInfo.team_id
      });

      // STEP 1: Update parent metrics table first
      logger.log('🔧 Updating parent metrics table');
      const { error: metricsUpdateError } = await supabase
        .from('metrics')
        .update({ 
          owner_id: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', cleanedId)
        .is('deleted_at', null);

      if (metricsUpdateError) {
        logger.error('❌ Failed to update parent metrics table:', metricsUpdateError);
        throw metricsUpdateError;
      }

      logger.log('✅ Parent metrics table updated successfully');

      // STEP 2: Update ALL weekly entries using metric_id
      const { data, error } = await supabase
        .from('weekly_metrics')
        .update({ 
          owner_id: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('metric_id', cleanedId)
        .is('deleted_at', null)
        .select('id, metric_name, owner_id, week_start_date');

      if (error) {
        logger.error('Database update failed:', error);
        throw error;
      }

      logger.log('✅ Update successful - updated', data?.length || 0, 'metric entries:', data);
      
      toast({
        title: "Success",
        description: `Metric owner updated successfully (${data?.length || 0} entries updated)`,
      });

      return data;
    } catch (error: any) {
      logger.error('❌ Update failed:', error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to update metric owner",
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  return { updateMetricOwner };
};
