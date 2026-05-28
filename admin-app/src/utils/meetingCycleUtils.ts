/**
 * Meeting Cycle Utilities
 * 
 * A "cycle" = one week, starting Monday 00:00:00 UTC.
 * "Previous cycle" = the week starting from the Monday before the most recent Monday.
 * 
 * During meetings, only tasks from the current and previous cycle should be visible
 * if they are completed. Pending/overdue tasks are always visible regardless of cycle.
 */

/**
 * Returns the start of the previous meeting cycle (2 Mondays ago at 00:00 UTC).
 * Tasks completed before this date should not appear in meeting views.
 */
export function getMeetingCycleBoundary(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  // Calculate days since last Monday (if today is Monday, daysSinceMonday = 0)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Start of current cycle (this Monday)
  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
    0, 0, 0, 0
  ));
  
  // Start of previous cycle (Monday before this Monday)
  const previousCycleStart = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  return previousCycleStart;
}

/**
 * Returns the ISO string of the previous cycle boundary for use in Supabase queries.
 */
export function getMeetingCycleBoundaryISO(): string {
  return getMeetingCycleBoundary().toISOString();
}

/**
 * Checks if a task's creation date falls within the current or previous meeting cycle.
 * Used as a client-side safety net for filtering completed tasks in meeting views.
 */
export function isWithinMeetingCycle(createdAt: string): boolean {
  const boundary = getMeetingCycleBoundary();
  const taskDate = new Date(createdAt);
  return taskDate >= boundary;
}
