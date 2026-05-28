import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, addDays, addWeeks, addMonths, addQuarters, addYears } from 'date-fns';

export interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
  dateKey: string; // ISO date string for the start
}

export const getDateRange = (
  timeframe: '4weeks' | '3months' | '6months' | '1year' | '2years' | 'alltime',
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
) => {
  const end = new Date();
  const start = new Date();
  
  // Extend end date to cover the full period for monthly/quarterly/yearly views
  if (frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') {
    // Set to last day of current month
    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  }
  
  switch(timeframe) {
    case '4weeks':
      start.setDate(end.getDate() - 28);
      break;
    case '3months':
      start.setMonth(end.getMonth() - 3);
      break;
    case '6months':
      start.setMonth(end.getMonth() - 6);
      break;
    case '1year':
      start.setFullYear(end.getFullYear() - 1);
      break;
    case '2years':
      start.setFullYear(end.getFullYear() - 2);
      break;
    case 'alltime':
      // Set start to very early date (e.g., 10 years ago)
      start.setFullYear(end.getFullYear() - 10);
      break;
  }
  
  // Ensure start is at beginning of period for monthly/quarterly/yearly
  if (frequency === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (frequency === 'quarterly') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    start.setHours(0, 0, 0, 0);
  } else if (frequency === 'yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
};

export const generateTimeBuckets = (
  startDate: Date,
  endDate: Date,
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
): TimeBucket[] => {
  const buckets: TimeBucket[] = [];
  let current = new Date(startDate);
  
  switch(frequency) {
    case 'weekly':
      current = startOfWeek(current, { weekStartsOn: 1 }); // Monday
      while (current <= endDate) {
        const bucketEnd = new Date(current);
        bucketEnd.setDate(current.getDate() + 6);
        bucketEnd.setHours(23, 59, 59, 999);
        
        buckets.push({
          start: new Date(current),
          end: bucketEnd,
          label: format(current, 'MMM d'),
          dateKey: current.toISOString()
        });
        
        current = addWeeks(current, 1);
      }
      break;
      
    case 'monthly':
      current = startOfMonth(current);
      while (current <= endDate) {
        const bucketEnd = new Date(current);
        bucketEnd.setMonth(current.getMonth() + 1);
        bucketEnd.setDate(0);
        bucketEnd.setHours(23, 59, 59, 999);
        
        buckets.push({
          start: new Date(current),
          end: bucketEnd,
          label: format(current, 'MMM yyyy'),
          dateKey: current.toISOString()
        });
        
        current = addMonths(current, 1);
      }
      break;
      
    case 'quarterly':
      current = startOfQuarter(current);
      while (current <= endDate) {
        const bucketEnd = new Date(current);
        bucketEnd.setMonth(current.getMonth() + 3);
        bucketEnd.setDate(0);
        bucketEnd.setHours(23, 59, 59, 999);
        
        const quarter = Math.floor(current.getMonth() / 3) + 1;
        buckets.push({
          start: new Date(current),
          end: bucketEnd,
          label: `Q${quarter} ${format(current, 'yyyy')}`,
          dateKey: current.toISOString()
        });
        
        current = addQuarters(current, 1);
      }
      break;
      
    case 'yearly':
      current = startOfYear(current);
      while (current <= endDate) {
        const bucketEnd = new Date(current);
        bucketEnd.setFullYear(current.getFullYear() + 1);
        bucketEnd.setDate(0);
        bucketEnd.setHours(23, 59, 59, 999);
        
        buckets.push({
          start: new Date(current),
          end: bucketEnd,
          label: format(current, 'yyyy'),
          dateKey: current.toISOString()
        });
        
        current = addYears(current, 1);
      }
      break;
  }
  
  return buckets;
};

/**
 * Safely parse a date input to a Date object.
 * - If input is already a Date, return it
 * - If input is a string with time (contains 'T'), parse normally
 * - If input matches YYYY-MM-DD format, parse as LOCAL midday (avoids timezone/DST issues)
 */
export const parseLocalDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  
  // If it's a full timestamp with time component, use normal parsing
  if (date.includes('T')) {
    return new Date(date);
  }
  
  // For date-only strings (YYYY-MM-DD), parse as local date at midday
  // This prevents timezone shifts that occur when parsing "2026-01-06" as UTC midnight
  const parts = date.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  }
  
  // Fallback to normal parsing
  return new Date(date);
};

/**
 * Get end-of-day (23:59:59.999) for a date-only string (YYYY-MM-DD) using LOCAL timezone.
 * This ensures tasks completed anytime on the due date are counted as "On Time".
 */
export const getLocalEndOfDay = (dateStr: string): Date => {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
  }
  // Fallback for non-YYYY-MM-DD strings
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const isDateInBucket = (date: string | Date, bucket: TimeBucket): boolean => {
  const d = parseLocalDate(date);
  return d >= bucket.start && d <= bucket.end;
};
