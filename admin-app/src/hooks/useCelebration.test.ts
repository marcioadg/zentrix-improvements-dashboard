import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockConfetti = vi.fn();
vi.mock('canvas-confetti', () => ({ default: mockConfetti }));

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), log: vi.fn(), warn: vi.fn() },
}));

// Mock matchMedia for reduced motion checks
const matchMediaMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  matchMediaMock.mockReturnValue({ matches: false });
  window.matchMedia = matchMediaMock;

  // Mock AudioContext
  const mockOscillator = {
    connect: vi.fn(),
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn(),
  };
  const mockGainNode = {
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  };
  (window as any).AudioContext = vi.fn().mockImplementation(() => ({
    state: 'running',
    currentTime: 0,
    destination: {},
    createOscillator: () => mockOscillator,
    createGain: () => mockGainNode,
    resume: vi.fn().mockResolvedValue(undefined),
  }));
});

// Need to reset the module-level state between tests
let useCelebration: typeof import('./useCelebration').useCelebration;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('./useCelebration');
  useCelebration = mod.useCelebration;
});

describe('useCelebration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns expected API', () => {
    const { result } = renderHook(() => useCelebration());

    expect(typeof result.current.triggerCelebration).toBe('function');
    expect(typeof result.current.disableAudio).toBe('function');
    expect(typeof result.current.enableAudio).toBe('function');
    expect(typeof result.current.isAudioEnabled).toBe('function');
  });

  it('isAudioEnabled returns true by default', () => {
    const { result } = renderHook(() => useCelebration());

    expect(result.current.isAudioEnabled()).toBe(true);
  });

  it('disableAudio sets audio disabled', () => {
    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.disableAudio();
    });

    expect(result.current.isAudioEnabled()).toBe(false);
  });

  it('enableAudio re-enables audio', () => {
    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.disableAudio();
    });

    act(() => {
      result.current.enableAudio();
    });

    expect(result.current.isAudioEnabled()).toBe(true);
  });

  it('triggerCelebration fires confetti', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.triggerCelebration();
    });

    expect(mockConfetti).toHaveBeenCalledWith(
      expect.objectContaining({
        particleCount: 80,
        spread: 60,
      })
    );
  });

  it('skips confetti when reduced motion is preferred', () => {
    matchMediaMock.mockReturnValue({ matches: true });
    vi.useFakeTimers();

    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.triggerCelebration();
    });

    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('prevents multiple simultaneous celebrations', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCelebration());

    act(() => {
      result.current.triggerCelebration();
      result.current.triggerCelebration();
    });

    expect(mockConfetti).toHaveBeenCalledTimes(1);

    // After the queue timeout, it should allow again
    act(() => {
      vi.advanceTimersByTime(300);
    });

    act(() => {
      result.current.triggerCelebration();
    });

    expect(mockConfetti).toHaveBeenCalledTimes(2);
  });
});
