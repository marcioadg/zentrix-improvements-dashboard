import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() }
}));

import { handleError, getErrorId } from './errorHandler';

describe('handleError', () => {
  it('returns offline type for network errors', () => {
    const result = handleError(new TypeError('Failed to fetch'), 'test');
    expect(result.type).toBe('offline');
  });

  it('returns offline type when navigator is offline', () => {
    const original = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
    const result = handleError(new Error('some error'), 'test');
    expect(result.type).toBe('offline');
    Object.defineProperty(navigator, 'onLine', { value: original, writable: true, configurable: true });
  });

  it('returns timeout type for timeout errors', () => {
    const result = handleError(new Error('timeout'), 'test');
    expect(result.type).toBe('timeout');
  });

  it('returns not-found type for PGRST116 errors', () => {
    const result = handleError({ code: 'PGRST116' }, 'test');
    expect(result.type).toBe('not-found');
  });

  it('returns not-found type for 404 errors', () => {
    const result = handleError({ status: 404 }, 'test');
    expect(result.type).toBe('not-found');
  });

  it('returns permission type for PGRST301 errors', () => {
    const result = handleError({ code: 'PGRST301' }, 'test');
    expect(result.type).toBe('permission');
  });

  it('returns permission type for 403 errors', () => {
    const result = handleError({ status: 403 }, 'test');
    expect(result.type).toBe('permission');
  });

  it('returns rate-limit type for 429 errors', () => {
    const result = handleError({ status: 429 }, 'test');
    expect(result.type).toBe('rate-limit');
  });

  it('returns permission type for 401 errors (session expired)', () => {
    const result = handleError({ status: 401 }, 'test');
    expect(result.type).toBe('permission');
  });

  it('returns generic type for 500+ server errors', () => {
    const result = handleError({ status: 500 }, 'test');
    expect(result.type).toBe('generic');
  });

  it('returns generic type for 400 validation errors', () => {
    const result = handleError({ status: 400 }, 'test');
    expect(result.type).toBe('generic');
  });

  it('returns generic type with canRetry for unknown errors', () => {
    const result = handleError(new Error('something weird'), 'test');
    expect(result.type).toBe('generic');
    expect(result.canRetry).toBe(true);
  });
});

describe('getErrorId', () => {
  it('returns string matching ERR-{timestamp}-{random} pattern', () => {
    const id = getErrorId();
    expect(id).toMatch(/^ERR-\d+-[a-z0-9]+$/i);
  });
});
