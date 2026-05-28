import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useClickLimiter } from './useClickLimiter';

describe('useClickLimiter', () => {
  const defaultOptions = { maxClicks: 3, resetAfter: 5000 };

  it('has correct initial state', () => {
    const { result } = renderHook(() => useClickLimiter(defaultOptions));

    expect(result.current.clickCount).toBe(0);
    expect(result.current.isLimited).toBe(false);
    expect(result.current.remainingClicks).toBe(3);
  });

  it('handleClick increments count and calls callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useClickLimiter(defaultOptions));

    act(() => {
      result.current.handleClick(callback);
    });

    expect(result.current.clickCount).toBe(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('after maxClicks reached, isLimited is true and further clicks do not call callback', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useClickLimiter(defaultOptions));

    // Each click in its own act() so state updates between calls
    act(() => { result.current.handleClick(callback); });
    act(() => { result.current.handleClick(callback); });
    act(() => { result.current.handleClick(callback); });

    expect(result.current.isLimited).toBe(true);
    expect(callback).toHaveBeenCalledTimes(3);

    const extraCallback = vi.fn();
    act(() => {
      result.current.handleClick(extraCallback);
    });

    expect(extraCallback).not.toHaveBeenCalled();
  });

  it('reset() resets all state', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useClickLimiter(defaultOptions));

    act(() => { result.current.handleClick(callback); });
    act(() => { result.current.handleClick(callback); });

    expect(result.current.clickCount).toBe(2);

    act(() => {
      result.current.reset();
    });

    expect(result.current.clickCount).toBe(0);
    expect(result.current.isLimited).toBe(false);
    expect(result.current.remainingClicks).toBe(3);
  });

  it('remainingClicks decreases correctly', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useClickLimiter(defaultOptions));

    expect(result.current.remainingClicks).toBe(3);

    act(() => {
      result.current.handleClick(callback);
    });
    expect(result.current.remainingClicks).toBe(2);

    act(() => {
      result.current.handleClick(callback);
    });
    expect(result.current.remainingClicks).toBe(1);
  });
});
