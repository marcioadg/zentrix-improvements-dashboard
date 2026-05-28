import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const matchMediaMock = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  matchMediaMock.mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  window.matchMedia = matchMediaMock;
});

import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  it('returns matches false by default', () => {
    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.matches).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns matches true when media query matches', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current.matches).toBe(true);
    expect(result.current.isMobile).toBe(true);
  });

  it('uses default query when none provided', () => {
    renderHook(() => useMediaQuery());

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 768px)');
  });

  it('uses custom query when provided', () => {
    renderHook(() => useMediaQuery('(min-width: 1024px)'));

    expect(matchMediaMock).toHaveBeenCalledWith('(min-width: 1024px)');
  });

  it('adds and removes resize event listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useMediaQuery());

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('updates matches on resize via matchMedia change', () => {
    // The hook captures the MediaQueryList in the effect closure.
    // On resize, it reads media.matches from that captured object.
    // We need to make the object mutable so the resize handler sees the change.
    const mediaObj = { matches: false };
    matchMediaMock.mockReturnValue(mediaObj);

    let resizeHandler: (() => void) | undefined;
    vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'resize') resizeHandler = handler as () => void;
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});

    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.matches).toBe(false);

    // Mutate the captured media object so the resize handler sees true
    mediaObj.matches = true;

    act(() => {
      resizeHandler?.();
    });

    expect(result.current.matches).toBe(true);
  });
});
