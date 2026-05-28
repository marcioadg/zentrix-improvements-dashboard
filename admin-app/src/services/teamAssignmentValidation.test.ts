import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));
vi.mock('@/hooks/use-toast', () => ({}));

import { supabase } from '@/integrations/supabase/client';
import { validateTeamCompany } from './teamAssignmentValidation';

describe('validateTeamCompany', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for super_admin without checking supabase', async () => {
    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [],
      userRole: 'super_admin',
      toast: mockToast,
    });

    expect(result).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns false and toasts when no accessible companies', async () => {
    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });

  it('returns false and toasts when userAccessibleCompanies is null-ish', async () => {
    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: null as any,
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
  });

  it('returns false when supabase fetch returns error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
          }),
        }),
      }),
    } as any);

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Failed to validate team assignment' })
    );
  });

  it('returns false when team not found', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Team not found' })
    );
  });

  it('returns true when user has company access', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'team-1',
              name: 'Engineering',
              company_id: 'company-1',
              companies: { id: 'company-1', name: 'Acme' },
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(true);
  });

  it('returns false when user lacks company access', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'team-1',
              name: 'Engineering',
              company_id: 'company-2',
              companies: { id: 'company-2', name: 'OtherCo' },
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Access Denied' })
    );
  });

  it('handles companies as array in response', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'team-1',
              name: 'Engineering',
              company_id: 'company-1',
              companies: [{ id: 'company-1', name: 'Acme' }],
            },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(true);
  });

  it('returns false on unexpected exception', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Unexpected');
    });

    const result = await validateTeamCompany({
      teamId: 'team-1',
      userAccessibleCompanies: [{ id: 'company-1', name: 'Acme' }],
      userRole: 'member',
      toast: mockToast,
    });

    expect(result).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
  });
});
