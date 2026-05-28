
import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useWeeklyMetricsData } from '@/hooks/useWeeklyMetricsData';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BusinessLoading } from '@/components/ui/business-loading';
import { getWeekStarts } from '@/utils/dateUtils';
import { NoTeamsEmptyState, NoMetricsEmptyState } from '@/components/ui/specialized-empty-states';

export const MetricsCard: React.FC = () => {
  const { user } = useAuth();
  const { teams } = useUserTeams();
  const weekStarts = getWeekStarts(3); // Last 3 weeks

  // Get all metrics for the first team only to avoid hook rules violations
  // TODO: This is a temporary fix - we should refactor to handle multiple teams properly
  const firstTeamId = teams[0]?.id;
  const { metrics: firstTeamMetrics, loading } = useWeeklyMetricsData(firstTeamId || '', weekStarts);

  // For now, we'll just show metrics from the first team
  // In a future refactor, we should use a different approach to handle multiple teams
  const allMetrics = useMemo(() => {
    if (!firstTeamId || !firstTeamMetrics) return [];
    
    return firstTeamMetrics.map(metric => ({
      ...metric,
      teamName: teams[0]?.name || 'Unknown Team'
    }));
  }, [firstTeamMetrics, firstTeamId, teams]);

  // Filter to only metrics owned by current user - use email and available owner field
  const myMetrics = allMetrics.filter(metric => {
    if (!user) return false;
    
    // Check if the owner field matches user's email prefix or full email
    const userEmailPrefix = user.email?.split('@')[0];
    const userEmail = user.email;
    
    return metric.owner === userEmailPrefix || 
           metric.owner === userEmail ||
           metric.owner === user.id;
  });

  if (loading) {
    return <BusinessLoading isLoading={loading} />;
  }

  // Guard when user has no teams
  if (!firstTeamId) {
    return <NoTeamsEmptyState />;
  }

  const getMetricTrend = (weeklyValues: Record<string, number>) => {
    const values = Object.values(weeklyValues).filter(v => v !== null && v !== undefined);
    if (values.length < 2) return null;
    
    const current = values[values.length - 1];
    const previous = values[values.length - 2];
    
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'same';
  };

  const renderTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-error" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">
          {myMetrics.length} metrics
        </span>
      </div>

      <div className="space-y-3 overflow-auto max-h-[300px]">
        {myMetrics.length === 0 ? (
          <NoMetricsEmptyState />
        ) : (
          myMetrics.map((metric, index) => {
            const trend = getMetricTrend(metric.weeklyValues);
            
            // Get most recent past/current week with actual data
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const pastWeeks = Object.entries(metric.weeklyValues)
              .filter(([weekStart]) => {
                const weekDate = new Date(weekStart);
                weekDate.setHours(0, 0, 0, 0);
                return weekDate <= today;
              })
              .sort(([a], [b]) => b.localeCompare(a));
            
            const latestEntry = pastWeeks.find(([, value]) => value !== null && value !== undefined);
            const latestValue = latestEntry ? latestEntry[1] : 0;

            return (
              <div
                key={`${metric.id}-${index}`}
                className="p-3 bg-background rounded-lg border hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground text-sm truncate" title={metric.metric_name}>
                    {metric.metric_name}
                  </h4>
                  {renderTrendIcon(trend)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">
                    {latestValue} {metric.unit}
                  </span>
                  {metric.target_value && (
                    <span className="text-xs text-muted-foreground">
                      Target: {metric.target_value} {metric.unit}
                    </span>
                  )}
                </div>

                {metric.teamName && (
                  <div className="mt-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {metric.teamName}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
