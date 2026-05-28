import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCooldownTracker } from './useCooldownTracker';

describe('useCooldownTracker', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns no cooldown when lastInvitedAt is null', () => {
    const { result } = renderHook(() => useCooldownTracker(null));

    expect(result.current.isInCooldown).toBe(false);
    expect(result.current.remainingTime).toBe(0);
    expect(result.current.remainingMinutes).toBe(0);
  });

  it('detects active cooldown when within cooldown period', () => {
    const now = new Date();
    // Invited 2 minutes ago with 5-minute cooldown
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

    const { result } = renderHook(() => useCooldownTracker(twoMinutesAgo, 5));

    expect(result.current.isInCooldown).toBe(true);
    expect(result.current.remainingTime).toBeGreaterThan(0);
    expect(result.current.remainingMinutes).toBeGreaterThan(0);
  });

  it('returns no cooldown when cooldown has expired', () => {
    const now = new Date();
    // Invited 10 minutes ago with 5-minute cooldown
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();

    const { result } = renderHook(() => useCooldownTracker(tenMinutesAgo, 5));

    expect(result.current.isInCooldown).toBe(false);
    expect(result.current.remainingTime).toBe(0);
    expect(result.current.remainingMinutes).toBe(0);
  });

  it('remainingMinutes is ceiling of remaining seconds / 60', () => {
    const now = new Date();
    // Invited 4 minutes ago with 5-minute cooldown → ~60 seconds remaining → 1 minute
    const fourMinutesAgo = new Date(now.getTime() - 4 * 60 * 1000).toISOString();

    const { result } = renderHook(() => useCooldownTracker(fourMinutesAgo, 5));

    expect(result.current.isInCooldown).toBe(true);
    expect(result.current.remainingMinutes).toBe(1);
  });

  it('uses default cooldownMinutes of 5', () => {
    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000).toISOString();

    const { result } = renderHook(() => useCooldownTracker(threeMinutesAgo));

    expect(result.current.isInCooldown).toBe(true);
  });
});
