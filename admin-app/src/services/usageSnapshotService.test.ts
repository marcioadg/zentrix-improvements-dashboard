import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

import { formatSnapshotDate } from './usageSnapshotService';

describe('formatSnapshotDate', () => {
  it('formats a valid ISO date string correctly', () => {
    // 2024-06-15T10:30:00.000Z — June 15 2024
    const result = formatSnapshotDate('2024-06-15T10:30:00.000Z');

    // The exact time depends on the local timezone of the test runner, so we
    // only assert the parts that are timezone-independent: month abbreviation
    // and year.
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2024/);
  });

  it('handles different date strings', () => {
    // 2023-01-01 — January 2023
    const result = formatSnapshotDate('2023-01-01T00:00:00.000Z');

    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/2023/);
    // Should contain time parts (hour and minute)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
