
import React, { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserTeamsResilient } from '@/hooks/useUserTeamsResilient';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw } from 'lucide-react';
import { BusinessLoading } from '@/components/ui/business-loading';
import { Button } from '@/components/ui/button';
import { NoTeamsEmptyState, NoMetricsEmptyState } from '@/components/ui/specialized-empty-states';

export const MetricsCardResilient: React.FC = () => {
  const { user } = useAuth();
  const { teams, loading: teamsLoading, error: teamsError, refetch: refetchTeams, hasValidTeams } = useUserTeamsResilient();

  // Only fetch metrics if we have valid teams
  const firstTeamId = hasValidTeams ? teams[0]?.id : null;
  const { metrics: allMetrics, loading: metricsLoading } = useWeeklyMetrics(firstTeamId, 'last_3_weeks');

  // Filter to show user's metrics (owner OR assistant) AND formula metrics (regardless of owner)
  const myMetrics = allMetrics.filter(metric => {
    if (!user) return false;
    
    // Always show formula metrics since they can reference other users' metrics
    if (metric.is_formula) {
      return true;
    }
    
    // Show regular metrics owned by current user
    const userEmailPrefix = user.email?.split('@')[0];
    const userEmail = user.email;
    
    const isOwner = metric.owner === userEmailPrefix || 
           metric.owner === userEmail ||
           metric.owner_id === user.id;
    
    // Also show metrics where user is the assistant
    const isAssistant = metric.assistant_id === user.id;
    
    return isOwner || isAssistant;
  });

  // Show loading state
  if (teamsLoading || (hasValidTeams && metricsLoading)) {
    return <BusinessLoading isLoading={true} />;
  }

  // Show error state with retry option
  if (teamsError) {
    return (
      <div className="space-y-4 h-full">
        <div className="flex items-center justify-between">
          <span className="text-sm text-status-error font-medium">
            Error loading teams
          </span>
        </div>
        
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-status-error" />
          <p className="text-sm text-text-secondary mb-4">{teamsError}</p>
          <Button 
            onClick={refetchTeams} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Show no teams state
  if (!hasValidTeams) {
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
        return <TrendingUp className="w-4 h-4 text-status-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-status-error" />;
      default:
        return <Minus className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary font-medium">
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
                className="p-3 bg-surface-card rounded-lg border hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-text-primary text-sm truncate" title={metric.metric_name}>
                    {metric.metric_name}
                  </h4>
                  {renderTrendIcon(trend)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-text-primary">
                    {latestValue} {metric.unit}
                  </span>
                  {metric.target_value && (
                    <span className="text-xs text-text-secondary">
                      Target: {metric.target_value} {metric.unit}
                    </span>
                  )}
                </div>

                {(metric.team_name || teams[0]?.name) && (
                  <div className="mt-2">
                    <span className="text-xs text-text-muted bg-surface-raised px-2 py-1 rounded">
                      {metric.team_name || teams[0]?.name}
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
