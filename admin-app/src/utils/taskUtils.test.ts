vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getDefaultDueDate, formatTaskDate, isTaskOverdue } from './taskUtils';

describe('getDefaultDueDate', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const result = getDefaultDueDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date 7 days from now', () => {
    const result = getDefaultDueDate();
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    const year = expected.getFullYear();
    const month = String(expected.getMonth() + 1).padStart(2, '0');
    const day = String(expected.getDate()).padStart(2, '0');
    expect(result).toBe(`${year}-${month}-${day}`);
  });
});

describe('formatTaskDate', () => {
  it('formats a date string correctly', () => {
    const result = formatTaskDate('2026-03-25');
    expect(result).toBe('Mar 25');
  });

  it('formats another date correctly', () => {
    const result = formatTaskDate('2026-01-05');
    expect(result).toBe('Jan 5');
  });
});

describe('isTaskOverdue', () => {
  it('returns true for a past date', () => {
    expect(isTaskOverdue('2020-01-01')).toBe(true);
  });

  it('returns false for a future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    expect(isTaskOverdue(future.toISOString())).toBe(false);
  });

  it('returns false for a completed task', () => {
    expect(isTaskOverdue('2020-01-01', true)).toBe(false);
  });

  it('returns false for an empty date string', () => {
    expect(isTaskOverdue('')).toBe(false);
  });

  it('returns false for today', () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    expect(isTaskOverdue(`${year}-${month}-${day}`)).toBe(false);
  });
});
