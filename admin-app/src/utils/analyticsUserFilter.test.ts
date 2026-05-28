import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn(() => ({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { filterRatingsByActiveUsers, clearActiveUserCache } from './analyticsUserFilter';

describe('filterRatingsByActiveUsers', () => {
  it('filters ratings to only active users', () => {
    const ratings = { 'user-1': 8, 'user-2': 7, 'user-3': 9 };
    const activeIds = new Set(['user-1', 'user-3']);
    const result = filterRatingsByActiveUsers(ratings, activeIds);
    expect(result).toEqual({ 'user-1': 8, 'user-3': 9 });
  });

  it('returns empty object for null ratings', () => {
    expect(filterRatingsByActiveUsers(null, new Set(['user-1']))).toEqual({});
  });

  it('returns empty object for non-object ratings', () => {
    expect(filterRatingsByActiveUsers('bad' as any, new Set())).toEqual({});
  });

  it('excludes zero ratings', () => {
    const ratings = { 'user-1': 0, 'user-2': 5 };
    const activeIds = new Set(['user-1', 'user-2']);
    const result = filterRatingsByActiveUsers(ratings, activeIds);
    expect(result).toEqual({ 'user-2': 5 });
  });

  it('excludes non-number ratings', () => {
    const ratings = { 'user-1': 'bad' as any, 'user-2': 5 };
    const activeIds = new Set(['user-1', 'user-2']);
    const result = filterRatingsByActiveUsers(ratings, activeIds);
    expect(result).toEqual({ 'user-2': 5 });
  });

  it('returns empty object when no active users match', () => {
    const ratings = { 'user-1': 8 };
    const activeIds = new Set(['user-99']);
    expect(filterRatingsByActiveUsers(ratings, activeIds)).toEqual({});
  });

  it('handles empty ratings object', () => {
    expect(filterRatingsByActiveUsers({}, new Set(['user-1']))).toEqual({});
  });

  it('handles empty active user set', () => {
    const ratings = { 'user-1': 8 };
    expect(filterRatingsByActiveUsers(ratings, new Set())).toEqual({});
  });
});

describe('clearActiveUserCache', () => {
  it('does not throw when clearing all', () => {
    expect(() => clearActiveUserCache()).not.toThrow();
  });

  it('does not throw when clearing specific company', () => {
    expect(() => clearActiveUserCache('company-123')).not.toThrow();
  });
});
