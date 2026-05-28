import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));
vi.mock('./companyCreatedWebhook', () => ({
  sendCompanyCreatedWebhook: vi.fn(),
}));

import { supabase } from '@/integrations/supabase/client';
import { createFirstCompany, createAdditionalCompany, checkUserNeedsOnboarding } from './onboardingService';

describe('onboardingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFirstCompany', () => {
    it('creates company with provided slug', async () => {
      const response = { success: true, company_id: 'c1', company_name: 'Test', company_slug: 'test-co' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: response, error: null } as any);
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null } as any);

      const result = await createFirstCompany({ companyName: 'Test', companySlug: 'test-co' });
      expect(result.success).toBe(true);
      expect(result.company_id).toBe('c1');
      expect(supabase.rpc).toHaveBeenCalledWith('create_user_first_company', {
        company_name: 'Test',
        company_slug: 'test-co',
      });
    });

    it('auto-generates slug from company name', async () => {
      const response = { success: true, company_id: 'c1' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: response, error: null } as any);
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null } as any);

      await createFirstCompany({ companyName: 'My Cool Company!' });
      expect(supabase.rpc).toHaveBeenCalledWith('create_user_first_company', {
        company_name: 'My Cool Company!',
        company_slug: 'my-cool-company',
      });
    });

    it('returns error on RPC failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      } as any);

      const result = await createFirstCompany({ companyName: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC failed');
    });

    it('handles slug with special characters', async () => {
      const response = { success: true, company_id: 'c1' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: response, error: null } as any);
      vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null } as any);

      await createFirstCompany({ companyName: 'Café & Bar 2025!' });
      expect(supabase.rpc).toHaveBeenCalledWith('create_user_first_company', {
        company_name: 'Café & Bar 2025!',
        company_slug: 'caf-bar-2025',
      });
    });
  });

  describe('createAdditionalCompany', () => {
    it('creates additional company successfully', async () => {
      const response = { success: true, company_id: 'c2', company_name: 'Second Co' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: response, error: null } as any);

      const result = await createAdditionalCompany({ companyName: 'Second Co' });
      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('create_additional_company', expect.any(Object));
    });

    it('returns error on failure', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'duplicate' },
      } as any);

      const result = await createAdditionalCompany({ companyName: 'Dup' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('duplicate');
    });
  });

  describe('checkUserNeedsOnboarding', () => {
    it('returns true when no authenticated user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);
      const result = await checkUserNeedsOnboarding();
      expect(result).toBe(true);
    });

    it('returns false when RPC finds companies', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [{ id: 'c1' }],
        error: null,
      } as any);
      const result = await checkUserNeedsOnboarding();
      expect(result).toBe(false);
    });

    it('falls back to direct queries when RPC fails', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'rpc fail' },
      } as any);

      // Mock company_members and team_members queries
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'company_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [{ id: 'cm1' }], error: null }),
                }),
              }),
            }),
          } as any;
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as any;
      });

      const result = await checkUserNeedsOnboarding();
      expect(result).toBe(false);
    });

    it('returns true on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));
      const result = await checkUserNeedsOnboarding();
      expect(result).toBe(true);
    });
  });
});
