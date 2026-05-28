import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { companyDataValidationService } from './companyDataValidationService';

// Helper to create chainable mock
function mockFrom(impl: Record<string, any>) {
  return impl as any;
}

describe('CompanyDataValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateUserCompanyData', () => {
    it('returns invalid when profile not found', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // profiles query
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
              }),
            }),
          });
        }
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.isValid).toBe(false);
      expect(result.inconsistencies).toContain('Profile not found or error accessing profile');
    });

    it('returns valid when data is consistent', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // profiles
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'user@test.com', full_name: 'Test' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 2) {
          // user_settings
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { current_company_id: 'company-1' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 3) {
          // company_members
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ company_id: 'company-1' }],
                  error: null,
                }),
              }),
            }),
          });
        }
        // team_members
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.isValid).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
    });

    it('detects current company pointing to inaccessible company', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'user@test.com', full_name: 'Test' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 2) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { current_company_id: 'company-999' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 3) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ company_id: 'company-1' }],
                  error: null,
                }),
              }),
            }),
          });
        }
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.isValid).toBe(false);
      expect(result.inconsistencies).toContain('Current company setting points to inaccessible company');
    });

    it('detects no current company despite having access', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'user@test.com', full_name: 'Test' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 2) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 3) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ company_id: 'company-1' }],
                  error: null,
                }),
              }),
            }),
          });
        }
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.isValid).toBe(false);
      expect(result.inconsistencies).toContain('No current company set despite having company access');
    });

    it('handles exception during validation', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.isValid).toBe(false);
      expect(result.inconsistencies[0]).toContain('Connection lost');
    });

    it('detects settings error with non-PGRST116 code', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'test@test.com', full_name: 'Test' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 2) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: 'XXXXX', message: 'Settings DB error' },
                }),
              }),
            }),
          });
        }
        if (callCount === 3) {
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          });
        }
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });
      });

      const result = await companyDataValidationService.validateUserCompanyData('user-1');

      expect(result.inconsistencies).toContain('Settings error: Settings DB error');
    });
  });

  describe('fixDataInconsistencies', () => {
    it('returns failure when profile fetch fails', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        });
      });

      const result = await companyDataValidationService.fixDataInconsistencies('user-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to fetch user profile');
    });

    it('returns success when no fix needed', async () => {
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount <= 1) {
          // profiles
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { email: 'test@test.com', full_name: 'Test' },
                  error: null,
                }),
              }),
            }),
          });
        }
        if (callCount === 2) {
          // company_members
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          });
        }
        if (callCount === 3) {
          // team_members
          return mockFrom({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          });
        }
        // user_settings
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { current_company_id: null },
                error: null,
              }),
            }),
          }),
        });
      });

      const result = await companyDataValidationService.fixDataInconsistencies('user-1');

      expect(result.success).toBe(true);
    });

    it('handles exception during fix', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('DB crash');
      });

      const result = await companyDataValidationService.fixDataInconsistencies('user-1');

      expect(result.success).toBe(false);
      expect(result.message).toContain('DB crash');
    });
  });

  describe('getEffectiveCurrentCompany', () => {
    it('returns null on exception', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('crash');
      });

      const result = await companyDataValidationService.getEffectiveCurrentCompany('user-1');

      expect(result).toBeNull();
    });

    it('returns null when no company access found', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        return mockFrom({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        });
      });

      const result = await companyDataValidationService.getEffectiveCurrentCompany('user-1');

      expect(result).toBeNull();
    });
  });
});
