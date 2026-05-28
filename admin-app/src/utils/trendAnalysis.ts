export interface TrendData {
  direction: 'improving' | 'declining' | 'stable';
  changePercent: number;
  velocity: number;
  prediction: 'likely_miss' | 'on_track' | 'exceeding';
  weekOverWeekChange: number;
  movingAverage: number;
  consistency: 'consistent' | 'volatile' | 'stable';
}

export interface MetricWithTrend {
  id: string;
  metric_name: string;
  current_value: number | null;
  target_value: number | null;
  target_logic: string | null;
  unit: string;
  owner: string;
  trend: TrendData;
  historical_values: Array<{ week: string; value: number | null }>;
}

export const calculateTrend = (
  currentValue: number | null,
  historicalValues: Array<{ week: string; value: number | null }>,
  targetValue: number | null,
  targetLogic: string | null
): TrendData => {
  // FIXED: Check for null/undefined explicitly instead of falsy check to handle zero values
  if (currentValue == null || historicalValues.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      velocity: 0,
      prediction: 'on_track',
      weekOverWeekChange: 0,
      movingAverage: currentValue ?? 0,
      consistency: 'stable'
    };
  }

  // Get last 4 weeks of data for trend calculation
  const recentValues = historicalValues
    // FIXED: Check for null/undefined explicitly instead of falsy check
    .filter(v => v.value != null)
    .slice(-4)
    .map(v => v.value!);

  if (recentValues.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      velocity: 0,
      prediction: 'on_track',
      weekOverWeekChange: 0,
      movingAverage: currentValue,
      consistency: 'stable'
    };
  }

  // Calculate week-over-week change
  const previousValue = recentValues[recentValues.length - 2];
  const weekOverWeekChange = previousValue !== 0
    ? ((currentValue - previousValue) / previousValue) * 100
    : currentValue > 0 ? 100 : 0;

  // Calculate moving average
  const movingAverage = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

  // Calculate velocity (rate of change over recent weeks)
  const firstValue = recentValues[0];
  const lastValue = recentValues[recentValues.length - 1];
  const weeksSpan = recentValues.length - 1;
  const velocity = weeksSpan > 0 ? (lastValue - firstValue) / weeksSpan : 0;

  // Determine trend direction
  let direction: 'improving' | 'declining' | 'stable' = 'stable';
  if (Math.abs(weekOverWeekChange) > 5) { // 5% threshold for significance
    if (targetLogic === 'greater_than' || targetLogic === 'greater_than_or_equal') {
      direction = weekOverWeekChange > 0 ? 'improving' : 'declining';
    } else if (targetLogic === 'less_than' || targetLogic === 'less_than_or_equal') {
      direction = weekOverWeekChange < 0 ? 'improving' : 'declining';
    } else {
      direction = weekOverWeekChange > 0 ? 'improving' : 'declining';
    }
  }

  // Calculate consistency (variance in recent values)
  const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - movingAverage, 2), 0) / recentValues.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = movingAverage !== 0 ? (standardDeviation / Math.abs(movingAverage)) * 100 : 0;
  
  let consistency: 'consistent' | 'volatile' | 'stable' = 'stable';
  if (coefficientOfVariation > 20) {
    consistency = 'volatile';
  } else if (coefficientOfVariation < 5) {
    consistency = 'consistent';
  }

  // Predict target achievement based on current trajectory
  let prediction: 'likely_miss' | 'on_track' | 'exceeding' = 'on_track';
  if (targetValue != null && targetLogic) {
    const projectedValue = currentValue + (velocity * 2); // Project 2 weeks ahead
    
    if (targetLogic === 'greater_than' || targetLogic === 'greater_than_or_equal') {
      if (projectedValue < targetValue * 0.8) {
        prediction = 'likely_miss';
      } else if (projectedValue > targetValue * 1.1) {
        prediction = 'exceeding';
      }
    } else if (targetLogic === 'less_than' || targetLogic === 'less_than_or_equal') {
      if (projectedValue > targetValue * 1.2) {
        prediction = 'likely_miss';
      } else if (projectedValue < targetValue * 0.9) {
        prediction = 'exceeding';
      }
    }
  }

  return {
    direction,
    changePercent: Math.abs(weekOverWeekChange),
    velocity,
    prediction,
    weekOverWeekChange,
    movingAverage,
    consistency
  };
};

export const getTrendIcon = (direction: 'improving' | 'declining' | 'stable'): string => {
  switch (direction) {
    case 'improving': return '📈';
    case 'declining': return '📉';
    case 'stable': return '➡️';
  }
};

export const getPredictionIcon = (prediction: 'likely_miss' | 'on_track' | 'exceeding'): string => {
  switch (prediction) {
    case 'likely_miss': return '⚠️';
    case 'on_track': return '✅';
    case 'exceeding': return '🚀';
  }
};

export const formatTrendSummary = (trend: TrendData): string => {
  const icon = getTrendIcon(trend.direction);
  const predictionIcon = getPredictionIcon(trend.prediction);
  
  let summary = `${icon} ${trend.direction.toUpperCase()}`;
  
  if (trend.changePercent > 0) {
    summary += ` (${trend.weekOverWeekChange > 0 ? '+' : ''}${trend.weekOverWeekChange.toFixed(1)}% vs last week)`;
  }
  
  if (trend.prediction !== 'on_track') {
    summary += ` ${predictionIcon} ${trend.prediction.replace('_', ' ').toUpperCase()}`;
  }
  
  return summary;
};
