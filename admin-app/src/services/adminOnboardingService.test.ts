import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { checkAdminCompanyOnboarding } from './adminOnboardingService';

describe('checkAdminCompanyOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns full onboarding status when all complete', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        hasTeams: true,
        hasGoals: true,
        hasMetrics: true,
        userCount: 5,
        hasMeetings: true,
        hasOrgChart: true,
        hasStrategy: true,
      },
      error: null,
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    expect(result.completedCount).toBe(7);
    expect(result.totalCount).toBe(7);
    expect(result.percentage).toBe(100);
    expect(result.items).toHaveLength(7);
    expect(result.items.every(i => i.completed)).toBe(true);
  });

  it('returns partial completion', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        hasTeams: true,
        hasGoals: false,
        hasMetrics: true,
        userCount: 1, // Not > 1, so invite-team is incomplete
        hasMeetings: false,
        hasOrgChart: false,
        hasStrategy: false,
      },
      error: null,
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    expect(result.completedCount).toBe(2); // teams + metrics
    expect(result.percentage).toBe(29); // Math.round(2/7*100)
  });

  it('invite-team is complete when userCount > 1', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        hasTeams: false,
        hasGoals: false,
        hasMetrics: false,
        userCount: 3,
        hasMeetings: false,
        hasOrgChart: false,
        hasStrategy: false,
      },
      error: null,
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    const inviteItem = result.items.find(i => i.id === 'invite-team');
    expect(inviteItem!.completed).toBe(true);
  });

  it('returns empty state on RPC error', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'fail' },
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    expect(result.completedCount).toBe(0);
    expect(result.totalCount).toBe(7);
    expect(result.percentage).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('returns empty state on null data', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: null,
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    expect(result.completedCount).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('handles missing fields gracefully with defaults', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: {
        // All fields missing/undefined - should default to false/0
      },
      error: null,
    } as any);

    const result = await checkAdminCompanyOnboarding('c1');
    expect(result.completedCount).toBe(0);
    expect(result.items.every(i => !i.completed)).toBe(true);
  });
});
