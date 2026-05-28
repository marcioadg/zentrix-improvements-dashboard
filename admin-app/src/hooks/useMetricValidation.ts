
import { useCallback } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { logger } from '@/utils/logger';

interface MetricValidationResult {
  isValid: boolean;
  error?: string;
}

export const useMetricValidation = (metrics: WeeklyMetricWithOwner[]) => {
  
  const validateMetricValue = useCallback((value: string): MetricValidationResult => {
    const trimmedValue = value.trim();
    
    // Empty string is valid (means delete)
    if (trimmedValue === '') {
      return { isValid: true };
    }
    
    // Check if it's a valid number
    const numericValue = parseFloat(trimmedValue);
    if (isNaN(numericValue)) {
      return { 
        isValid: false, 
        error: 'Please enter a valid number' 
      };
    }
    
    // Check for reasonable ranges (optional - can be customized)
    if (numericValue < -1000000 || numericValue > 1000000) {
      return { 
        isValid: false, 
        error: 'Value must be between -1,000,000 and 1,000,000' 
      };
    }
    
    return { isValid: true };
  }, []);
  
  const validateMetricUniqueness = useCallback((
    metricName: string, 
    weekStart: string, 
    userId: string,
    excludeMetricId?: string
  ): MetricValidationResult => {
    // Check if a metric with the same name, week, and user already exists
    const existingMetric = metrics.find(metric => 
      metric.metric_name === metricName &&
      metric.weeklyValues?.[weekStart] !== undefined &&
      metric.user_id === userId &&
      metric.id !== excludeMetricId
    );
    
    if (existingMetric) {
      return { 
        isValid: false, 
        error: `A metric named "${metricName}" already exists for this week` 
      };
    }
    
    return { isValid: true };
  }, [metrics]);
  
  const validateBeforeSave = useCallback((
    metricId: string,
    weekStart: string,
    value: string,
    userId: string
  ): MetricValidationResult => {
    // First validate the value format
    const valueValidation = validateMetricValue(value);
    if (!valueValidation.isValid) {
      return valueValidation;
    }
    
    // Find the metric being edited
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) {
      return { 
        isValid: false, 
        error: 'Metric not found' 
      };
    }
    
    // Check uniqueness (though this should be rare due to upsert)
    const uniquenessValidation = validateMetricUniqueness(
      metric.metric_name,
      weekStart,
      userId,
      metricId
    );
    
    return uniquenessValidation;
  }, [metrics, validateMetricValue, validateMetricUniqueness]);
  
  const validateMetricNameUniqueness = useCallback(async (
    metricName: string,
    teamId: string,
    ownerId: string
  ): Promise<MetricValidationResult> => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    try {
      const { data: existingMetric, error } = await supabase
        .from('metrics')
        .select('id')
        .eq('metric_name', metricName)
        .eq('team_id', teamId)
        .eq('owner_id', ownerId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        logger.error('Error checking metric uniqueness:', error);
        return {
          isValid: false,
          error: 'Failed to validate metric name'
        };
      }

      if (existingMetric) {
        return {
          isValid: false,
          error: `A metric named "${metricName}" already exists for this team`
        };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('Error in validateMetricNameUniqueness:', error);
      return {
        isValid: false,
        error: 'Failed to validate metric name'
      };
    }
  }, []);
  
  return {
    validateMetricValue,
    validateMetricUniqueness,
    validateBeforeSave,
    validateMetricNameUniqueness
  };
};
