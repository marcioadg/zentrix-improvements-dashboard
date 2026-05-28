import { vi } from 'vitest';
import { mapWeekStartDate, migrateUserWeekStartData } from './weekMappingService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/weekUtils', () => ({
  getWeekStart: vi.fn((date: string) => date),
}));

describe('mapWeekStartDate', () => {
  it('returns the same date regardless of from/to parameters', () => {
    const date = '2026-03-25';
    const result = mapWeekStartDate(date, 'monday', 'sunday');
    expect(result).toBe(date);
  });

  it('returns the same date with different from/to values', () => {
    const date = '2026-01-15';
    const result = mapWeekStartDate(date, 'sunday', 'monday');
    expect(result).toBe(date);
  });

  it('works with any date string', () => {
    const date = '2025-12-31';
    const result = mapWeekStartDate(date, 'sunday', 'saturday');
    expect(result).toBe(date);
  });

  it('works when from and to are the same', () => {
    const date = '2026-06-01';
    const result = mapWeekStartDate(date, 'monday', 'monday');
    expect(result).toBe(date);
  });
});

describe('migrateUserWeekStartData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with 0 migrated records when fromWeekStart equals toWeekStart', async () => {
    const result = await migrateUserWeekStartData('user-123', 'monday', 'monday');
    expect(result).toEqual({ success: true, migratedRecords: 0 });
  });

  it('handles supabase fetch errors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: null, error: { message: 'fetch error' } }),
        }),
      }),
    } as any);

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    expect(result).toHaveProperty('success', false);
    expect(result.error).toBe('fetch error');
  });

  it('returns success with 0 records when no metrics found', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    } as any);

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    expect(result).toEqual({ success: true, migratedRecords: 0 });
  });

  it('returns success with 0 records when data is null', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as any);

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    expect(result).toEqual({ success: true, migratedRecords: 0 });
  });

  it('handles unexpected exceptions', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Connection lost');
    });

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection lost');
  });

  it('handles non-Error exceptions', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw 'string error';
    });

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });

  it('processes metrics migration with single record per key', async () => {
    const mockMetrics = [
      {
        id: 'metric-1',
        metric_name: 'Revenue',
        owner_id: 'owner-1',
        week_start_date: '2026-03-23',
        updated_at: '2026-03-24T00:00:00Z',
      },
    ];

    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ data: mockMetrics, error: null }),
            }),
          }),
        } as any;
      }
      // update calls - mapWeekStartDate returns same date so no actual update
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any;
    });

    const result = await migrateUserWeekStartData('user-123', 'monday', 'sunday');
    // Since mapWeekStartDate always returns the same date, no migration happens
    expect(result.success).toBe(true);
    expect(result.migratedRecords).toBe(0);
  });
});
