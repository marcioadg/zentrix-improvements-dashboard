import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delays function execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('resets timer on subsequent calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    debouncedFn();
    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('passes arguments to the original function', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('hello', 42, { key: 'value' });
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith('hello', 42, { key: 'value' });
  });

  it('calls function only once with multiple rapid calls', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn(1);
    debouncedFn(2);
    debouncedFn(3);
    debouncedFn(4);
    debouncedFn(5);

    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith(5);
  });

  it('has a cancel method that prevents execution', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn.cancel();
    vi.advanceTimersByTime(100);

    expect(mockFn).not.toHaveBeenCalled();
  });

  it('allows re-invocation after cancel', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn.cancel();

    debouncedFn('second');
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith('second');
  });

  it('works with zero delay', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 0);

    debouncedFn('test');
    vi.advanceTimersByTime(0);

    expect(mockFn).toHaveBeenCalledOnce();
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('maintains separate state for multiple instances', () => {
    const mockFn1 = vi.fn();
    const mockFn2 = vi.fn();
    const debouncedFn1 = debounce(mockFn1, 100);
    const debouncedFn2 = debounce(mockFn2, 100);

    debouncedFn1('a');
    debouncedFn2('b');

    vi.advanceTimersByTime(100);

    expect(mockFn1).toHaveBeenCalledOnce();
    expect(mockFn2).toHaveBeenCalledOnce();
    expect(mockFn1).toHaveBeenCalledWith('a');
    expect(mockFn2).toHaveBeenCalledWith('b');
  });

  it('cancel on inactive timer does not throw', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledOnce();

    // Cancel after execution
    expect(() => debouncedFn.cancel()).not.toThrow();
    expect(mockFn).toHaveBeenCalledOnce();
  });

  it('handles function that throws error', () => {
    const mockFn = vi.fn(() => {
      throw new Error('Function error');
    });
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    expect(() => {
      vi.advanceTimersByTime(100);
    }).toThrow('Function error');
  });

  it('works with different argument types', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 50);

    // Test with various types
    debouncedFn(null, undefined, true, 0, '', [], {});
    vi.advanceTimersByTime(50);

    expect(mockFn).toHaveBeenCalledWith(null, undefined, true, 0, '', [], {});
  });
});
