import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedCallback } from './useDebouncedCallback';

describe('useDebouncedCallback', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('delays execution by the specified delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));
    const [debounced] = result.current;

    act(() => { debounced(); });
    expect(callback).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(500); });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 300));
    const [debounced] = result.current;

    act(() => { debounced(); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { debounced(); }); // reset timer
    act(() => { vi.advanceTimersByTime(200); });
    expect(callback).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(100); });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('flush calls callback immediately and clears timer', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 1000));
    const [debounced, flush] = result.current;

    act(() => { debounced(); });
    act(() => { flush(); });
    expect(callback).toHaveBeenCalledTimes(1);

    // Original timer should not fire again
    act(() => { vi.advanceTimersByTime(1000); });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('flush is a no-op when no pending call', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback, 500));
    const [, flush] = result.current;

    act(() => { flush(); });
    expect(callback).not.toHaveBeenCalled();
  });

  it('uses default delay of 1000ms', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(callback));
    const [debounced] = result.current;

    act(() => { debounced(); });
    act(() => { vi.advanceTimersByTime(999); });
    expect(callback).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('cleans up timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500));
    const [debounced] = result.current;

    act(() => { debounced(); });
    unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(callback).not.toHaveBeenCalled();
  });
});
