
import { format, addDays } from 'date-fns';

export const formatWeekDate = (weekStart: string, weekStartDay: 'monday' | 'sunday' = 'sunday'): string => {
  let startDate = new Date(weekStart);
  
  // If weekStartDay is Monday and the provided date is Sunday, add 1 day
  if (weekStartDay === 'monday' && startDate.getDay() === 0) {
    startDate = addDays(startDate, 1);
  }
  
  // If weekStartDay is Sunday and the provided date is Saturday, add 1 day
  if (weekStartDay === 'sunday' && startDate.getDay() === 6) {
    startDate = addDays(startDate, 1);
  }
  
  const endDate = addDays(startDate, 6);
  
  // Format as "May 19 - May 25" for week range display
  const startFormatted = format(startDate, 'MMM d');
  const endFormatted = format(endDate, 'MMM d');
  
  return `${startFormatted} - ${endFormatted}`;
};

export const formatWeekDateMultiLine = (weekStart: string, weekStartDay: 'monday' | 'sunday' = 'sunday'): { start: string; end: string } => {
  let startDate = new Date(weekStart + 'T00:00:00');
  
  // If weekStartDay is Monday and the provided date is Sunday, add 1 day
  if (weekStartDay === 'monday' && startDate.getDay() === 0) {
    startDate = addDays(startDate, 1);
  }
  
  // If weekStartDay is Sunday and the provided date is Saturday, add 1 day
  if (weekStartDay === 'sunday' && startDate.getDay() === 6) {
    startDate = addDays(startDate, 1);
  }
  
  const endDate = addDays(startDate, 6);
  
  const startFormatted = format(startDate, 'MMM d');
  const endFormatted = format(endDate, 'MMM d');
  
  return {
    start: `${startFormatted} -`,
    end: endFormatted
  };
};

export const getOwnerInitials = (fullName: string): string => {
  if (!fullName) return '';
  
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].charAt(0).toUpperCase();
  }
  
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

export const checkTargetCondition = (
  value: number,
  targetValue: number,
  targetLogic: string
): boolean => {
  const numericValue = Number(value);
  const numericTarget = Number(targetValue);

  if (isNaN(numericValue) || isNaN(numericTarget)) {
    return false;
  }

  let result: boolean;
  
  if (targetLogic === 'greater_than') {
    result = numericValue > numericTarget;
  } else if (targetLogic === 'less_than') {
    result = numericValue < numericTarget;
  } else if (targetLogic === 'equal' || targetLogic === 'equal_to') {
    // For equality, use a small tolerance to handle floating point precision issues
    const tolerance = 0.001; // Allow tiny differences
    const difference = Math.abs(numericValue - numericTarget);
    result = difference < tolerance;
  } else if (targetLogic === 'greater_than_or_equal') {
    result = numericValue >= numericTarget;
  } else if (targetLogic === 'less_than_or_equal') {
    result = numericValue <= numericTarget;
  } else {
    result = numericValue >= numericTarget;
  }

  return result;
};

export const getTargetLogicSymbol = (targetLogic: string): string => {
  switch (targetLogic) {
    case 'greater_than':
      return '>';
    case 'less_than':
      return '<';
    case 'equal':
    case 'equal_to':
      return '=';
    case 'greater_than_or_equal':
      return '>=';
    case 'less_than_or_equal':
      return '<=';
    default:
      return '>=';
  }
};
