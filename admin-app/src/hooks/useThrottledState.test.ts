import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThrottledState } from './useThrottledState';

describe('useThrottledState', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns initial value', () => {
    const { result } = renderHook(() => useThrottledState('hello'));
    expect(result.current[0]).toBe('hello');
  });

  it('delays state update by the specified delay', () => {
    const { result } = renderHook(() => useThrottledState(0, 200));

    act(() => { result.current[1](42); });
    expect(result.current[0]).toBe(0); // not yet updated

    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current[0]).toBe(42);
  });

  it('only applies the last value when called rapidly', () => {
    const { result } = renderHook(() => useThrottledState(0, 100));

    act(() => { result.current[1](1); });
    act(() => { result.current[1](2); });
    act(() => { result.current[1](3); });

    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current[0]).toBe(3);
  });

  it('supports updater function', () => {
    const { result } = renderHook(() => useThrottledState(10, 100));

    act(() => { result.current[1]((prev) => prev + 5); });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current[0]).toBe(15);
  });

  it('chained updater functions use pending value', () => {
    const { result } = renderHook(() => useThrottledState(0, 100));

    act(() => {
      result.current[1]((prev) => prev + 1);
      result.current[1]((prev) => prev + 1);
      result.current[1]((prev) => prev + 1);
    });

    act(() => { vi.advanceTimersByTime(100); });
    // Each updater uses pendingValueRef.current which is updated synchronously
    expect(result.current[0]).toBe(3);
  });

  it('uses default delay of 100ms', () => {
    const { result } = renderHook(() => useThrottledState('a'));

    act(() => { result.current[1]('b'); });
    act(() => { vi.advanceTimersByTime(99); });
    expect(result.current[0]).toBe('a');

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).toBe('b');
  });
});
