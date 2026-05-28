import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

import { useAutosave } from './useAutosave';

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave({ key: 'val' }, saveFn));

    expect(result.current.hasUnsavedChanges).toBe(true); // data !== lastSavedRef ('')
    expect(result.current.isSaving).toBe(false);
    expect(typeof result.current.forceSave).toBe('function');
  });

  it('triggers save after delay when data changes', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave('test-data', saveFn, 1000));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saveFn).toHaveBeenCalledWith('test-data');
  });

  it('does not save when disabled', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave('data', saveFn, 1000, false));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saveFn).not.toHaveBeenCalled();
  });

  it('debounces saves on rapid data changes', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ data }) => useAutosave(data, saveFn, 1000),
      { initialProps: { data: 'v1' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    rerender({ data: 'v2' });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // First timer was cleared, second hasn't fired yet
    expect(saveFn).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(saveFn).toHaveBeenCalledWith('v2');
  });

  it('forceSave triggers immediate save', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutosave('data', saveFn, 5000));

    await act(async () => {
      await result.current.forceSave();
    });

    expect(saveFn).toHaveBeenCalledWith('data');
  });

  it('handles save errors gracefully', async () => {
    const saveFn = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => useAutosave('data', saveFn, 1000));

    await act(async () => {
      await result.current.forceSave();
    });

    // Should not throw, error is caught internally
    expect(saveFn).toHaveBeenCalled();
  });

  it('cleans up timeout on unmount', async () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useAutosave('data', saveFn, 1000));

    unmount();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saveFn).not.toHaveBeenCalled();
  });
});
