import { formatDateLocal } from '@/utils/localeDateUtils';

export const getWeekStarts = (numberOfWeeks: number): string[] => {
  const weeks: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() + 7 * i));
    // Use locale-safe formatting to prevent timezone shift issues
    weeks.push(formatDateLocal(weekStart));
  }
  
  return weeks.reverse(); // Return in chronological order
};
