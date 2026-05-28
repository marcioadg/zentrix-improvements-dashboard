import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/celebration', () => ({
  celebrate: vi.fn(),
}));

import { syncStatusFromProgress, syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';
import { celebrate } from '@/lib/celebration';

const mockCelebrate = vi.mocked(celebrate);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('syncStatusFromProgress', () => {
  it('reaching 100% from non-100 sets status to complete with celebration', () => {
    const result = syncStatusFromProgress(75, 100, 'on_track');
    expect(result.status).toBe('complete');
    expect(result.shouldCelebrate).toBe(true);
  });

  it('staying at 100% (100→100) produces no status change and no celebration', () => {
    const result = syncStatusFromProgress(100, 100, 'complete');
    expect(result.status).toBeUndefined();
    expect(result.shouldCelebrate).toBe(false);
  });

  it('dropping from 100 to 50 when status is complete reverts to on_track without celebration', () => {
    const result = syncStatusFromProgress(100, 50, 'complete');
    expect(result.status).toBe('on_track');
    expect(result.shouldCelebrate).toBe(false);
  });

  it('dropping from 50 to 30 when status is not complete produces no status change', () => {
    const result = syncStatusFromProgress(50, 30, 'on_track');
    expect(result.status).toBeUndefined();
    expect(result.shouldCelebrate).toBe(false);
  });

  it('going from 0 to 50 produces no status change', () => {
    const result = syncStatusFromProgress(0, 50, 'on_track');
    expect(result.status).toBeUndefined();
    expect(result.shouldCelebrate).toBe(false);
  });

  it('reaching 100% from 99 sets status to complete with celebration', () => {
    const result = syncStatusFromProgress(99, 100, 'on_track');
    expect(result.status).toBe('complete');
    expect(result.shouldCelebrate).toBe(true);
  });
});

describe('syncProgressFromStatus', () => {
  it('status complete when progress < 100 sets progress to 100 with celebration', () => {
    const result = syncProgressFromStatus('complete', 60);
    expect(result.progress).toBe(100);
    expect(result.shouldCelebrate).toBe(true);
  });

  it('status complete when progress already 100 leaves progress undefined with celebration', () => {
    const result = syncProgressFromStatus('complete', 100);
    expect(result.progress).toBeUndefined();
    expect(result.shouldCelebrate).toBe(true);
  });

  it('status on_track produces no progress change and no celebration', () => {
    const result = syncProgressFromStatus('on_track', 50);
    expect(result.progress).toBeUndefined();
    expect(result.shouldCelebrate).toBe(false);
  });

  it('status off_track produces no progress change and no celebration', () => {
    const result = syncProgressFromStatus('off_track', 30);
    expect(result.progress).toBeUndefined();
    expect(result.shouldCelebrate).toBe(false);
  });
});

describe('triggerCelebrationSafely', () => {
  it('calls celebrate()', () => {
    triggerCelebrationSafely();
    expect(mockCelebrate).toHaveBeenCalledOnce();
  });

  it('does not throw if celebrate() throws', () => {
    mockCelebrate.mockImplementationOnce(() => {
      throw new Error('celebration failed');
    });
    expect(() => triggerCelebrationSafely()).not.toThrow();
  });
});
