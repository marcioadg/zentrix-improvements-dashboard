vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getMeetingCycleBoundary, getMeetingCycleBoundaryISO, isWithinMeetingCycle } from './meetingCycleUtils';

describe('getMeetingCycleBoundary', () => {
  it('returns a Date object', () => {
    const result = getMeetingCycleBoundary();
    expect(result).toBeInstanceOf(Date);
  });

  it('returns a Monday', () => {
    const result = getMeetingCycleBoundary();
    // getUTCDay() === 1 means Monday
    expect(result.getUTCDay()).toBe(1);
  });

  it('returns midnight UTC', () => {
    const result = getMeetingCycleBoundary();
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });
});

describe('getMeetingCycleBoundaryISO', () => {
  it('returns a valid ISO string', () => {
    const result = getMeetingCycleBoundaryISO();
    expect(typeof result).toBe('string');
    // Valid ISO string can be parsed back to a valid date
    const parsed = new Date(result);
    expect(parsed.getTime()).not.toBeNaN();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('matches getMeetingCycleBoundary as ISO', () => {
    const boundary = getMeetingCycleBoundary();
    const iso = getMeetingCycleBoundaryISO();
    expect(iso).toBe(boundary.toISOString());
  });
});

describe('isWithinMeetingCycle', () => {
  it('returns true for a recent date', () => {
    // Use a date from right now - should be within the cycle
    const recent = new Date().toISOString();
    expect(isWithinMeetingCycle(recent)).toBe(true);
  });

  it('returns false for a very old date', () => {
    expect(isWithinMeetingCycle('2020-01-01T00:00:00Z')).toBe(false);
  });

  it('returns true for a date exactly at the boundary', () => {
    const boundary = getMeetingCycleBoundary();
    expect(isWithinMeetingCycle(boundary.toISOString())).toBe(true);
  });

  it('returns false for a date just before the boundary', () => {
    const boundary = getMeetingCycleBoundary();
    const beforeBoundary = new Date(boundary.getTime() - 1);
    expect(isWithinMeetingCycle(beforeBoundary.toISOString())).toBe(false);
  });
});
