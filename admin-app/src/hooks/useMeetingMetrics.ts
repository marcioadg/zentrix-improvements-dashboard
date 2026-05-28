
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { logger } from '@/utils/logger';

export const useMeetingMetrics = (teamId: string, meetingId?: string) => {
  const { toast } = useToast();
  const weeklyMetrics = useWeeklyMetrics(teamId);

  const handleMetricUpdate = useCallback(async (metricId: string, weekStart: string, value: number) => {
    try {
      await weeklyMetrics.updateMetric(metricId, weekStart, value);
      // Removed success toast - visual feedback from UI update is sufficient
    } catch (error) {
      logger.error('Metric update failed:', error);
      toast({
        title: "Error",
        description: "Failed to update metric",
        variant: "destructive",
      });
    }
  }, [weeklyMetrics.updateMetric, toast]);

  const handleMetricAdd = useCallback(async () => {
    // Removed informational toast - button click provides clear user intent
  }, []);

  const handleMetricDelete = useCallback(async (metric: any) => {
    try {
      await weeklyMetrics.removeMetric(metric.id);
      
      toast({
        title: "Success",
        description: `Metric "${metric.metric_name}" deleted successfully`,
      });
    } catch (error) {
      logger.error('Metric delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete metric",
        variant: "destructive",
      });
    }
  }, [weeklyMetrics.removeMetric, toast]);

  const handleBulkDelete = useCallback(async () => {
    // Removed instructional toast - UI should be self-explanatory
  }, []);

  return {
    ...weeklyMetrics,
    handleMetricUpdate,
    handleMetricAdd,
    handleMetricDelete,
    handleBulkDelete,
  };
};
