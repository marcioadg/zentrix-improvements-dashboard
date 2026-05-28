import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAdvancedCaching } from './useAdvancedCaching';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useAdvancedCaching', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('get returns null for missing key', () => {
    const { result } = renderHook(() => useAdvancedCaching<string>(), { wrapper: createWrapper() });
    expect(result.current.get('missing')).toBeNull();
  });

  it('set and get round-trip', () => {
    const { result } = renderHook(() => useAdvancedCaching<string>(), { wrapper: createWrapper() });

    act(() => { result.current.set('key1', 'hello'); });
    expect(result.current.get('key1')).toBe('hello');
  });

  it('get returns null for stale data when staleWhileRevalidate is false', () => {
    const { result } = renderHook(
      () => useAdvancedCaching<string>({ ttl: 1000, staleWhileRevalidate: false }),
      { wrapper: createWrapper() }
    );

    act(() => { result.current.set('k', 'val'); });
    act(() => { vi.advanceTimersByTime(1500); });

    expect(result.current.get('k')).toBeNull();
  });

  it('get returns stale data when staleWhileRevalidate is true (default)', () => {
    const { result } = renderHook(
      () => useAdvancedCaching<string>({ ttl: 1000 }),
      { wrapper: createWrapper() }
    );

    act(() => { result.current.set('k', 'val'); });
    act(() => { vi.advanceTimersByTime(1500); });

    expect(result.current.get('k')).toBe('val');
  });

  it('invalidate without pattern clears all entries', () => {
    const { result } = renderHook(() => useAdvancedCaching<string>(), { wrapper: createWrapper() });

    act(() => {
      result.current.set('a', '1');
      result.current.set('b', '2');
    });

    act(() => { result.current.invalidate(); });

    expect(result.current.get('a')).toBeNull();
    expect(result.current.get('b')).toBeNull();
  });

  it('invalidate with pattern only removes matching keys', () => {
    const { result } = renderHook(() => useAdvancedCaching<string>(), { wrapper: createWrapper() });

    act(() => {
      result.current.set('users-list', 'data1');
      result.current.set('users-detail', 'data2');
      result.current.set('posts-list', 'data3');
    });

    act(() => { result.current.invalidate('users'); });

    expect(result.current.get('users-list')).toBeNull();
    expect(result.current.get('users-detail')).toBeNull();
    expect(result.current.get('posts-list')).toBe('data3');
  });

  it('LRU cleanup removes least recently accessed entries when maxSize exceeded', () => {
    const { result } = renderHook(
      () => useAdvancedCaching<string>({ maxSize: 2 }),
      { wrapper: createWrapper() }
    );

    act(() => { result.current.set('a', '1'); });
    act(() => { vi.advanceTimersByTime(10); });
    act(() => { result.current.set('b', '2'); });
    act(() => { vi.advanceTimersByTime(10); });
    // Access 'a' to make it recently used
    act(() => { result.current.get('a'); });
    act(() => { vi.advanceTimersByTime(10); });
    // Adding 'c' should evict 'b' (least recently accessed)
    act(() => { result.current.set('c', '3'); });

    expect(result.current.get('a')).toBe('1');
    expect(result.current.get('c')).toBe('3');
    expect(result.current.get('b')).toBeNull();
  });

  it('stats object is available', () => {
    const { result } = renderHook(() => useAdvancedCaching<string>(), { wrapper: createWrapper() });

    expect(result.current.stats).toHaveProperty('size');
    expect(result.current.stats).toHaveProperty('hitRate');
    expect(result.current.stats).toHaveProperty('memoryUsage');
  });
});
