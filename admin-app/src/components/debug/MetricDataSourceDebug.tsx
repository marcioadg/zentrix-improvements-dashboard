
import React from 'react';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useOptimizedMetricsData } from '@/hooks/useOptimizedMetricsData';
import { useMetricsData } from '@/hooks/useMetricsData';
import { logger } from '@/utils/logger';

interface MetricDataSourceDebugProps {
  selectedTeam: string;
  timePeriod?: string;
}

export const MetricDataSourceDebug: React.FC<MetricDataSourceDebugProps> = ({
  selectedTeam,
  timePeriod = 'last_13_weeks'
}) => {
  logger.log('🔍 MetricDataSourceDebug - Investigating data sources for team:', selectedTeam);

  // Test all three data hooks to see which one is being used
  const weeklyMetricsResult = useWeeklyMetrics(selectedTeam, timePeriod);
  const optimizedMetricsResult = useOptimizedMetricsData(selectedTeam, timePeriod);
  const metricsDataResult = useMetricsData(selectedTeam, timePeriod);

  const debugData = {
    selectedTeam,
    timePeriod,
    hooks: {
      useWeeklyMetrics: {
        metricsCount: weeklyMetricsResult.metrics?.length || 0,
        loading: weeklyMetricsResult.loading,
        error: weeklyMetricsResult.error,
        sampleMetrics: weeklyMetricsResult.metrics?.slice(0, 3).map(m => ({
          id: m.id,
          metric_name: m.metric_name,
          owner_id: m.owner_id,
          hasTestPrefix: m.id?.startsWith('test-') || false
        })) || []
      },
      useOptimizedMetricsData: {
        metricsCount: optimizedMetricsResult.metrics?.length || 0,
        loading: optimizedMetricsResult.loading,
        error: optimizedMetricsResult.error,
        sampleMetrics: optimizedMetricsResult.metrics?.slice(0, 3).map(m => ({
          id: m.id,
          metric_name: m.metric_name,
          owner_id: m.owner_id,
          hasTestPrefix: m.id?.startsWith('test-') || false
        })) || []
      },
      useMetricsData: {
        metricsCount: metricsDataResult.metrics?.length || 0,
        loading: metricsDataResult.loading,
        error: metricsDataResult.error,
        sampleMetrics: metricsDataResult.metrics?.slice(0, 3).map(m => ({
          id: m.id,
          metric_name: m.metric_name,
          owner_id: m.owner_id,
          hasTestPrefix: m.id?.startsWith('test-') || false
        })) || []
      }
    }
  };

  logger.log('🔍 Complete data source analysis:', debugData);

  return (
    <div className="p-4 bg-destructive/5 border-2 border-red-200 rounded-lg mb-4">
      <h3 className="font-bold text-red-800 mb-2">🔍 Metric Data Source Debug</h3>
      <div className="text-xs space-y-2">
        <div><strong>Team:</strong> {selectedTeam}</div>
        <div><strong>Time Period:</strong> {timePeriod}</div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {Object.entries(debugData.hooks).map(([hookName, data]) => (
            <div key={hookName} className="bg-white p-2 rounded border">
              <div className="font-semibold text-sm mb-1">{hookName}</div>
              <div>Count: {data.metricsCount}</div>
              <div>Loading: {data.loading ? 'Yes' : 'No'}</div>
              <div>Error: {data.error ? 'Yes' : 'No'}</div>
              <div className="mt-2">
                <div className="text-xs font-medium">Sample IDs:</div>
                {data.sampleMetrics.map((metric, idx) => (
                  <div key={idx} className={`text-xs ${metric.hasTestPrefix ? 'text-destructive font-bold' : 'text-success'}`}>
                    {metric.id} {metric.hasTestPrefix && '← TEST ID!'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-2 bg-warning/10 rounded">
          <strong>Analysis:</strong> 
          {debugData.hooks.useWeeklyMetrics.sampleMetrics.some(m => m.hasTestPrefix) && 
            <span className="text-destructive"> ⚠️ useWeeklyMetrics has test IDs!</span>
          }
          {debugData.hooks.useOptimizedMetricsData.sampleMetrics.some(m => m.hasTestPrefix) && 
            <span className="text-destructive"> ⚠️ useOptimizedMetricsData has test IDs!</span>
          }
          {debugData.hooks.useMetricsData.sampleMetrics.some(m => m.hasTestPrefix) && 
            <span className="text-destructive"> ⚠️ useMetricsData has test IDs!</span>
          }
        </div>
      </div>
    </div>
  );
};
