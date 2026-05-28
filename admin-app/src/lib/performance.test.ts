import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  throttle,
  prefetchRoute,
  preloadImage,
  isTouchDevice,
  getNetworkSpeed,
} from './performance';

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------
describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call func immediately', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls func after the wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(200);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on subsequent calls so only the last call fires', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced();
    vi.advanceTimersByTime(100); // half-way — timer still pending
    debounced();                 // reset the timer
    vi.advanceTimersByTime(100); // now 100 ms since the second call — not fired yet
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100); // full 200 ms since the second call
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments correctly to the original function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('hello', 42);
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('hello', 42);
  });
});

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------
describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls func immediately on the first call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('ignores subsequent calls within the limit period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    throttled();
    throttled();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('allows calls again after the limit period expires', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 200);

    throttled();
    vi.advanceTimersByTime(200);
    throttled();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('passes arguments correctly to the original function', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('world', 99);

    expect(fn).toHaveBeenCalledWith('world', 99);
  });
});

// ---------------------------------------------------------------------------
// prefetchRoute
// ---------------------------------------------------------------------------
describe('prefetchRoute', () => {
  it('appends a <link rel="prefetch"> element to document.head', () => {
    prefetchRoute('/dashboard');

    const links = document.head.querySelectorAll('link[rel="prefetch"]');
    const match = Array.from(links).find((el) => el.getAttribute('href') === '/dashboard');
    expect(match).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// preloadImage
// ---------------------------------------------------------------------------
describe('preloadImage', () => {
  it('appends a <link rel="preload" as="image"> element to document.head', () => {
    preloadImage('/images/hero.png');

    const links = document.head.querySelectorAll('link[rel="preload"][as="image"]');
    const match = Array.from(links).find((el) => el.getAttribute('href') === '/images/hero.png');
    expect(match).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isTouchDevice
// ---------------------------------------------------------------------------
describe('isTouchDevice', () => {
  it('returns true when ontouchstart is present on window', () => {
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });

    expect(isTouchDevice()).toBe(true);

    // Clean up — delete the property so 'ontouchstart' in window is false again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).ontouchstart;
  });

  it('returns true when navigator.maxTouchPoints > 0', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      writable: true,
      configurable: true,
    });

    expect(isTouchDevice()).toBe(true);

    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it('returns false when no touch APIs are present', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 0,
      writable: true,
      configurable: true,
    });

    // Ensure ontouchstart is absent from window entirely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).ontouchstart;

    expect(isTouchDevice()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getNetworkSpeed
// ---------------------------------------------------------------------------
describe('getNetworkSpeed', () => {
  const setConnection = (effectiveType: string | null) => {
    Object.defineProperty(navigator, 'connection', {
      value: effectiveType === null ? undefined : { effectiveType },
      writable: true,
      configurable: true,
    });
  };

  afterEach(() => {
    // Remove the connection stub after each test
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('returns "fast" when no connection API is available', () => {
    setConnection(null);
    expect(getNetworkSpeed()).toBe('fast');
  });

  it('returns "slow" for effectiveType "2g"', () => {
    setConnection('2g');
    expect(getNetworkSpeed()).toBe('slow');
  });

  it('returns "slow" for effectiveType "slow-2g"', () => {
    setConnection('slow-2g');
    expect(getNetworkSpeed()).toBe('slow');
  });

  it('returns "medium" for effectiveType "3g"', () => {
    setConnection('3g');
    expect(getNetworkSpeed()).toBe('medium');
  });

  it('returns "fast" for effectiveType "4g"', () => {
    setConnection('4g');
    expect(getNetworkSpeed()).toBe('fast');
  });
});
