import { describe, it, expect } from 'vitest';
import { TimerEngine, TimerState } from './timerEngine';

const makeState = (overrides: Partial<TimerState> = {}): TimerState => ({
  meetingStartTime: null,
  sectionStartTime: null,
  currentSection: 0,
  sectionDurations: {},
  sectionAccumulatedTimes: {},
  isPaused: false,
  totalPauseDuration: 0,
  lastPauseTimestamp: null,
  pauseHistory: [],
  ...overrides,
});

describe('TimerEngine', () => {
  describe('calculateDurations', () => {
    it('returns zeros when meeting has not started', () => {
      const result = TimerEngine.calculateDurations(makeState());
      expect(result).toEqual({
        overallDurationMs: 0,
        sectionDurationMs: 0,
        totalPauseDurationMs: 0,
        activeDurationMs: 0,
        sectionAccumulatedMs: 0,
      });
    });

    it('calculates overall duration from meeting start', () => {
      const now = 10000;
      const state = makeState({ meetingStartTime: 5000 });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.overallDurationMs).toBe(5000);
      expect(result.activeDurationMs).toBe(5000);
    });

    it('subtracts pause duration from active time', () => {
      const now = 20000;
      const state = makeState({
        meetingStartTime: 10000,
        totalPauseDuration: 3000,
      });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.overallDurationMs).toBe(10000);
      expect(result.totalPauseDurationMs).toBe(3000);
      expect(result.activeDurationMs).toBe(7000);
    });

    it('includes current pause in calculations', () => {
      const now = 20000;
      const state = makeState({
        meetingStartTime: 10000,
        isPaused: true,
        lastPauseTimestamp: 18000,
        totalPauseDuration: 1000,
      });
      const result = TimerEngine.calculateDurations(state, now);
      // total pause = 1000 + (20000-18000) = 3000
      expect(result.totalPauseDurationMs).toBe(3000);
      expect(result.activeDurationMs).toBe(7000);
    });

    it('calculates section duration', () => {
      const now = 15000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
      });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.sectionDurationMs).toBe(5000);
    });

    it('subtracts current pause from section duration', () => {
      const now = 20000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        isPaused: true,
        lastPauseTimestamp: 18000,
      });
      const result = TimerEngine.calculateDurations(state, now);
      // section = (20000-10000) - (20000-18000) = 10000 - 2000 = 8000
      expect(result.sectionDurationMs).toBe(8000);
    });

    it('never returns negative section duration', () => {
      const now = 10001;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        isPaused: true,
        lastPauseTimestamp: 8000, // pause started before section (edge case)
      });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.sectionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('accumulates section times from previous visits', () => {
      const now = 15000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        currentSection: 2,
        sectionAccumulatedTimes: { 2: 3000 },
      });
      const result = TimerEngine.calculateDurations(state, now);
      // accumulated = 3000 (previous) + 5000 (current section duration) = 8000
      expect(result.sectionAccumulatedMs).toBe(8000);
    });

    it('handles zero accumulated time for new section', () => {
      const now = 12000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        currentSection: 0,
        sectionAccumulatedTimes: {},
      });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.sectionAccumulatedMs).toBe(2000);
    });

    it('clamps active duration to at least zero', () => {
      const now = 11000;
      const state = makeState({
        meetingStartTime: 10000,
        totalPauseDuration: 5000, // more pause than total
      });
      const result = TimerEngine.calculateDurations(state, now);
      expect(result.activeDurationMs).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats zero', () => {
      expect(TimerEngine.formatDuration(0)).toBe('0:00');
    });

    it('formats seconds only', () => {
      expect(TimerEngine.formatDuration(5000)).toBe('0:05');
      expect(TimerEngine.formatDuration(45000)).toBe('0:45');
    });

    it('formats minutes and seconds', () => {
      expect(TimerEngine.formatDuration(60000)).toBe('1:00');
      expect(TimerEngine.formatDuration(125000)).toBe('2:05');
    });

    it('formats with hours', () => {
      expect(TimerEngine.formatDuration(3600000)).toBe('1:00:00');
      expect(TimerEngine.formatDuration(3661000)).toBe('1:01:01');
      expect(TimerEngine.formatDuration(7265000)).toBe('2:01:05');
    });

    it('returns 0:00 for negative values', () => {
      expect(TimerEngine.formatDuration(-1000)).toBe('0:00');
    });

    it('pads seconds with leading zero', () => {
      expect(TimerEngine.formatDuration(9000)).toBe('0:09');
    });
  });

  describe('isOvertime', () => {
    it('returns true when over target', () => {
      expect(TimerEngine.isOvertime(5000, 3000)).toBe(true);
    });

    it('returns false when under target', () => {
      expect(TimerEngine.isOvertime(2000, 3000)).toBe(false);
    });

    it('returns false when exactly at target', () => {
      expect(TimerEngine.isOvertime(3000, 3000)).toBe(false);
    });
  });

  describe('getOvertimeAmount', () => {
    it('returns overtime amount', () => {
      expect(TimerEngine.getOvertimeAmount(5000, 3000)).toBe(2000);
    });

    it('returns zero when under target', () => {
      expect(TimerEngine.getOvertimeAmount(2000, 3000)).toBe(0);
    });

    it('returns zero when exactly at target', () => {
      expect(TimerEngine.getOvertimeAmount(3000, 3000)).toBe(0);
    });
  });

  describe('updateSectionAccumulatedTime', () => {
    it('returns updated accumulated times for current section', () => {
      const now = 15000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        currentSection: 1,
        sectionAccumulatedTimes: { 0: 4000 },
      });
      const result = TimerEngine.updateSectionAccumulatedTime(state, now);
      expect(result[1]).toBe(5000); // new section accumulated
      expect(result[0]).toBe(4000); // previous section preserved
    });

    it('adds to existing accumulated time', () => {
      const now = 15000;
      const state = makeState({
        meetingStartTime: 5000,
        sectionStartTime: 10000,
        currentSection: 1,
        sectionAccumulatedTimes: { 1: 2000 },
      });
      const result = TimerEngine.updateSectionAccumulatedTime(state, now);
      expect(result[1]).toBe(7000); // 2000 previous + 5000 current
    });
  });
});
