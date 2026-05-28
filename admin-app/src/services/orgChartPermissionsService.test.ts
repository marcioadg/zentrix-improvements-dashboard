import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { OrgChartPermissionsService } from './orgChartPermissionsService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal chainable Supabase mock that ends with maybeSingle(). */
function makeMaybeSingleChain(resolvedValue: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue(resolvedValue);
  const inner = vi.fn().mockReturnValue({ maybeSingle });
  const middle = vi.fn().mockReturnValue({ eq: inner });
  const outer = vi.fn().mockReturnValue({ eq: middle });
  return { select: outer, _maybeSingle: maybeSingle };
}

/** Build a chainable mock that ends with single(). */
function makeSingleChain(resolvedValue: unknown) {
  const single = vi.fn().mockResolvedValue(resolvedValue);
  const d = vi.fn().mockReturnValue({ single });
  const c = vi.fn().mockReturnValue({ eq: d });
  const b = vi.fn().mockReturnValue({ eq: c });
  const select = vi.fn().mockReturnValue({ eq: b });
  return { select };
}

/** Build a chainable mock that ends with a resolved value directly (no terminal). */
function makeEqChain(resolvedValue: unknown) {
  const eq = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

/** Build a chainable mock for .select().eq() (single eq) that resolves directly. */
function makeSingleEqChain(resolvedValue: unknown) {
  const eq = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

/** Build a chainable mock for .select().in() that resolves directly. */
function makeInChain(resolvedValue: unknown) {
  const inFn = vi.fn().mockResolvedValue(resolvedValue);
  const select = vi.fn().mockReturnValue({ in: inFn });
  return { select };
}

// ---------------------------------------------------------------------------
// getUserOrgRole
// ---------------------------------------------------------------------------

describe('OrgChartPermissionsService.getUserOrgRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when supabase returns an error', async () => {
    const chain = makeMaybeSingleChain({ data: null, error: { message: 'DB error' } });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUserOrgRole('user-1', 'company-1');

    expect(result).toBeNull();
  });

  it('returns null when no role assignment is found', async () => {
    const chain = makeMaybeSingleChain({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUserOrgRole('user-1', 'company-1');

    expect(result).toBeNull();
  });

  it('returns the OrgChartRole when a role assignment is found', async () => {
    const mockRoleData = {
      role_id: 'role-99',
      org_roles: {
        id: 'role-99',
        title: 'CEO',
        reports_to_role_id: null,
        company_id: 'company-1',
      },
    };
    const chain = makeMaybeSingleChain({ data: mockRoleData, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUserOrgRole('user-1', 'company-1');

    expect(result).toEqual({
      id: 'role-99',
      title: 'CEO',
      reports_to_role_id: null,
      user_id: 'user-1',
    });
  });

  it('returns the OrgChartRole when org_roles is returned as an array', async () => {
    const mockRoleData = {
      role_id: 'role-10',
      org_roles: [
        {
          id: 'role-10',
          title: 'VP Engineering',
          reports_to_role_id: 'role-99',
          company_id: 'company-1',
        },
      ],
    };
    const chain = makeMaybeSingleChain({ data: mockRoleData, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUserOrgRole('user-2', 'company-1');

    expect(result).toEqual({
      id: 'role-10',
      title: 'VP Engineering',
      reports_to_role_id: 'role-99',
      user_id: 'user-2',
    });
  });
});

// ---------------------------------------------------------------------------
// getUsersForRoles
// ---------------------------------------------------------------------------

describe('OrgChartPermissionsService.getUsersForRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array without querying supabase when roleIds is empty', async () => {
    const result = await OrgChartPermissionsService.getUsersForRoles([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns user IDs from role assignments', async () => {
    const mockAssignments = [{ user_id: 'user-a' }, { user_id: 'user-b' }, { user_id: 'user-c' }];
    const chain = makeInChain({ data: mockAssignments, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUsersForRoles(['role-1', 'role-2']);

    expect(result).toEqual(['user-a', 'user-b', 'user-c']);
    expect(supabase.from).toHaveBeenCalledWith('role_assignments');
  });

  it('returns an empty array when supabase returns no assignments', async () => {
    const chain = makeInChain({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    const result = await OrgChartPermissionsService.getUsersForRoles(['role-1']);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getSubordinateRoles
// ---------------------------------------------------------------------------

describe('OrgChartPermissionsService.getSubordinateRoles', () => {
  const companyRoles = [
    { id: 'role-1', title: 'CEO', reports_to_role_id: null },
    { id: 'role-2', title: 'VP', reports_to_role_id: 'role-1' },
    { id: 'role-3', title: 'Manager', reports_to_role_id: 'role-2' },
    { id: 'role-4', title: 'Other VP', reports_to_role_id: 'role-1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // supabase.from('org_roles').select(...).eq(...) → resolves with company roles
    const eq = vi.fn().mockResolvedValue({ data: companyRoles, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);
  });

  it('returns direct and indirect subordinates for the root role (role-1)', async () => {
    const result = await OrgChartPermissionsService.getSubordinateRoles('role-1', 'c1');

    const ids = result.map(r => r.id).sort();
    expect(ids).toEqual(['role-2', 'role-3', 'role-4'].sort());
  });

  it('returns only direct and indirect subordinates for an intermediate role (role-2)', async () => {
    const result = await OrgChartPermissionsService.getSubordinateRoles('role-2', 'c1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('role-3');
  });

  it('returns an empty array for a leaf role that has no subordinates (role-3)', async () => {
    const result = await OrgChartPermissionsService.getSubordinateRoles('role-3', 'c1');

    expect(result).toEqual([]);
  });

  it('returns an empty array when supabase returns no company roles', async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    const result = await OrgChartPermissionsService.getSubordinateRoles('role-1', 'c1');

    expect(result).toEqual([]);
  });

  it('handles cycle protection via visited set and does not recurse infinitely', async () => {
    // Introduce a cycle: role-A → role-B → role-A
    const cyclicRoles = [
      { id: 'role-A', title: 'Alpha', reports_to_role_id: 'role-B' },
      { id: 'role-B', title: 'Beta', reports_to_role_id: 'role-A' },
    ];

    const eq = vi.fn().mockResolvedValue({ data: cyclicRoles, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    // Should resolve without stack overflow; role-B reports to role-A (our root) so
    // role-B should be returned, but the cycle back to role-A is guarded.
    const result = await OrgChartPermissionsService.getSubordinateRoles('role-A', 'c1');

    // role-B is a direct subordinate of role-A; role-A itself should NOT appear again
    expect(result.map(r => r.id)).toContain('role-B');
    expect(result.map(r => r.id)).not.toContain('role-A');
  });
});
