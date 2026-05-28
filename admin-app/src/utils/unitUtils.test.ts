import { describe, it, expect, vi } from "vitest";

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { formatUnit } from './unitUtils';

describe('formatUnit', () => {
  it('maps percentage to %', () => {
    expect(formatUnit('percentage')).toBe('%');
  });

  it('maps currency to $', () => {
    expect(formatUnit('currency')).toBe('$');
  });

  it('maps number to #', () => {
    expect(formatUnit('number')).toBe('#');
  });

  it('maps time to time', () => {
    expect(formatUnit('time')).toBe('time');
  });

  it('maps yes/no to Y/N', () => {
    expect(formatUnit('yes/no')).toBe('Y/N');
  });

  it('is case insensitive', () => {
    expect(formatUnit('PERCENTAGE')).toBe('%');
  });

  it('returns unknown unit as-is', () => {
    expect(formatUnit('widgets')).toBe('widgets');
  });

  it('returns empty string for empty input', () => {
    expect(formatUnit('')).toBe('');
  });
});
