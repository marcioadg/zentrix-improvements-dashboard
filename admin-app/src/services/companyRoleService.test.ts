import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { getUserRoleInCompany, getAccessibleTeamsForUser } from './companyRoleService';

describe('getUserRoleInCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // The function calls supabase.from() twice:
  // 1. from('company_members').select().eq().eq().single() -> { permission_level }
  // 2. from('team_members').select().eq().eq() -> [{ teams: { is_leadership } }]
  function mockSupabaseCalls(
    companyMemberResult: { data: any; error: any },
    teamRolesResult: { data: any; error: any }
  ) {
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // company_members query chain
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(companyMemberResult),
              }),
            }),
          }),
        } as any;
      } else {
        // team_members query chain
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue(teamRolesResult),
            }),
          }),
        } as any;
      }
    });
  }

  it('returns executive level with full permissions for director role', async () => {
    mockSupabaseCalls(
      { data: { permission_level: 'director' }, error: null },
      { data: [], error: null }
    );

    const result = await getUserRoleInCompany('user-1', 'company-1');

    expect(result.role).toBe('director');
    expect(result.level).toBe('executive');
    expect(result.permissions.canViewCrossTeamData).toBe(true);
    expect(result.permissions.canViewFinancialMetrics).toBe(true);
    expect(result.permissions.canViewStrategicInsights).toBe(true);
    expect(result.permissions.canAccessConstraintAnalysis).toBe(true);
  });

  it('returns manager level for manager role', async () => {
    mockSupabaseCalls(
      { data: { permission_level: 'manager' }, error: null },
      { data: [], error: null }
    );

    const result = await getUserRoleInCompany('user-1', 'company-1');

    expect(result.role).toBe('manager');
    expect(result.level).toBe('manager');
    expect(result.permissions.canViewCrossTeamData).toBe(true);
    expect(result.permissions.canViewFinancialMetrics).toBe(false);
    expect(result.permissions.canViewStrategicInsights).toBe(true);
  });

  it('returns member level for regular member', async () => {
    mockSupabaseCalls(
      { data: { permission_level: 'member' }, error: null },
      { data: [], error: null }
    );

    const result = await getUserRoleInCompany('user-1', 'company-1');

    expect(result.role).toBe('member');
    expect(result.level).toBe('member');
    expect(result.permissions.canViewCrossTeamData).toBe(false);
    expect(result.permissions.canViewFinancialMetrics).toBe(false);
  });

  it('returns manager level when user has leadership team role', async () => {
    mockSupabaseCalls(
      { data: { permission_level: 'member' }, error: null },
      { data: [{ teams: { is_leadership: true } }], error: null }
    );

    const result = await getUserRoleInCompany('user-1', 'company-1');

    expect(result.level).toBe('manager');
  });

  it('returns default member role on error', async () => {
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const result = await getUserRoleInCompany('user-1', 'company-1');

    expect(result.level).toBe('member');
    expect(result.role).toBe('member');
    expect(result.permissions.canViewCrossTeamData).toBe(false);
  });
});

describe('getAccessibleTeamsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all company teams when user has canViewCrossTeamData', async () => {
    const userRole = {
      role: 'director',
      level: 'executive' as const,
      permissions: {
        canViewCrossTeamData: true,
        canViewFinancialMetrics: true,
        canViewStrategicInsights: true,
        canAccessConstraintAnalysis: true,
      },
    };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'team-1' }, { id: 'team-2' }, { id: 'team-3' }],
          error: null,
        }),
      }),
    } as any);

    const result = await getAccessibleTeamsForUser('user-1', 'company-1', userRole);

    expect(result).toEqual(['team-1', 'team-2', 'team-3']);
  });

  it('returns only user teams for regular member', async () => {
    const userRole = {
      role: 'member',
      level: 'member' as const,
      permissions: {
        canViewCrossTeamData: false,
        canViewFinancialMetrics: false,
        canViewStrategicInsights: false,
        canAccessConstraintAnalysis: false,
      },
    };
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ team_id: 'team-1' }],
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await getAccessibleTeamsForUser('user-1', 'company-1', userRole);

    expect(result).toEqual(['team-1']);
  });

  it('returns empty array on error', async () => {
    const userRole = {
      role: 'member',
      level: 'member' as const,
      permissions: {
        canViewCrossTeamData: false,
        canViewFinancialMetrics: false,
        canViewStrategicInsights: false,
        canAccessConstraintAnalysis: false,
      },
    };
    vi.mocked(supabase.from).mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const result = await getAccessibleTeamsForUser('user-1', 'company-1', userRole);

    expect(result).toEqual([]);
  });
});
