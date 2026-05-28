
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

export const logTablePropsCheck = (props: any) => {
  logger.log('🔍 WeeklyMetricsTable props check:', {
    metricsCount: props.filteredMetrics?.length || 0,
    weekStartsCount: props.weekStarts?.length || 0,
    managementMode: props.managementMode,
    selectedMetricsCount: props.selectedMetrics?.length || 0,
    editingCell: props.editingCell,
    showCurrentWeek: props.showCurrentWeek,
    highlightCurrentWeek: props.highlightCurrentWeek,
    weekStartDay: props.weekStartDay,
    hasHandlers: !!(props.onCellEdit && props.onCellSave && props.onCellCancel),
    timestamp: Date.now()
  });
};

export const sortMetricsByName = (metrics: WeeklyMetricWithOwner[]): WeeklyMetricWithOwner[] => {
  return [...metrics].sort((a, b) => a.metric_name.localeCompare(b.metric_name));
};

export const filterMetricsBySearch = (metrics: WeeklyMetricWithOwner[], searchText: string): WeeklyMetricWithOwner[] => {
  if (!searchText.trim()) return metrics;
  
  const searchLower = searchText.toLowerCase();
  return metrics.filter(metric => 
    metric.metric_name.toLowerCase().includes(searchLower) ||
    (metric.owner && metric.owner.toLowerCase().includes(searchLower))
  );
};
