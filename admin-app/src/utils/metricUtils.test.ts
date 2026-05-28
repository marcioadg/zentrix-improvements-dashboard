import { describe, it, expect, vi } from "vitest";

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { formatWeekDate, getOwnerInitials, checkTargetCondition, getTargetLogicSymbol } from './metricUtils';

describe('formatWeekDate', () => {
  it('formats a normal week with default sunday start', () => {
    const result = formatWeekDate('2026-03-01');
    expect(result).toBe('Mar 1 - Mar 7');
  });

  it('adjusts sunday start when date falls on Saturday', () => {
    const result = formatWeekDate('2026-02-28', 'sunday');
    expect(result).toBe('Mar 1 - Mar 7');
  });

  it('adjusts monday start when date falls on Sunday', () => {
    const result = formatWeekDate('2026-03-01', 'monday');
    expect(result).toBe('Mar 2 - Mar 8');
  });
});

describe('getOwnerInitials', () => {
  it('returns initials for two-word name', () => {
    expect(getOwnerInitials('John Doe')).toBe('JD');
  });

  it('returns single initial for one-word name', () => {
    expect(getOwnerInitials('Alice')).toBe('A');
  });

  it('returns empty string for empty input', () => {
    expect(getOwnerInitials('')).toBe('');
  });

  it('returns first+last initials for multiple words', () => {
    expect(getOwnerInitials('John Michael Smith Doe')).toBe('JD');
  });
});

describe('checkTargetCondition', () => {
  it('checks greater_than', () => {
    expect(checkTargetCondition(10, 5, 'greater_than')).toBe(true);
    expect(checkTargetCondition(5, 10, 'greater_than')).toBe(false);
  });

  it('checks less_than', () => {
    expect(checkTargetCondition(3, 5, 'less_than')).toBe(true);
    expect(checkTargetCondition(5, 3, 'less_than')).toBe(false);
  });

  it('checks equal', () => {
    expect(checkTargetCondition(5, 5, 'equal')).toBe(true);
    expect(checkTargetCondition(5, 6, 'equal')).toBe(false);
  });

  it('checks equal_to', () => {
    expect(checkTargetCondition(5, 5, 'equal_to')).toBe(true);
    expect(checkTargetCondition(5, 6, 'equal_to')).toBe(false);
  });

  it('checks greater_than_or_equal', () => {
    expect(checkTargetCondition(5, 5, 'greater_than_or_equal')).toBe(true);
    expect(checkTargetCondition(6, 5, 'greater_than_or_equal')).toBe(true);
    expect(checkTargetCondition(4, 5, 'greater_than_or_equal')).toBe(false);
  });

  it('checks less_than_or_equal', () => {
    expect(checkTargetCondition(5, 5, 'less_than_or_equal')).toBe(true);
    expect(checkTargetCondition(4, 5, 'less_than_or_equal')).toBe(true);
    expect(checkTargetCondition(6, 5, 'less_than_or_equal')).toBe(false);
  });

  it('defaults to >= for unknown logic', () => {
    expect(checkTargetCondition(5, 5, 'unknown')).toBe(true);
    expect(checkTargetCondition(6, 5, 'unknown')).toBe(true);
    expect(checkTargetCondition(4, 5, 'unknown')).toBe(false);
  });

  it('returns false for NaN values', () => {
    expect(checkTargetCondition(NaN, 5, 'greater_than')).toBe(false);
    expect(checkTargetCondition(5, NaN, 'greater_than')).toBe(false);
  });

  it('handles floating point tolerance for equal', () => {
    expect(checkTargetCondition(5.0005, 5.0001, 'equal')).toBe(true);
    expect(checkTargetCondition(5.0, 5.002, 'equal')).toBe(false);
  });
});

describe('getTargetLogicSymbol', () => {
  it('returns > for greater_than', () => {
    expect(getTargetLogicSymbol('greater_than')).toBe('>');
  });

  it('returns < for less_than', () => {
    expect(getTargetLogicSymbol('less_than')).toBe('<');
  });

  it('returns = for equal', () => {
    expect(getTargetLogicSymbol('equal')).toBe('=');
  });

  it('returns = for equal_to', () => {
    expect(getTargetLogicSymbol('equal_to')).toBe('=');
  });

  it('returns >= for greater_than_or_equal', () => {
    expect(getTargetLogicSymbol('greater_than_or_equal')).toBe('>=');
  });

  it('returns <= for less_than_or_equal', () => {
    expect(getTargetLogicSymbol('less_than_or_equal')).toBe('<=');
  });

  it('defaults to >= for unknown logic', () => {
    expect(getTargetLogicSymbol('unknown')).toBe('>=');
  });
});
