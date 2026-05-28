import { logger } from '@/utils/logger';

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return '';
  
  // Handle different date formats
  if (dateString.includes('T')) {
    // Full datetime string
    return dateString.split('T')[0];
  }
  
  return dateString;
}

export function formatDateForInput(dateString?: string): string {
  if (!dateString) return '';
  
  // Handle different date formats and return YYYY-MM-DD format for input fields
  if (dateString.includes('T')) {
    // Full datetime string - just take the date part
    return dateString.split('T')[0];
  }
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // For other formats, try to parse without timezone issues
  // Use local timezone by creating date components directly
  const [yearNum, monthNum, dayNum] = dateString.split('-').map(Number);
  const date = new Date(yearNum, monthNum - 1, dayNum); // month is 0-indexed
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekStart(weekStartDay: 'monday' | 'sunday' = 'sunday'): string {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  let daysToSubtract;
  if (weekStartDay === 'monday') {
    // Monday is start of week
    daysToSubtract = currentDay === 0 ? 6 : currentDay - 1;
  } else {
    // Sunday is start of week
    daysToSubtract = currentDay;
  }
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToSubtract);
  weekStart.setHours(0, 0, 0, 0);
  
  // Use locale-safe formatting to prevent timezone shift issues
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEndOfCurrentQuarter(): string {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-based month
  
  let quarterEndMonth: number;
  
  // Determine the last month of the current quarter
  if (currentMonth >= 0 && currentMonth <= 2) {
    // Q1: January (0) to March (2) -> ends in March (2)
    quarterEndMonth = 2;
  } else if (currentMonth >= 3 && currentMonth <= 5) {
    // Q2: April (3) to June (5) -> ends in June (5)
    quarterEndMonth = 5;
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    // Q3: July (6) to September (8) -> ends in September (8)
    quarterEndMonth = 8;
  } else {
    // Q4: October (9) to December (11) -> ends in December (11)
    quarterEndMonth = 11;
  }
  
  // Create date for last day of quarter
  const quarterEnd = new Date(now.getFullYear(), quarterEndMonth + 1, 0); // +1 month, day 0 = last day of previous month
  
  // Return local date string without timezone conversion
  const year = quarterEnd.getFullYear();
  const month = String(quarterEnd.getMonth() + 1).padStart(2, '0');
  const day = String(quarterEnd.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export function getEndOfCurrentMonth(): string {
  const now = new Date();
  
  // Create date for last day of current month
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Return local date string without timezone conversion
  const year = monthEnd.getFullYear();
  const month = String(monthEnd.getMonth() + 1).padStart(2, '0');
  const day = String(monthEnd.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the completion date for a goal based on quarterly planning
 * Goals should end on the last day of the current quarter
 */
export function getGoalCompletionDate(): string {
  return getEndOfCurrentQuarter();
}

export function getWeekStarts(count: number, weekStartDay: 'monday' | 'sunday' = 'sunday'): string[] {
  const weeks = [];
  const currentWeekStart = new Date(getCurrentWeekStart(weekStartDay));
  
  for (let i = 0; i < count; i++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - (i * 7));
    // Use locale-safe formatting to prevent timezone shift issues
    const year = weekStart.getFullYear();
    const month = String(weekStart.getMonth() + 1).padStart(2, '0');
    const day = String(weekStart.getDate()).padStart(2, '0');
    weeks.push(`${year}-${month}-${day}`);
  }
  
  return weeks;
}

export function formatWeekDate(weekStart: string): string {
  if (!weekStart) {
    return 'Invalid Date';
  }
  
  const date = new Date(weekStart);
  
  if (isNaN(date.getTime())) {
    logger.error('formatWeekDate: Invalid date string', weekStart);
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatDateRange(startWeek: string, endDateOrWeek: string): string {
  // Validate input strings
  if (!startWeek || !endDateOrWeek) {
    logger.error('formatDateRange: Missing date strings', { startWeek, endDateOrWeek });
    return 'Invalid Date Range';
  }
  
  const startDate = new Date(startWeek + 'T00:00:00');
  let endDate = new Date(endDateOrWeek + 'T00:00:00');
  
  // Validate Date objects
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    logger.error('formatDateRange: Invalid dates created', { 
      startWeek, 
      endDateOrWeek,
      startDateValid: !isNaN(startDate.getTime()),
      endDateValid: !isNaN(endDate.getTime())
    });
    return 'Invalid Date Range';
  }
  
  // If endDateOrWeek seems like a week start (not already an end date),
  // add 6 days to get the end of that week
  // We can detect this by checking if it's exactly 7 days after startWeek
  const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 0 && daysDiff % 7 === 0) {
    // This appears to be week-to-week, so add 6 days to get the week end
    endDate.setDate(endDate.getDate() + 6);
  }
  
  // Ensure we always have the earlier date first
  const earlierDate = startDate < endDate ? startDate : endDate;
  const laterDate = startDate < endDate ? endDate : startDate;
  
  const earlierMonth = earlierDate.toLocaleDateString('en-US', { month: 'short' });
  const laterMonth = laterDate.toLocaleDateString('en-US', { month: 'short' });
  const earlierDay = earlierDate.getDate();
  const laterDay = laterDate.getDate();
  
  // If same month, show "Jun 8 - 29"
  if (earlierMonth === laterMonth) {
    return `${earlierMonth} ${earlierDay} - ${laterDay}`;
  }
  
  // If different months, show "Jun 8 - Jul 5"
  return `${earlierMonth} ${earlierDay} - ${laterMonth} ${laterDay}`;
}

export function formatQuarterlyRange(startWeek: string, endWeek: string): string {
  const startDate = new Date(startWeek);
  const endDate = new Date(endWeek);
  
  // Get quarter number
  const startQuarter = Math.floor(startDate.getMonth() / 3) + 1;
  const year = startDate.getFullYear();
  
  return `Q${startQuarter} ${year}`;
}
