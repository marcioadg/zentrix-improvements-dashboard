import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

import {
  formatDateForDisplay,
  formatDateForInput,
  getCurrentWeekStart,
  getEndOfCurrentQuarter,
  getEndOfCurrentMonth,
  getGoalCompletionDate,
  getWeekStarts,
  formatWeekDate,
  formatDateRange,
  formatQuarterlyRange,
} from './dateUtils';

describe('formatDateForDisplay', () => {
  it('returns empty string for undefined', () => {
    expect(formatDateForDisplay()).toBe('');
    expect(formatDateForDisplay('')).toBe('');
  });

  it('strips time from datetime strings', () => {
    expect(formatDateForDisplay('2026-03-22T14:30:00Z')).toBe('2026-03-22');
  });

  it('returns date-only strings as-is', () => {
    expect(formatDateForDisplay('2026-03-22')).toBe('2026-03-22');
  });
});

describe('formatDateForInput', () => {
  it('returns empty string for undefined', () => {
    expect(formatDateForInput()).toBe('');
    expect(formatDateForInput('')).toBe('');
  });

  it('strips time from datetime strings', () => {
    expect(formatDateForInput('2026-03-22T14:30:00Z')).toBe('2026-03-22');
  });

  it('returns YYYY-MM-DD strings unchanged', () => {
    expect(formatDateForInput('2026-01-05')).toBe('2026-01-05');
  });

  it('returns empty string for unparseable input', () => {
    expect(formatDateForInput('not-a-date')).toBe('');
  });
});

describe('getEndOfCurrentQuarter', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = getEndOfCurrentQuarter();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a quarter-end date (month is 03, 06, 09, or 12)', () => {
    const result = getEndOfCurrentQuarter();
    const month = result.slice(5, 7);
    expect(['03', '06', '09', '12']).toContain(month);
  });
});

describe('getEndOfCurrentMonth', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = getEndOfCurrentMonth();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatDateRange', () => {
  it('returns Invalid Date Range for missing inputs', () => {
    expect(formatDateRange('', '2026-03-22')).toBe('Invalid Date Range');
    expect(formatDateRange('2026-03-22', '')).toBe('Invalid Date Range');
  });

  it('formats same-month ranges', () => {
    const result = formatDateRange('2026-03-01', '2026-03-08');
    // 7-day diff → week-to-week → adds 6 days → Mar 1 - 14
    expect(result).toContain('Mar');
    expect(result).toContain('-');
  });

  it('formats cross-month ranges', () => {
    const result = formatDateRange('2026-06-22', '2026-07-06');
    // 14-day diff → week-to-week → adds 6 days → Jun 22 - Jul 12
    expect(result).toContain('Jun');
    expect(result).toContain('Jul');
  });
});

describe('getCurrentWeekStart', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    const result = getCurrentWeekStart();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a Sunday for sunday start', () => {
    const result = getCurrentWeekStart('sunday');
    const date = new Date(result + 'T00:00:00');
    expect(date.getDay()).toBe(0);
  });

  it('returns a Monday for monday start', () => {
    const result = getCurrentWeekStart('monday');
    const date = new Date(result + 'T00:00:00');
    expect(date.getDay()).toBe(1);
  });
});

describe('getGoalCompletionDate', () => {
  it('returns end of current quarter', () => {
    const result = getGoalCompletionDate();
    expect(result).toBe(getEndOfCurrentQuarter());
  });

  it('returns a valid YYYY-MM-DD string', () => {
    expect(getGoalCompletionDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('getWeekStarts', () => {
  it('returns the correct number of weeks', () => {
    const result = getWeekStarts(4);
    expect(result).toHaveLength(4);
  });

  it('returns valid YYYY-MM-DD strings', () => {
    const result = getWeekStarts(3);
    result.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('returns weeks in reverse chronological order (newest first)', () => {
    const result = getWeekStarts(5);
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i] >= result[i + 1]).toBe(true);
    }
  });

  it('returns 0 weeks when count is 0', () => {
    expect(getWeekStarts(0)).toHaveLength(0);
  });

  it('returns 1 week when count is 1', () => {
    expect(getWeekStarts(1)).toHaveLength(1);
  });
});

describe('formatWeekDate', () => {
  it('formats a valid date string', () => {
    const result = formatWeekDate('2026-03-22');
    expect(result).toContain('Mar');
  });

  it('returns Invalid Date for empty string', () => {
    expect(formatWeekDate('')).toBe('Invalid Date');
  });

  it('returns Invalid Date for invalid date string', () => {
    expect(formatWeekDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('formatQuarterlyRange', () => {
  it('returns Q label with year', () => {
    expect(formatQuarterlyRange('2026-01-05', '2026-03-29')).toBe('Q1 2026');
    expect(formatQuarterlyRange('2026-04-06', '2026-06-28')).toBe('Q2 2026');
    expect(formatQuarterlyRange('2026-07-06', '2026-09-27')).toBe('Q3 2026');
    expect(formatQuarterlyRange('2026-10-05', '2026-12-27')).toBe('Q4 2026');
  });
});
