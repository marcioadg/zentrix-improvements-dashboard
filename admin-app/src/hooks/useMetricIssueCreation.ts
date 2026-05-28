
import { useCallback } from 'react';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';

// Helper to determine issue title direction based on target logic
const getIssueTitleDirection = (
  value: number,
  targetValue: number,
  targetLogic: string
): 'Below' | 'Above' => {
  switch (targetLogic) {
    case 'greater_than':
    case 'greater_than_or_equal':
      // Off-track means value is too LOW
      return 'Below';
    case 'less_than':
    case 'less_than_or_equal':
      // Off-track means value is too HIGH
      return 'Above';
    case 'equal':
    case 'equal_to':
      // Check actual value vs target
      return value < targetValue ? 'Below' : 'Above';
    default:
      // Default to "greater than or equal" behavior
      return 'Below';
  }
};

export const useMetricIssueCreation = () => {
  const isMetricOffTrack = useCallback((metric: WeeklyMetricWithOwner, weekStart: string): boolean => {
    const value = metric.weeklyValues?.[weekStart];
    if (value === null || value === undefined) return false;
    
    // Check for custom weekly target first, then fall back to default target
    const customTarget = metric.weeklyCustomTargets?.[weekStart]?.custom_target_value;
    const targetValue = customTarget !== null && customTarget !== undefined 
      ? customTarget 
      : metric.target_value;
    
    if (targetValue === null || targetValue === undefined) return false;

    const targetLogic = metric.target_logic || 'greater_than_or_equal'; // Default to standard "higher is better"
    
    // Evaluate based on target logic
    switch (targetLogic) {
      case 'greater_than':
        return value <= targetValue;
      case 'greater_than_or_equal':
        return value < targetValue;
      case 'less_than':
        return value >= targetValue;
      case 'less_than_or_equal':
        return value > targetValue;
      case 'equal':
      case 'equal_to':
        return value !== targetValue;
      default:
        // Default to "greater than or equal" logic
        return value < targetValue;
    }
  }, []);

  const getMostRecentWeek = useCallback((metric: WeeklyMetricWithOwner): string | null => {
    if (!metric.weeklyValues) return null;
    
    // Get all weeks with data, sorted by date (most recent first)
    const weeksWithData = Object.keys(metric.weeklyValues)
      .filter(week => metric.weeklyValues![week] !== null && metric.weeklyValues![week] !== undefined)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return weeksWithData[0] || null;
  }, []);

  const isCurrentlyOffTrack = useCallback((metric: WeeklyMetricWithOwner): boolean => {
    const mostRecentWeek = getMostRecentWeek(metric);
    if (!mostRecentWeek) return false;
    
    return isMetricOffTrack(metric, mostRecentWeek);
  }, [isMetricOffTrack, getMostRecentWeek]);

  const createIssueFromMetric = useCallback((
    metric: WeeklyMetricWithOwner, 
    weekStart: string,
    onCreateIssue?: (title: string, description: string, ownerId?: string) => void
  ) => {
    if (!onCreateIssue) return;

    const value = metric.weeklyValues?.[weekStart];
    const target = metric.target_value;
    const formattedWeek = new Date(weekStart).toLocaleDateString();
    const targetLogic = metric.target_logic || 'greater_than_or_equal';
    
    // Determine if value is above or below target based on logic
    const direction = getIssueTitleDirection(
      value ?? 0, 
      target ?? 0, 
      targetLogic
    );
    
    const title = `Metric: ${metric.metric_name} - ${direction} Target`;
    const description = `Metric "${metric.metric_name}" is underperforming:
- Current Value: ${value} ${metric.unit}
- Target: ${target} ${metric.unit}
- Target Logic: ${targetLogic}
- Owner: ${metric.owner}
- Week: ${formattedWeek}

Please review and take action to get this metric back on track.`;

    onCreateIssue(title, description, metric.owner_id);
  }, []);

  return {
    isMetricOffTrack,
    isCurrentlyOffTrack,
    getMostRecentWeek,
    createIssueFromMetric
  };
};
