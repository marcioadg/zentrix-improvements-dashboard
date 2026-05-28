export interface TimePeriod {
  value: 'week' | 'month' | 'quarter' | 'year';
  label: string;
  days: number;
}

export interface Frequency {
  value: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  label: string;
}

export interface Timeframe {
  value: '3months' | '6months' | '1year' | '2years';
  label: string;
  months: number;
}

// Time-series data point for charts
export interface TimeSeriesDataPoint {
  date: string; // ISO date
  period: string; // Display label
  isLastKnown?: boolean; // Indicates fallback to last known data
  [key: string]: number | string | boolean | undefined; // Dynamic metric values
}

// Time-series analytics data structures
export interface GoalsTimeSeriesData {
  timeSeries: TimeSeriesDataPoint[];
}

export interface ScorecardsTimeSeriesData {
  timeSeries: TimeSeriesDataPoint[];
}

export interface MeetingRatingsTimeSeriesData {
  timeSeries: TimeSeriesDataPoint[];
}

export interface TaskCompletionTimeSeriesData {
  timeSeries: TimeSeriesDataPoint[];
}

export interface MeetingProductivityTimeSeriesData {
  timeSeries: TimeSeriesDataPoint[];
}

export interface TimeSeriesAnalyticsData {
  goals: GoalsTimeSeriesData;
  scorecards: ScorecardsTimeSeriesData;
  meetingRatings: MeetingRatingsTimeSeriesData;
  taskCompletion: TaskCompletionTimeSeriesData;
  meetingProductivity: MeetingProductivityTimeSeriesData;
}
