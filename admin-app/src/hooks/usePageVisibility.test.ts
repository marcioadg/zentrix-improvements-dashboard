import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageVisibility } from './usePageVisibility';

describe('usePageVisibility', () => {
  let hiddenDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    if (hiddenDescriptor) {
      Object.defineProperty(document, 'hidden', hiddenDescriptor);
    } else {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    }
  });

  it('reports visible when document is not hidden', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current.isVisible).toBe(true);
  });

  it('tracks visibility changes', () => {
    const { result } = renderHook(() => usePageVisibility());

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isVisible).toBe(false);

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('shouldRefetchOnVisibility returns false if page was never hidden', () => {
    const { result } = renderHook(() => usePageVisibility());
    expect(result.current.shouldRefetchOnVisibility()).toBe(false);
  });

  it('shouldRefetchOnVisibility returns true after being hidden for > 5 minutes', () => {
    const { result } = renderHook(() => usePageVisibility());

    // Hide the page
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Advance time by 6 minutes
    act(() => { vi.advanceTimersByTime(6 * 60 * 1000); });

    // Show the page again
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.shouldRefetchOnVisibility()).toBe(true);
  });

  it('shouldRefetchOnVisibility returns false after short hide', () => {
    const { result } = renderHook(() => usePageVisibility());

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => { vi.advanceTimersByTime(60 * 1000); }); // 1 minute

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.shouldRefetchOnVisibility()).toBe(false);
  });

  it('shouldRefetchOnVisibility resets after being called', () => {
    const { result } = renderHook(() => usePageVisibility());

    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => { vi.advanceTimersByTime(6 * 60 * 1000); });

    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.shouldRefetchOnVisibility()).toBe(true);
    // Second call should return false (reset after check)
    expect(result.current.shouldRefetchOnVisibility()).toBe(false);
  });
});
