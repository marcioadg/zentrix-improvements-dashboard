import { formatDateLocal } from '@/utils/localeDateUtils';

export type WeekStartDay = 'monday' | 'sunday';

export const getWeekStart = (date: Date, weekStartDay: WeekStartDay = 'sunday'): Date => {
  const result = new Date(date);
  const dayOfWeek = result.getDay();
  
  let daysToSubtract;
  if (weekStartDay === 'monday') {
    // Monday = 1, Sunday = 0
    // For Monday start: if today is Monday (1), subtract 0; if Tuesday (2), subtract 1, etc.
    // If Sunday (0), subtract 6 to get to previous Monday
    daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else {
    // Sunday = 0 - for Sunday start, just subtract the day of week
    daysToSubtract = dayOfWeek;
  }
  
  result.setDate(result.getDate() - daysToSubtract);
  result.setHours(0, 0, 0, 0);
  
  return result;
};

export const getCurrentWeekStart = (weekStartDay: WeekStartDay = 'sunday'): string => {
  const today = new Date();
  const weekStart = getWeekStart(today, weekStartDay);
  // Use locale-safe formatting to prevent timezone shift issues
  return formatDateLocal(weekStart);
};

export const getWeekStartsForPeriod = (
  timePeriod: string,
  customDateRange: { start: Date; end: Date } | undefined,
  weekStartDay: WeekStartDay = 'sunday'
): string[] => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (timePeriod === 'custom' && customDateRange) {
    startDate = customDateRange.start;
    endDate = customDateRange.end;
  } else {
    switch (timePeriod) {
      case 'last_3_weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (3 * 7));
        endDate = now;
        break;
      case 'last_4_weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (4 * 7));
        endDate = now;
        break;
      case 'last_13_weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (13 * 7));
        endDate = now;
        break;
      case 'last_52_weeks':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (52 * 7));
        endDate = now;
        break;
      case 'current_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
        break;
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'last_30_days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 30);
        endDate = now;
        break;
      case 'last_90_days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 90);
        endDate = now;
        break;
      case 'last_365_days':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 365);
        endDate = now;
        break;
      case 'all_time':
        // Set start date to 5 years ago to capture all historical data
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 5);
        endDate = now;
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - (13 * 7));
        endDate = now;
    }
  }

  const weekStarts: string[] = [];
  const current = getWeekStart(startDate, weekStartDay);
  const end = getWeekStart(endDate, weekStartDay);

  while (current <= end) {
    // Use locale-safe formatting to prevent timezone shift issues
    const weekStartString = formatDateLocal(current);
    weekStarts.push(weekStartString);
    current.setDate(current.getDate() + 7);
  }

  // Return in reverse order (newest to oldest, left to right)
  return weekStarts.reverse();
};
