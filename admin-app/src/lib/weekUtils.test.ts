import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));

vi.mock('@/utils/localeDateUtils', () => ({
  formatDateLocal: vi.fn((date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }),
}));

import { getWeekStart, getCurrentWeekStart, getWeekStartsForPeriod } from './weekUtils';

describe('getWeekStart', () => {
  it('returns previous Sunday for Sunday start', () => {
    // 2024-01-10 is a Wednesday
    const date = new Date(2024, 0, 10);
    const result = getWeekStart(date, 'sunday');

    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(7); // Previous Sunday is Jan 7
  });

  it('returns previous Monday for Monday start', () => {
    // 2024-01-10 is a Wednesday
    const date = new Date(2024, 0, 10);
    const result = getWeekStart(date, 'monday');

    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(8); // Previous Monday is Jan 8
  });

  it('returns same day when date is the start day', () => {
    // 2024-01-07 is a Sunday
    const date = new Date(2024, 0, 7);
    const result = getWeekStart(date, 'sunday');

    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(7);
  });

  it('sets time to midnight', () => {
    const date = new Date(2024, 0, 10, 15, 30, 45);
    const result = getWeekStart(date, 'sunday');

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
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

  it('defaults to sunday when no argument', () => {
    const result = getCurrentWeekStart();
    const date = new Date(result + 'T00:00:00');
    expect(date.getDay()).toBe(0);
  });
});

describe('getWeekStartsForPeriod', () => {
  it('returns approximately 14 entries for last_13_weeks in reverse order', () => {
    const result = getWeekStartsForPeriod('last_13_weeks', undefined, 'sunday');

    expect(result.length).toBeGreaterThanOrEqual(13);
    expect(result.length).toBeLessThanOrEqual(15);
    // Verify reverse order (newest first)
    if (result.length > 1) {
      expect(result[0] > result[1]).toBe(true);
    }
  });

  it('works with custom date range', () => {
    const customRange = { start: new Date(2024, 0, 1), end: new Date(2024, 1, 1) };
    const result = getWeekStartsForPeriod('custom', customRange, 'sunday');

    expect(result.length).toBeGreaterThan(0);
    result.forEach((dateStr: string) => {
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it('returns dates in reverse order (newest first)', () => {
    const result = getWeekStartsForPeriod('last_13_weeks', undefined, 'sunday');

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i] > result[i + 1]).toBe(true);
    }
  });

  it('falls back to 13 weeks for default/unknown period', () => {
    const defaultResult = getWeekStartsForPeriod('unknown_period' as any, undefined, 'sunday');
    const thirteenResult = getWeekStartsForPeriod('last_13_weeks', undefined, 'sunday');

    expect(defaultResult.length).toBe(thirteenResult.length);
  });

  it('handles last_3_weeks period', () => {
    const result = getWeekStartsForPeriod('last_3_weeks', undefined, 'sunday');
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('handles last_4_weeks period', () => {
    const result = getWeekStartsForPeriod('last_4_weeks', undefined, 'sunday');
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it('handles last_52_weeks period', () => {
    const result = getWeekStartsForPeriod('last_52_weeks', undefined, 'sunday');
    expect(result.length).toBeGreaterThanOrEqual(52);
    expect(result.length).toBeLessThanOrEqual(54);
  });

  it('handles current_quarter period', () => {
    const result = getWeekStartsForPeriod('current_quarter', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((d: string) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('handles current_year period', () => {
    const result = getWeekStartsForPeriod('current_year', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles last_year period', () => {
    const result = getWeekStartsForPeriod('last_year', undefined, 'sunday');
    expect(result.length).toBeGreaterThanOrEqual(52);
  });

  it('handles last_30_days period', () => {
    const result = getWeekStartsForPeriod('last_30_days', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles last_90_days period', () => {
    const result = getWeekStartsForPeriod('last_90_days', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles last_365_days period', () => {
    const result = getWeekStartsForPeriod('last_365_days', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles all_time period', () => {
    const result = getWeekStartsForPeriod('all_time', undefined, 'sunday');
    expect(result.length).toBeGreaterThan(0);
  });

  it('works with monday start day', () => {
    const result = getWeekStartsForPeriod('last_4_weeks', undefined, 'monday');
    expect(result.length).toBeGreaterThan(0);
    // Verify all dates are Mondays
    result.forEach((d: string) => {
      const date = new Date(d + 'T00:00:00');
      expect(date.getDay()).toBe(1);
    });
  });

  it('handles Sunday on sunday start day for getWeekStart', () => {
    // 2024-01-14 is a Sunday
    const date = new Date(2024, 0, 14);
    const result = getWeekStart(date, 'sunday');
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(14); // Should be same day
  });

  it('handles Sunday on monday start day for getWeekStart', () => {
    // 2024-01-14 is a Sunday, so Monday start should go back 6 days
    const date = new Date(2024, 0, 14);
    const result = getWeekStart(date, 'monday');
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(8); // Previous Monday is Jan 8
  });
});
