import { describe, it, expect } from 'vitest';
import { formatDuration, formatCompletedDate } from './meetingFormatters';

describe('formatDuration', () => {
  it('returns minutes only when under an hour', () => {
    expect(formatDuration(300)).toBe('5m');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(59 * 60 + 59)).toBe('59m');
  });

  it('returns hours and minutes when >= 1 hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7200)).toBe('2h 0m');
  });
});

describe('formatCompletedDate', () => {
  it('formats an ISO date string with month, day, and time', () => {
    // Use a fixed UTC timestamp and verify it contains expected parts
    const result = formatCompletedDate('2024-06-15T14:30:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });
});
