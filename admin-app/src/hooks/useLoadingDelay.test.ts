import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useLoadingDelay } from './useLoadingDelay';

describe('useLoadingDelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when isLoading is false', () => {
    const { result } = renderHook(() => useLoadingDelay(false));
    expect(result.current).toBe(false);
  });

  it('stays false before delay elapses when isLoading is true', () => {
    const { result } = renderHook(() => useLoadingDelay(true, 200));
    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);
  });

  it('becomes true after delay elapses when isLoading is true', () => {
    const { result } = renderHook(() => useLoadingDelay(true, 200));

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(true);
  });

  it('resets to false immediately when isLoading becomes false before timer fires', () => {
    const { result, rerender } = renderHook(
      ({ isLoading }) => useLoadingDelay(isLoading, 200),
      { initialProps: { isLoading: true } }
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);

    rerender({ isLoading: false });

    expect(result.current).toBe(false);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(false);
  });
});
