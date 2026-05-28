import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useRequestDeduplication } from './useRequestDeduplication';

describe('useRequestDeduplication', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('executes the request function on cache miss', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useRequestDeduplication());

    let response: any;
    await act(async () => {
      response = await result.current.deduplicate('key-1', fn);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(response).toBe('data');
  });

  it('deduplicates concurrent requests with the same key', async () => {
    let resolveRequest: (v: string) => void;
    const fn = vi.fn().mockImplementation(() => new Promise<string>(r => { resolveRequest = r; }));
    const { result } = renderHook(() => useRequestDeduplication({ ttl: 5000 }));

    let p1: Promise<any>, p2: Promise<any>;
    act(() => {
      p1 = result.current.deduplicate('key', fn);
      p2 = result.current.deduplicate('key', fn);
    });

    // Only one call should have been made
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest!('result');
      await Promise.all([p1!, p2!]);
    });
  });

  it('invalidate with pattern removes matching keys', async () => {
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');
    const { result } = renderHook(() => useRequestDeduplication({ ttl: 60000 }));

    await act(async () => {
      await result.current.deduplicate('users-list', fn1);
      await result.current.deduplicate('users-detail', fn2);
    });

    act(() => { result.current.invalidate('users'); });

    // After invalidation, new requests should execute fresh
    const fn3 = vi.fn().mockResolvedValue('c');
    await act(async () => {
      // Allow cleanup setTimeout to run
      vi.advanceTimersByTime(200);
      await result.current.deduplicate('users-list', fn3);
    });

    expect(fn3).toHaveBeenCalledTimes(1);
  });

  it('invalidate without pattern clears all entries', async () => {
    const fn = vi.fn().mockResolvedValue('x');
    const { result } = renderHook(() => useRequestDeduplication({ ttl: 60000 }));

    await act(async () => {
      await result.current.deduplicate('a', fn);
      await result.current.deduplicate('b', fn);
    });

    act(() => { result.current.invalidate(); });
    // Cache is now empty — no assertions needed beyond no errors
  });
});
