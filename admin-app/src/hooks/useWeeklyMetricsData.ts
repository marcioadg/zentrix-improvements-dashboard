
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUserTeams } from '@/hooks/useUserTeams';
import { logger } from '@/utils/logger';

export interface WeeklyMetricWithOwner {
  id: string;
  metric_name: string;
  owner?: string;
  unit: string;
  target_value?: number;
  target_logic?: string;
  weeklyValues: Record<string, number>;
}

export const useWeeklyMetricsData = (teamId: string, weekStarts: string[]) => {
  const [metrics, setMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { teams } = useUserTeams();

  const loadMetrics = async () => {
    if (!teamId || weekStarts.length === 0) {
      setMetrics([]);
      setLoading(false);
      return;
    }

    // Validate user belongs to the team
    const userTeamIds = teams.map(t => t.id);
    if (!userTeamIds.includes(teamId)) {
      logger.log('useWeeklyMetricsData: User does not belong to team:', teamId);
      setMetrics([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      logger.log('Loading metrics for team:', teamId, 'weeks:', weekStarts);

      const { data: metricsData, error } = await supabase
        .from('weekly_metrics')
        .select(`
          *,
          owner:profiles!weekly_metrics_owner_id_fkey(full_name)
        `)
        .eq('team_id', teamId)
        .in('week_start_date', weekStarts);

      if (error) throw error;

      // Group metrics by name and owner
      const groupedMetrics = new Map<string, WeeklyMetricWithOwner>();

      metricsData?.forEach((metric) => {
        const key = `${metric.metric_name}-${metric.owner_id}`;
        
        if (!groupedMetrics.has(key)) {
          groupedMetrics.set(key, {
            id: metric.id,
            metric_name: metric.metric_name,
            owner: metric.owner?.full_name || 'Unknown',
            unit: metric.unit,
            target_value: metric.target_value,
            target_logic: metric.target_logic,
            weeklyValues: {},
          });
        }

        const groupedMetric = groupedMetrics.get(key)!;
        groupedMetric.weeklyValues[metric.week_start_date] = metric.metric_value;
      });

      setMetrics(Array.from(groupedMetrics.values()));
    } catch (error) {
      logger.error('Error loading metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load metrics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [teamId, weekStarts.join(','), teams]);

  return {
    metrics,
    loading,
    refetch: loadMetrics,
  };
};
