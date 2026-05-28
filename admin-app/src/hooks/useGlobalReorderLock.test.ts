import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useGlobalReorderLock } from './useGlobalReorderLock';

describe('useGlobalReorderLock', () => {
  // Each test gets a fresh hook but the coordinator is a singleton,
  // so we unlock everything between tests.
  beforeEach(() => {
    const { result } = renderHook(() => useGlobalReorderLock());
    act(() => {
      result.current.setGlobalReordering(false);
      result.current.setGlobalReordering(false, 'section-a');
      result.current.setGlobalReordering(false, 'section-b');
    });
  });

  it('initially reports no reordering', () => {
    const { result } = renderHook(() => useGlobalReorderLock());

    expect(result.current.isGloballyReordering()).toBe(false);
    expect(result.current.isSectionReordering('any')).toBe(false);
  });

  it('global lock affects all sections', () => {
    const { result } = renderHook(() => useGlobalReorderLock());

    act(() => { result.current.setGlobalReordering(true); });

    expect(result.current.isGloballyReordering()).toBe(true);
    expect(result.current.isSectionReordering('any-section')).toBe(true);

    act(() => { result.current.setGlobalReordering(false); });
    expect(result.current.isGloballyReordering()).toBe(false);
  });

  it('section-scoped lock only affects that section', () => {
    const { result } = renderHook(() => useGlobalReorderLock());

    act(() => { result.current.setGlobalReordering(true, 'section-a'); });

    expect(result.current.isSectionReordering('section-a')).toBe(true);
    expect(result.current.isSectionReordering('section-b')).toBe(false);
    // isGloballyReordering returns true if ANY section is reordering
    expect(result.current.isGloballyReordering()).toBe(true);

    act(() => { result.current.setGlobalReordering(false, 'section-a'); });
    expect(result.current.isGloballyReordering()).toBe(false);
  });

  it('multiple sections can be locked independently', () => {
    const { result } = renderHook(() => useGlobalReorderLock());

    act(() => {
      result.current.setGlobalReordering(true, 'section-a');
      result.current.setGlobalReordering(true, 'section-b');
    });

    act(() => { result.current.setGlobalReordering(false, 'section-a'); });

    expect(result.current.isSectionReordering('section-a')).toBe(false);
    expect(result.current.isSectionReordering('section-b')).toBe(true);
    expect(result.current.isGloballyReordering()).toBe(true);
  });
});
