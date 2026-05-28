import React from 'react';
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SimpleMetricsDisplayProps {
  teamId: string;
  timePeriod?: string;
}

/**
 * Example component showing how to use useUnifiedMetrics hook
 * Use this as a template for new metrics features
 */
export const SimpleMetricsDisplay: React.FC<SimpleMetricsDisplayProps> = ({
  teamId,
  timePeriod = 'last_13_weeks'
}) => {
  const { 
    metrics, 
    loading, 
    error, 
    refetch,
    debugInfo 
  } = useUnifiedMetrics({
    teamId,
    timePeriod,
    enabled: !!teamId
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading metrics...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive">
            Error: {error}
            <button 
              onClick={refetch}
              className="ml-2 text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Metrics ({metrics.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {metrics.map(metric => (
            <div key={metric.id} className="p-2 border rounded">
              <div className="font-medium">{metric.metric_name}</div>
              <div className="text-sm text-muted-foreground">
                Owner: {metric.owner} | Unit: {metric.unit}
              </div>
            </div>
          ))}
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-xs">
            <summary>Debug Info</summary>
            <pre className="mt-2 p-2 bg-muted rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};