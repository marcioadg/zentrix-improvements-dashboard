import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

import { useAutosaveText } from './useAutosaveText';

describe('useAutosaveText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state', () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAutosaveText('hello', { onSave })
    );

    expect(result.current.isSaving).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(true); // 'hello' !== ''
  });

  it('triggers save after debounce delay', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutosaveText('hello', { onSave, delay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).toHaveBeenCalledWith('hello');
  });

  it('does not save when disabled', async () => {
    const onSave = vi.fn();
    renderHook(() =>
      useAutosaveText('hello', { onSave, delay: 1000, enabled: false })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save empty text', async () => {
    const onSave = vi.fn();
    renderHook(() =>
      useAutosaveText('', { onSave, delay: 1000 })
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('debounces rapid text changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ text }) => useAutosaveText(text, { onSave, delay: 1000 }),
      { initialProps: { text: 'a' } }
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    rerender({ text: 'ab' });

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    rerender({ text: 'abc' });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should only save the final value
    expect(onSave).toHaveBeenCalledWith('abc');
  });

  it('handles save errors gracefully', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('fail'));
    renderHook(() =>
      useAutosaveText('text', { onSave, delay: 500 })
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Should not throw
    expect(onSave).toHaveBeenCalled();
  });
});
