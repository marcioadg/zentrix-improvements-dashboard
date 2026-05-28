import { describe, it, expect } from 'vitest';
import {
  calculateSectionDuration,
  calculateOverallDuration,
  calculateSessionDuration,
  formatDuration,
  validateTimerState,
  TimerState,
} from './TimerCalculations';

const baseState: TimerState = {
  meetingStartTime: 1000,
  sectionStartTime: 2000,
  currentTime: 5000,
  completedSectionDurations: {},
  isPaused: false,
  totalPauseDuration: 0,
  lastPauseTimestamp: null,
};

describe('calculateSectionDuration', () => {
  it('returns 0 when no section started', () => {
    expect(calculateSectionDuration({ ...baseState, sectionStartTime: null })).toBe(0);
  });

  it('calculates duration from section start to current time', () => {
    expect(calculateSectionDuration(baseState)).toBe(3000);
  });

  it('subtracts current pause time when paused', () => {
    const paused: TimerState = {
      ...baseState,
      isPaused: true,
      lastPauseTimestamp: 4000,
    };
    // 5000 - 2000 = 3000, minus (5000 - 4000) = 1000 pause → 2000
    expect(calculateSectionDuration(paused)).toBe(2000);
  });

  it('never returns negative', () => {
    const weird: TimerState = {
      ...baseState,
      sectionStartTime: 6000, // after currentTime
    };
    expect(calculateSectionDuration(weird)).toBe(0);
  });
});

describe('calculateOverallDuration', () => {
  it('returns 0 when meeting not started', () => {
    expect(calculateOverallDuration({ ...baseState, meetingStartTime: null })).toBe(0);
  });

  it('calculates total duration minus pauses', () => {
    const state: TimerState = { ...baseState, totalPauseDuration: 500 };
    // 5000 - 1000 - 500 = 3500
    expect(calculateOverallDuration(state)).toBe(3500);
  });

  it('subtracts current pause when paused', () => {
    const paused: TimerState = {
      ...baseState,
      isPaused: true,
      lastPauseTimestamp: 4500,
    };
    // 5000 - 1000 - 0 - (5000 - 4500) = 3500
    expect(calculateOverallDuration(paused)).toBe(3500);
  });
});

describe('calculateSessionDuration', () => {
  it('sums completed sections plus current section', () => {
    const state: TimerState = {
      ...baseState,
      completedSectionDurations: { 0: 1000, 1: 2000 },
    };
    // completed: 3000, current: 3000 → 6000
    expect(calculateSessionDuration(state)).toBe(6000);
  });

  it('returns 0 with no sections', () => {
    const state: TimerState = { ...baseState, sectionStartTime: null };
    expect(calculateSessionDuration(state)).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats zero and negative as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(-100)).toBe('00:00');
  });

  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('00:05');
    expect(formatDuration(65000)).toBe('01:05');
  });

  it('formats hours', () => {
    expect(formatDuration(3661000)).toBe('1:01:01');
  });
});

describe('validateTimerState', () => {
  it('accepts valid state', () => {
    expect(validateTimerState(baseState)).toBe(true);
  });

  it('rejects meeting start after current time', () => {
    expect(validateTimerState({ ...baseState, meetingStartTime: 9999 })).toBe(false);
  });

  it('rejects section start before meeting start', () => {
    expect(validateTimerState({ ...baseState, sectionStartTime: 500 })).toBe(false);
  });

  it('rejects paused state with no pause timestamp', () => {
    expect(validateTimerState({ ...baseState, isPaused: true })).toBe(false);
  });

  it('rejects pause timestamp after current time', () => {
    expect(
      validateTimerState({ ...baseState, isPaused: true, lastPauseTimestamp: 9999 })
    ).toBe(false);
  });
});
