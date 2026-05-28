
import React, { useState, memo, useMemo, useCallback } from 'react';
import { useMetricsSectionState } from '@/hooks/useMetricsSectionState';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { MetricsSectionContent } from './MetricsSectionContent';
import { TimePeriodSelector } from './TimePeriodSelector';
import { UserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { logger } from '@/utils/logger';

interface MetricsSectionProps {
  selectedTeam?: string;
  onTeamChange?: (teamId: string) => void;
  onAddMetric?: () => void;
  managementMode?: boolean;
  onManagementModeChange?: (mode: boolean) => void;
  selectedMetrics?: string[];
  onSelectedMetricsChange?: (metrics: string[]) => void;
  onDeleteMetric?: (metric: any) => void;
  onBulkDelete?: () => void;
  onRefetch?: (refetchFn: () => void) => void;
  userSettings: UserSettings;
  updateMetricsSettings: (updates: {
    highlight_current_week?: boolean;
    show_current_week?: boolean;
    week_start_day?: 'monday' | 'sunday';
  }) => Promise<boolean>;
}

const MetricsSection = memo((props: MetricsSectionProps) => {
  // Validate essential props
  if (!props.selectedTeam) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Please select a team to view metrics</p>
      </div>
    );
  }

  if (!props.userSettings) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">
          <div className="h-4 bg-secondary rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-secondary rounded w-1/2 mx-auto mt-2"></div>
        </div>
      </div>
    );
  }

  // State for time period selection
  const [timePeriod, setTimePeriod] = useState<string>('last_13_weeks');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Get metrics data and all functions from useWeeklyMetrics
  const {
    metrics,
    loading,
    error,
    getLast13WeeksStartDates,
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    refetch
  } = useWeeklyMetrics(props.selectedTeam, timePeriod, customDateRange || undefined);

  // Get week starts based on user settings and selected time period
  const allWeekStarts = useMemo(() => 
    getLast13WeeksStartDates(props.userSettings.week_start_day),
    [getLast13WeeksStartDates, props.userSettings.week_start_day]
  );
  
  // Filter out current week if user setting is disabled
  const weekStarts = useMemo(() => 
    props.userSettings.show_current_week 
      ? allWeekStarts 
      : allWeekStarts.slice(1), // Remove the first (current) week
    [props.userSettings.show_current_week, allWeekStarts]
  );

  // Get state from useMetricsSectionState
  const state = useMetricsSectionState(
    metrics,
    weekStarts,
    timePeriod,
    customDateRange,
    props.userSettings.show_current_week,
    props.userSettings.highlight_current_week,
    props.userSettings.week_start_day
  );

  // Pass refetch function to parent when it becomes available
  React.useEffect(() => {
    if (props.onRefetch && refetch) {
      props.onRefetch(refetch);
    }
  }, [props.onRefetch, refetch]);

  // Memoize the time period change handler
  const handlePeriodChange = useCallback((period: string) => {
    setTimePeriod(period);
  }, []);

  // Memoize the date range change handler
  const handleDateRangeChange = useCallback((range: { start: Date; end: Date } | null) => {
    setCustomDateRange(range);
  }, []);

  // Add missing handler functions
  const handleMetricConfiguration = useCallback((metric: any) => {
    logger.debug('Metric configuration requested', { metricId: metric?.id });
    // This would typically open a configuration modal
    // For now, we'll just log it
  }, []);

  const handleMetricSelect = useCallback((metricId: string, selected: boolean) => {
    logger.debug('Metric selection changed', { metricId, selected });
    if (props.onSelectedMetricsChange) {
      const currentSelected = props.selectedMetrics || [];
      if (selected) {
        props.onSelectedMetricsChange([...currentSelected, metricId]);
      } else {
        props.onSelectedMetricsChange(currentSelected.filter(id => id !== metricId));
      }
    }
  }, [props.selectedMetrics, props.onSelectedMetricsChange]);

  const handleSelectAll = useCallback((selected: boolean) => {
    logger.debug('Select all metrics', { selected });
    if (props.onSelectedMetricsChange) {
      if (selected) {
        const allMetricIds = metrics.map(metric => metric.id);
        props.onSelectedMetricsChange(allMetricIds);
      } else {
        props.onSelectedMetricsChange([]);
      }
    }
  }, [metrics, props.onSelectedMetricsChange]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading metrics...</p>
        <div className="animate-pulse mt-4">
          <div className="h-4 bg-secondary rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-secondary rounded w-1/2 mx-auto mt-2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Error loading metrics: {error}</p>
        <p className="text-xs text-muted-foreground mt-2">Team ID: {props.selectedTeam}</p>
        <p className="text-xs text-muted-foreground">Management Mode: {props.managementMode ? 'Yes' : 'No'}</p>
        <Button
          variant="default"
          className="mt-4"
          onClick={() => refetch && refetch()}
        >
          Retry Loading Metrics
        </Button>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No metrics found for this team</p>
        <p className="text-xs text-muted-foreground mt-2">Team ID: {props.selectedTeam}</p>
        <p className="text-xs text-muted-foreground">Management Mode: {props.managementMode ? 'Yes' : 'No'}</p>
        {props.managementMode && (
          <Button
            variant="success"
            className="mt-4"
            onClick={props.onAddMetric}
          >
            Add First Metric
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="mb-6">
        <TimePeriodSelector
          selectedPeriod={timePeriod}
          onPeriodChange={handlePeriodChange}
          customDateRange={customDateRange}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      <MetricsSectionContent
        filteredMetrics={state.filteredMetrics}
        weekStarts={state.weekStarts}
        editingCell={state.editingCell}
        setEditingCell={state.setEditingCell}
        editValue={state.editValue}
        setEditValue={state.setEditValue}
        updateMetric={updateMetric}
        onMetricConfiguration={handleMetricConfiguration}
        formatValue={state.formatValue}
        formatWeekDate={state.formatWeekDate}
        getValueColor={state.getValueColor}
        getOwnerInitials={state.getOwnerInitials}
        selectedTeam={props.selectedTeam}
        showCurrentWeek={props.userSettings.show_current_week}
        highlightCurrentWeek={props.userSettings.highlight_current_week}
        weekStartDay={props.userSettings.week_start_day}
        managementMode={props.managementMode || false}
        selectedMetrics={props.selectedMetrics || []}
        onMetricSelect={handleMetricSelect}
        onSelectAll={handleSelectAll}
        onDeleteMetric={props.onDeleteMetric || (() => {})}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.selectedTeam === nextProps.selectedTeam &&
    prevProps.managementMode === nextProps.managementMode &&
    prevProps.selectedMetrics?.length === nextProps.selectedMetrics?.length &&
    prevProps.userSettings.highlight_current_week === nextProps.userSettings.highlight_current_week &&
    prevProps.userSettings.show_current_week === nextProps.userSettings.show_current_week &&
    prevProps.userSettings.week_start_day === nextProps.userSettings.week_start_day
  );
});

MetricsSection.displayName = 'MetricsSection';

export { MetricsSection };
