
import { useCallback } from 'react';
import { checkTargetCondition } from '@/utils/metricUtils';

export const useMetricsFormatting = () => {
  const getValueColor = useCallback((value: number | null, metric: any, weekStart?: string) => {
    // Determine which target to use with proper priority
    let targetValue = metric.target_value;
    const targetLogic = metric.target_logic || 'greater_than_or_equal'; // Always use global logic

    // Priority 1: Check for aggregated custom target (for grouped views like 4-week, 13-week)
    if (weekStart && metric.aggregatedCustomTargets?.[weekStart] !== undefined) {
      targetValue = metric.aggregatedCustomTargets[weekStart];
    }
    // Priority 2: Check for custom weekly target VALUE (for weekly view)
    else if (weekStart && metric.weeklyCustomTargets?.[weekStart]) {
      const customTarget = metric.weeklyCustomTargets[weekStart];
      if (customTarget.custom_target_value !== null && customTarget.custom_target_value !== undefined) {
        targetValue = customTarget.custom_target_value;
      }
    }
    // Priority 3: Check for adjusted target (for grouped views without custom targets)
    else if (metric.adjusted_target_value !== undefined && metric.adjusted_target_value !== null) {
      targetValue = metric.adjusted_target_value;
    }
    // Priority 4: Fall back to global target (already set above)

    // If no target is set, return muted for any value (including null)
    if (targetValue === null || targetValue === undefined) {
      return 'text-muted-foreground';
    }

    // If value is null, always return muted (no data)
    if (value === null || value === undefined) {
      return 'text-muted-foreground/50';
    }

    const isTargetMet = checkTargetCondition(value, targetValue, targetLogic);
    // On target: green background — Off target: red background
    const result = isTargetMet
      ? 'text-foreground metric-on-target'
      : 'text-foreground metric-off-target';
    
    return result;
  }, []);

  const formatValue = useCallback((value: number | null, unit: string) => {
    if (value === null || value === undefined) {
      return '-';
    }

    // Check if the number has decimal places by comparing with its integer version
    const hasDecimals = value % 1 !== 0;

    let formattedValue: string;

    // Updated to handle new capitalized unit names
    if (unit === 'Percentage') {
      // For percentage, just format the number and add % symbol (no multiplication by 100)
      if (hasDecimals) {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 2 
        });
      } else {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        });
      }
      formattedValue += '%';
    } else if (unit === 'Currency') {
      // For currency, use proper currency formatting with $ symbol
      if (hasDecimals) {
        formattedValue = '$' + value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 2 
        });
      } else {
        formattedValue = '$' + value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        });
      }
    } else if (unit === 'Time') {
      // For time, preserve decimals if they exist
      if (hasDecimals) {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 2 
        });
      } else {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        });
      }
    } else if (unit === 'Yes/No') {
      // For Yes/No, show as 1/0 or Yes/No
      formattedValue = value === 1 ? 'Yes' : value === 0 ? 'No' : value.toString();
    } else if (unit === 'Number') {
      // For numbers, only show decimals if they exist
      if (hasDecimals) {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 2 
        });
      } else {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        });
      }
    } else {
      // Default case - preserve decimals if they exist, add thousands separators
      if (hasDecimals) {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 2 
        });
      } else {
        formattedValue = value.toLocaleString('en-US', { 
          minimumFractionDigits: 0,
          maximumFractionDigits: 0 
        });
      }
    }
    
    return formattedValue;
  }, []);

  return {
    getValueColor,
    formatValue
  };
};
