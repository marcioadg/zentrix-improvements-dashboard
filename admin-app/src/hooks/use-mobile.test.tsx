import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/utils/mobileDetection', () => ({
  isMobileOrTabletDevice: vi.fn(() => false),
}));

import { useIsMobile } from './use-mobile';
import { isMobileOrTabletDevice } from '@/utils/mobileDetection';

const mockedDetection = vi.mocked(isMobileOrTabletDevice);

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false on desktop devices', () => {
    mockedDetection.mockReturnValue(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('returns true on mobile devices', () => {
    mockedDetection.mockReturnValue(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('calls isMobileOrTabletDevice on mount', () => {
    mockedDetection.mockReturnValue(false);

    renderHook(() => useIsMobile());

    // Called once for initial state + once in useEffect
    expect(mockedDetection).toHaveBeenCalled();
  });
});
