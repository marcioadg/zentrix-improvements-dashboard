
import React, { useMemo } from 'react';
import { getCurrentWeekStart } from '@/lib/dateUtils';

export const useWeeklyMetricsTableData = (
  filteredMetrics: any[],
  weekStarts: string[],
  showCurrentWeek: boolean,
  highlightCurrentWeek: boolean,
  weekStartDay: 'monday' | 'sunday',
  overrideHighlightedWeek?: string
) => {
  // Local metrics state for drag operations
  const [localMetrics, setLocalMetrics] = React.useState(filteredMetrics);

  // Update local metrics when filteredMetrics changes
  React.useEffect(() => {
    setLocalMetrics(filteredMetrics);
  }, [filteredMetrics]);

  // Filter week starts based on showCurrentWeek setting
  const filteredWeekStarts = useMemo(() => {
    if (showCurrentWeek) {
      return weekStarts;
    }
    
    // Filter out current week
    const currentWeekStart = getCurrentWeekStart(weekStartDay);
    
    return weekStarts.filter(weekStart => {
      return weekStart !== currentWeekStart;
    });
  }, [weekStarts, showCurrentWeek, weekStartDay]);

  // Determine highlighted week - use override if provided, otherwise find latest week
  const highlightedWeek = useMemo(() => {
    if (!highlightCurrentWeek) return undefined;
    
    // Use override if provided (for grouped periods)
    if (overrideHighlightedWeek) {
      return overrideHighlightedWeek;
    }
    
    // Find the latest (most recent) week from the filtered weeks
    // Week dates are in YYYY-MM-DD format, so we can sort them as strings
    const sortedWeeks = [...filteredWeekStarts].sort((a, b) => b.localeCompare(a));
    
    // Return the latest week (first in descending order)
    return sortedWeeks.length > 0 ? sortedWeeks[0] : undefined;
  }, [filteredWeekStarts, highlightCurrentWeek, overrideHighlightedWeek]);

  // Simple sortable items using metric IDs
  const sortableItems = useMemo(() => {
    return localMetrics.map(metric => metric.id);
  }, [localMetrics]);

  return {
    localMetrics,
    setLocalMetrics,
    filteredWeekStarts,
    highlightedWeek,
    sortableItems
  };
};
