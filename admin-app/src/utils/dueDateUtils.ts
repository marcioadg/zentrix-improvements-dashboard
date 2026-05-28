
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

export interface DueDateInfo {
  text: string;
  urgencyClass: string;
  isOverdue: boolean;
  isDueToday: boolean;
  dueDate: Date;
}

export const getDueDateInfo = (dueDateString?: string): DueDateInfo | null => {
  if (!dueDateString) return null;
  
  // Parse date string safely to avoid timezone issues
  // For YYYY-MM-DD format, create date directly from components to use local timezone
  let dueDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDateString)) {
    const [year, month, day] = dueDateString.split('-').map(Number);
    dueDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  } else {
    dueDate = new Date(dueDateString);
  }
  
  const now = new Date();
  
  // Ensure we're comparing dates at the start of day to get accurate calendar day differences
  const dueDateAtStartOfDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayAtStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysDiff = differenceInDays(dueDateAtStartOfDay, todayAtStartOfDay);
  const hoursDiff = differenceInHours(dueDate, now);
  const minutesDiff = differenceInMinutes(dueDate, now);
  
  let urgencyClass = '';
  let text = '';
  let isOverdue = false;
  let isDueToday = false;
  
  if (daysDiff < 0) {
    isOverdue = true;
    urgencyClass = 'text-destructive bg-destructive/10 border-destructive/20';
    const overdueDays = Math.abs(daysDiff);
    text = overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  } else if (daysDiff === 0) {
    isDueToday = true;
    urgencyClass = 'text-orange-600 bg-orange-50 border-orange-200';
    text = 'Due today';
  } else if (daysDiff === 1) {
    urgencyClass = 'text-yellow-600 bg-yellow-50 border-yellow-200';
    text = 'Due tomorrow';
  } else if (daysDiff <= 3) {
    urgencyClass = 'text-blue-600 bg-blue-50 border-blue-200';
    text = `${daysDiff} days left`;
  } else if (daysDiff <= 7) {
    urgencyClass = 'text-gray-600 bg-gray-50 border-gray-200';
    text = `${daysDiff} days left`;
  } else {
    urgencyClass = 'text-muted-foreground bg-muted border-border';
    text = format(dueDate, 'MMM d');
  }
  
  return {
    text,
    urgencyClass,
    isOverdue,
    isDueToday,
    dueDate
  };
};

export interface CompletedDateInfo {
  text: string;
  className: string;
}

export const getCompletedDateInfo = (completedAtString?: string | null): CompletedDateInfo | null => {
  if (!completedAtString) return null;
  
  const completedAt = new Date(completedAtString);
  const now = new Date();
  
  const completedAtStart = new Date(completedAt.getFullYear(), completedAt.getMonth(), completedAt.getDate());
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const daysDiff = differenceInDays(todayStart, completedAtStart);
  
  let text = '';
  
  if (daysDiff === 0) {
    text = 'Completed today';
  } else if (daysDiff === 1) {
    text = 'Completed yesterday';
  } else {
    text = `Completed ${daysDiff} days ago`;
  }
  
  return {
    text,
    className: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  };
};
