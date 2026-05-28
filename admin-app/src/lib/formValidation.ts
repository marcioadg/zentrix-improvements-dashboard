import { cn } from '@/lib/utils';

/**
 * Get input styling classes based on validation state
 * Shows red border when field is invalid and user has attempted to submit
 */
export const getInputErrorClass = (
  hasError: boolean,
  attemptedSubmit: boolean = true
): string => {
  if (hasError && attemptedSubmit) {
    return 'border-destructive focus-visible:ring-destructive/30';
  }
  return '';
};

/**
 * Get label styling classes based on validation state
 * Shows red text when field is invalid and user has attempted to submit
 */
export const getLabelErrorClass = (
  hasError: boolean,
  attemptedSubmit: boolean = true
): string => {
  if (hasError && attemptedSubmit) {
    return 'text-destructive';
  }
  return '';
};

/**
 * Utility to check if a required string field is empty
 */
export const isFieldEmpty = (value: string | undefined | null): boolean => {
  return !value || value.trim() === '';
};

/**
 * Utility to check if a required array field is empty
 */
export const isArrayEmpty = (value: any[] | undefined | null): boolean => {
  return !value || value.length === 0;
};
