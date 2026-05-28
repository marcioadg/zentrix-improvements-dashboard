/**
 * Format a Date to YYYY-MM-DD string using LOCAL timezone (not UTC)
 * This prevents timezone shift issues where toISOString() converts to UTC
 * and can shift the date back by a day for users in positive UTC offsets
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get date string for day before the given date (for flexible queries)
 */
export function getDayBefore(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone edge cases
  date.setDate(date.getDate() - 1);
  return formatDateLocal(date);
}

/**
 * Get date string for day after the given date (for flexible queries)
 */
export function getDayAfter(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone edge cases
  date.setDate(date.getDate() + 1);
  return formatDateLocal(date);
}
