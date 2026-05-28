import { TimeSeriesDataPoint } from '@/types/analytics';

/**
 * Removes leading empty periods from chart data.
 * Keeps only data from the first non-zero value onwards.
 * 
 * @param data - Array of time series data points
 * @param dataKeys - Keys to check for non-zero values (e.g., ["Tasks Created", "Issues Solved"])
 * @returns Filtered array with leading empty periods removed
 */
export const trimLeadingEmptyPeriods = (
  data: TimeSeriesDataPoint[],
  dataKeys: string[]
): TimeSeriesDataPoint[] => {
  if (data.length === 0) return data;

  // Find the first index where any of the dataKeys has a non-zero value
  const firstDataIndex = data.findIndex(item => {
    return dataKeys.some(key => {
      const value = item[key];
      return value !== null && value !== undefined && value !== 0;
    });
  });

  // If no data found, return empty array
  if (firstDataIndex === -1) return [];

  // Return data from first non-zero point onwards
  return data.slice(firstDataIndex);
};
