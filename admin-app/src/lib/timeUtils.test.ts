import { formatDuration, formatTime } from './timeUtils';

describe('formatDuration', () => {
  it('formats 0ms', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(5000)).toBe('0:05');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(65000)).toBe('1:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3661000)).toBe('1:01:01');
  });

  it('pads minutes and seconds correctly', () => {
    expect(formatDuration(3600000)).toBe('1:00:00');
    expect(formatDuration(7384000)).toBe('2:03:04');
  });
});

describe('formatTime', () => {
  it('produces a valid time string', () => {
    const date = new Date(2026, 0, 1, 14, 30, 45);
    const result = formatTime(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
