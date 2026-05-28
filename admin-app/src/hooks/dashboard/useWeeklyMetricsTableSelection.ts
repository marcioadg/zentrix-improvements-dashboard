
import { useMemo } from 'react';

export const useWeeklyMetricsTableSelection = (
  filteredMetrics: any[],
  selectedMetrics: string[]
) => {
  // Compute selection states
  const allSelected = useMemo(() => 
    filteredMetrics.length > 0 && selectedMetrics.length === filteredMetrics.length,
    [filteredMetrics.length, selectedMetrics.length]
  );

  const someSelected = useMemo(() => 
    selectedMetrics.length > 0 && selectedMetrics.length < filteredMetrics.length,
    [selectedMetrics.length, filteredMetrics.length]
  );

  return {
    allSelected,
    someSelected
  };
};
