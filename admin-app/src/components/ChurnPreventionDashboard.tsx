import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Activity, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { useChurnPreventionAlerts } from '@/hooks/useChurnPreventionAlerts';
import { LoadingState } from '@/components/ui/loading-state';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChurnPreventionDashboardProps {
  className?: string;
}

/**
 * Churn Prevention Dashboard Component
 * 
 * Implements the following features from the "Churn Prevention Features" card:
 * - Alerts for goals without owners
 * - Alerts for overdue tasks
 * - Alerts for metrics not updated recently
 * - Weekly Scorecard with status visual (green/yellow/red)
 * - Health score display
 * - Trend visualization
 */
export const ChurnPreventionDashboard: React.FC<ChurnPreventionDashboardProps> = ({ className }) => {
  const { alerts, scorecard, loading, error, dismissAlert } = useChurnPreventionAlerts();

  const alertsByType = useMemo(() => {
    return {
      ownerless_goals: alerts.filter(a => a.type === 'ownerless_goal'),
      overdue_tasks: alerts.filter(a => a.type === 'overdue_task'),
      stale_metrics: alerts.filter(a => a.type === 'stale_metric')
    };
  }, [alerts]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-error';
  };

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 60) return 'bg-warning/10';
    return 'bg-error/10';
  };

  const getStatusBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <LoadingState text="Loading health metrics..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Scorecard */}
      {scorecard && (
        <Card className={getHealthBgColor(scorecard.healthScore)}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>Weekly Health Scorecard</span>
              <div className="flex items-center gap-2">
                {scorecard.trend === 'up' && (
                  <TrendingUp className="h-5 w-5 text-success" />
                )}
                {scorecard.trend === 'down' && (
                  <TrendingDown className="h-5 w-5 text-error" />
                )}
                {scorecard.trend === 'stable' && (
                  <Activity className="h-5 w-5 text-warning" />
                )}
              </div>
            </CardTitle>
            <CardDescription>Company health at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                <p className={`text-3xl font-bold ${getHealthColor(scorecard.healthScore)}`}>
                  {scorecard.healthScore}%
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Goals w/o Owner
                </p>
                <p className="text-2xl font-bold">{scorecard.goalsWithoutOwner}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" /> Overdue Tasks
                </p>
                <p className="text-2xl font-bold">{scorecard.overdueTasks}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" /> Stale Metrics
                </p>
                <p className="text-2xl font-bold">{scorecard.unupdatedMetrics}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts */}
      {alertsByType.ownerless_goals.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Goals Without Owners
            </CardTitle>
            <CardDescription>These goals need assignment to move forward</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsByType.ownerless_goals.map(alert => (
              <div key={alert.id} className="flex items-start justify-between p-3 rounded border bg-destructive/5">
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
                {alert.actionUrl && (
                  <a href={alert.actionUrl} className="text-xs text-primary hover:underline ml-2">
                    Assign Owner
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warning Alerts */}
      {alertsByType.overdue_tasks.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Overdue Tasks
            </CardTitle>
            <CardDescription>Tasks that need attention to keep momentum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsByType.overdue_tasks.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-start justify-between p-3 rounded border bg-warning/10">
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
                {alert.actionUrl && (
                  <a href={alert.actionUrl} className="text-xs text-primary hover:underline ml-2">
                    View
                  </a>
                )}
              </div>
            ))}
            {alertsByType.overdue_tasks.length > 5 && (
              <p className="text-xs text-muted-foreground p-3">
                +{alertsByType.overdue_tasks.length - 5} more overdue tasks
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Informational Alerts */}
      {alertsByType.stale_metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-info" />
              Metrics Not Updated Recently
            </CardTitle>
            <CardDescription>These metrics haven't been refreshed in 7+ days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertsByType.stale_metrics.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-start justify-between p-3 rounded border bg-info/10">
                <div className="flex-1">
                  <p className="font-medium text-sm">{alert.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                </div>
                {alert.actionUrl && (
                  <a href={alert.actionUrl} className="text-xs text-primary hover:underline ml-2">
                    Update
                  </a>
                )}
              </div>
            ))}
            {alertsByType.stale_metrics.length > 5 && (
              <p className="text-xs text-muted-foreground p-3">
                +{alertsByType.stale_metrics.length - 5} more metrics to update
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {alerts.length === 0 && !error && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Everything looks good!</h3>
            <p className="text-sm text-muted-foreground">
              No churn prevention alerts at this time. Keep monitoring your health score.
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Health metrics are refreshed automatically every 5 minutes
      </p>
    </div>
  );
};

export default ChurnPreventionDashboard;
