import { describe, it, expect } from 'vitest';
import { trimLeadingEmptyPeriods } from './chartDataUtils';

describe('trimLeadingEmptyPeriods', () => {
  const makePoint = (date: string, values: Record<string, number>) => ({
    date,
    period: date,
    ...values,
  });

  it('returns empty array for empty input', () => {
    expect(trimLeadingEmptyPeriods([], ['Tasks'])).toEqual([]);
  });

  it('returns empty array when all values are zero', () => {
    const data = [
      makePoint('2026-01-01', { Tasks: 0 }),
      makePoint('2026-01-08', { Tasks: 0 }),
    ];
    expect(trimLeadingEmptyPeriods(data, ['Tasks'])).toEqual([]);
  });

  it('returns empty array when all values are null/undefined', () => {
    const data = [
      { date: '2026-01-01', period: 'W1' },
      { date: '2026-01-08', period: 'W2' },
    ];
    expect(trimLeadingEmptyPeriods(data, ['Tasks'])).toEqual([]);
  });

  it('trims leading zeros', () => {
    const data = [
      makePoint('2026-01-01', { Tasks: 0 }),
      makePoint('2026-01-08', { Tasks: 0 }),
      makePoint('2026-01-15', { Tasks: 5 }),
      makePoint('2026-01-22', { Tasks: 3 }),
    ];
    const result = trimLeadingEmptyPeriods(data, ['Tasks']);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-15');
    expect(result[1].date).toBe('2026-01-22');
  });

  it('keeps trailing zeros', () => {
    const data = [
      makePoint('2026-01-01', { Tasks: 5 }),
      makePoint('2026-01-08', { Tasks: 0 }),
      makePoint('2026-01-15', { Tasks: 0 }),
    ];
    const result = trimLeadingEmptyPeriods(data, ['Tasks']);
    expect(result).toHaveLength(3);
  });

  it('returns all data when first point has data', () => {
    const data = [
      makePoint('2026-01-01', { Tasks: 1 }),
      makePoint('2026-01-08', { Tasks: 2 }),
    ];
    const result = trimLeadingEmptyPeriods(data, ['Tasks']);
    expect(result).toHaveLength(2);
  });

  it('checks multiple data keys', () => {
    const data = [
      makePoint('2026-01-01', { Tasks: 0, Issues: 0 }),
      makePoint('2026-01-08', { Tasks: 0, Issues: 3 }),
      makePoint('2026-01-15', { Tasks: 5, Issues: 0 }),
    ];
    const result = trimLeadingEmptyPeriods(data, ['Tasks', 'Issues']);
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-01-08');
  });

  it('handles single-element array with data', () => {
    const data = [makePoint('2026-01-01', { Tasks: 10 })];
    const result = trimLeadingEmptyPeriods(data, ['Tasks']);
    expect(result).toHaveLength(1);
  });

  it('handles single-element array with zero', () => {
    const data = [makePoint('2026-01-01', { Tasks: 0 })];
    const result = trimLeadingEmptyPeriods(data, ['Tasks']);
    expect(result).toEqual([]);
  });
});
