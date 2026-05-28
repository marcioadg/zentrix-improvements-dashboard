
import { useState, useCallback, useMemo } from 'react';
import { formatWeekDate, getOwnerInitials, checkTargetCondition } from '@/utils/metricUtils';
import { getCurrentWeekStart } from '@/lib/weekUtils';

export const useMetricsSectionState = (
  metrics: any[],
  weekStarts: string[],
  timePeriod: string,
  customDateRange: { start: Date; end: Date } | null,
  showCurrentWeek: boolean,
  highlightCurrentWeek: boolean,
  weekStartDay: 'monday' | 'sunday'
) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricUnit, setNewMetricUnit] = useState('number');
  const [newMetricOwner, setNewMetricOwner] = useState('');
  const [newMetricTarget, setNewMetricTarget] = useState('');

  // Updated to return background color classes instead of text color
  const getValueColor = useCallback((value: number | null, metric: any): string => {
    if (value == null) {
      return 'text-gray-400';
    }
    
    if (metric.target_value == null) {
      return 'text-black';
    }

    const targetValue = Number(metric.target_value);
    const numericValue = Number(value);
    const targetLogic = metric.target_logic || 'greater_than_or_equal';

    // Use the utility function to check if target condition is met
    const meetsTarget = checkTargetCondition(numericValue, targetValue, targetLogic);
    
    // On target: green background. Off target: red background.
    return meetsTarget
      ? 'text-foreground metric-on-target'
      : 'text-foreground metric-off-target';
  }, []);

  const formatValue = useCallback((value: number | null, unit: string): string => {
    if (value == null) {
      return '-';
    }
    
    // Check if the number has decimal places
    const hasDecimals = value % 1 !== 0;

    switch (unit) {
      case 'currency':
        if (hasDecimals) {
          return '$' + value.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 2 
          });
        } else {
          return '$' + value.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
          });
        }
      case 'percentage':
        const percentValue = value * 100;
        if (hasDecimals) {
          return percentValue.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 2 
          }) + '%';
        } else {
          return percentValue.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
          }) + '%';
        }
      case 'number':
      default:
        if (hasDecimals) {
          return value.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 2 
          });
        } else {
          return value.toLocaleString('en-US', { 
            minimumFractionDigits: 0,
            maximumFractionDigits: 0 
          });
        }
    }
  }, []);

  // ADDED: Include the metrics data and filteredMetrics in the returned state
  const filteredMetrics = useMemo(() => {
    return metrics || [];
  }, [metrics]);

  return {
    // Metrics data
    filteredMetrics,
    weekStarts,
    timePeriod,
    customDateRange,
    showCurrentWeek,
    highlightCurrentWeek,
    weekStartDay,
    
    // State
    editingCell,
    editValue,
    showAddForm,
    newMetricName,
    newMetricUnit,
    newMetricOwner,
    newMetricTarget,
    
    // Setters
    setEditingCell,
    setEditValue,
    setShowAddForm,
    setNewMetricName,
    setNewMetricUnit,
    setNewMetricOwner,
    setNewMetricTarget,
    
    // Utility functions
    formatValue,
    formatWeekDate,
    getValueColor,
    getOwnerInitials,
    checkTargetCondition,
  };
};
