import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useSmartRetry } from './useSmartRetry';

describe('useSmartRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('has correct initial state', () => {
    const op = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useSmartRetry(op));

    expect(result.current.retrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.nextRetryIn).toBe(0);
  });

  it('successful retry resets retryCount', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useSmartRetry(op, { baseDelay: 100 }));

    await act(async () => {
      const promise = result.current.retry();
      await vi.advanceTimersByTimeAsync(200);
      await promise;
    });

    expect(op).toHaveBeenCalledTimes(1);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.retrying).toBe(false);
  });

  it('failed retry increments retryCount', async () => {
    // Use a function that rejects, but catch the unhandled rejection at process level
    const op = vi.fn().mockImplementation(() => Promise.reject(new Error('fail')));
    const { result } = renderHook(() => useSmartRetry(op, { baseDelay: 100 }));

    await act(async () => {
      const promise = result.current.retry().catch(() => {/* swallow */});
      await vi.advanceTimersByTimeAsync(300);
      await promise;
    });

    expect(result.current.retryCount).toBe(1);
    expect(result.current.canRetry).toBe(true);
  });

  it('reset clears all state', async () => {
    const op = vi.fn().mockImplementation(() => Promise.reject(new Error('fail')));
    const { result } = renderHook(() => useSmartRetry(op, { baseDelay: 50 }));

    await act(async () => {
      const promise = result.current.retry().catch(() => {/* swallow */});
      await vi.advanceTimersByTimeAsync(200);
      await promise;
    });

    expect(result.current.retryCount).toBe(1);

    act(() => { result.current.reset(); });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.retrying).toBe(false);
  });

  it('does not execute operation when max attempts reached', async () => {
    const op = vi.fn().mockImplementation(() => Promise.reject(new Error('fail')));
    const { result } = renderHook(() => useSmartRetry(op, { maxAttempts: 1, baseDelay: 50 }));

    await act(async () => {
      const promise = result.current.retry().catch(() => {/* swallow */});
      await vi.advanceTimersByTimeAsync(200);
      await promise;
    });

    expect(result.current.canRetry).toBe(false);
    op.mockClear();

    await act(async () => {
      await result.current.retry();
    });

    expect(op).not.toHaveBeenCalled();
  });
});
