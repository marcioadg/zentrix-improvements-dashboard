import { describe, it, expect } from 'vitest';
import { formatDateLocal, getDayBefore, getDayAfter } from './localeDateUtils';

describe('formatDateLocal', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(formatDateLocal(new Date(2024, 0, 5))).toBe('2024-01-05');
  });

  it('pads single-digit month and day', () => {
    expect(formatDateLocal(new Date(2024, 2, 3))).toBe('2024-03-03');
  });

  it('handles December correctly', () => {
    expect(formatDateLocal(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});

describe('getDayBefore', () => {
  it('returns the previous day', () => {
    expect(getDayBefore('2024-03-15')).toBe('2024-03-14');
  });

  it('crosses month boundary', () => {
    expect(getDayBefore('2024-03-01')).toBe('2024-02-29');
  });

  it('crosses year boundary', () => {
    expect(getDayBefore('2024-01-01')).toBe('2023-12-31');
  });
});

describe('getDayAfter', () => {
  it('returns the next day', () => {
    expect(getDayAfter('2024-03-15')).toBe('2024-03-16');
  });

  it('crosses month boundary', () => {
    expect(getDayAfter('2024-02-29')).toBe('2024-03-01');
  });

  it('crosses year boundary', () => {
    expect(getDayAfter('2024-12-31')).toBe('2025-01-01');
  });
});
