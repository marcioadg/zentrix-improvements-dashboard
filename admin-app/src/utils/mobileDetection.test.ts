import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./platformDetection', () => ({
  isMobilePlatform: vi.fn(() => false),
}));
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn() },
}));

import { getMobileRoute } from './mobileDetection';

describe('getMobileRoute', () => {
  it('maps known desktop routes to mobile', () => {
    expect(getMobileRoute('/dashboard')).toBe('/m/tasks');
    expect(getMobileRoute('/goals')).toBe('/m/goals');
    expect(getMobileRoute('/issues')).toBe('/m/issues');
    expect(getMobileRoute('/metrics')).toBe('/m/metrics');
    expect(getMobileRoute('/settings')).toBe('/m/settings');
  });

  it('defaults to /m/tasks for unknown routes', () => {
    expect(getMobileRoute('/unknown')).toBe('/m/tasks');
    expect(getMobileRoute('/foo/bar')).toBe('/m/tasks');
  });
});
