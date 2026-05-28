import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { teamsFetchCircuitBreaker } from './circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    teamsFetchCircuitBreaker.forceReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('successful execute returns result and state stays CLOSED', async () => {
    const result = await teamsFetchCircuitBreaker.execute(() => Promise.resolve('ok'), 'test-op');
    expect(result).toBe('ok');
    expect(teamsFetchCircuitBreaker.getState().state).toBe('CLOSED');
  });

  it('opens circuit after 5 failures and throws on next call', async () => {
    const failingOp = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 5; i++) {
      await expect(teamsFetchCircuitBreaker.execute(failingOp, 'test-op')).rejects.toThrow();
    }

    expect(teamsFetchCircuitBreaker.getState().state).toBe('OPEN');

    await expect(
      teamsFetchCircuitBreaker.execute(() => Promise.resolve('ok'), 'test-op')
    ).rejects.toThrow();
  });

  it('forceReset resets circuit to CLOSED', async () => {
    const failingOp = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 5; i++) {
      await expect(teamsFetchCircuitBreaker.execute(failingOp, 'test-op')).rejects.toThrow();
    }

    expect(teamsFetchCircuitBreaker.getState().state).toBe('OPEN');

    teamsFetchCircuitBreaker.forceReset();
    expect(teamsFetchCircuitBreaker.getState().state).toBe('CLOSED');
  });

  it('getState returns correct structure', () => {
    const state = teamsFetchCircuitBreaker.getState();
    expect(state).toHaveProperty('state');
    expect(state).toHaveProperty('failureCount');
    expect(state.state).toBe('CLOSED');
  });

  it('transitions from OPEN to HALF_OPEN after resetTimeout, then CLOSED on success', async () => {
    const failingOp = () => Promise.reject(new Error('fail'));

    for (let i = 0; i < 5; i++) {
      await expect(teamsFetchCircuitBreaker.execute(failingOp, 'test-op')).rejects.toThrow();
    }

    expect(teamsFetchCircuitBreaker.getState().state).toBe('OPEN');

    vi.advanceTimersByTime(10000);

    const result = await teamsFetchCircuitBreaker.execute(() => Promise.resolve('recovered'), 'test-op');
    expect(result).toBe('recovered');
    expect(teamsFetchCircuitBreaker.getState().state).toBe('CLOSED');
  });
});
