import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('./companyDataValidationService', () => ({
  companyDataValidationService: {
    validateUserCompanyData: vi.fn().mockResolvedValue({ isValid: true }),
    fixDataInconsistencies: vi.fn().mockResolvedValue(undefined),
    getEffectiveCurrentCompany: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  fetchUserAccessibleCompanies,
  getCurrentCompanyFromSettings,
  updateUserCurrentCompany,
} from './multiCompanyService';
import { companyDataValidationService } from './companyDataValidationService';

// ---------------------------------------------------------------------------
// Chain builder helpers
// ---------------------------------------------------------------------------

/** Creates a fluent Supabase query chain ending in a resolved value. */
function makeChain(result: unknown) {
  const promise = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  for (const method of ['select', 'eq', 'in', 'maybeSingle', 'single', 'upsert']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

const USER_ID = 'user-abc';
const COMPANY_ID = 'company-xyz';

// ---------------------------------------------------------------------------
// fetchUserAccessibleCompanies
// ---------------------------------------------------------------------------

describe('fetchUserAccessibleCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (companyDataValidationService.validateUserCompanyData as any).mockResolvedValue({ isValid: true });
  });

  it('returns companies for active memberships', async () => {
    const membersChain = makeChain({
      data: [{ company_id: COMPANY_ID, permission_level: 'admin', joined_at: null, status: 'active' }],
      error: null,
    });
    const detailsChain = makeChain({
      data: [{ id: COMPANY_ID, name: 'Zentrix', slug: 'zentrix', auto_create_overdue_issues: false, default_vote_limit: 5, require_task_before_solve: false }],
      error: null,
    });

    (supabase.from as any)
      .mockReturnValueOnce(membersChain)   // company_members query
      .mockReturnValueOnce(detailsChain);  // companies details query

    const result = await fetchUserAccessibleCompanies(USER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(COMPANY_ID);
    expect(result[0].name).toBe('Zentrix');
    expect(result[0].role).toBe('admin');
  });

  it('returns empty array when no active memberships exist', async () => {
    // company_members returns empty → triggers fetchCompaniesViaTeams fallback
    const membersChain = makeChain({ data: [], error: null });
    // team_members fallback also returns empty
    const teamsChain = makeChain({ data: [], error: null });

    (supabase.from as any)
      .mockReturnValueOnce(membersChain)
      .mockReturnValueOnce(teamsChain);  // fetchCompaniesViaTeams

    const result = await fetchUserAccessibleCompanies(USER_ID);
    expect(result).toEqual([]);
  });

  it('falls back to team lookup when company_members query errors', async () => {
    const errorChain = makeChain({ data: null, error: { message: 'DB error' } });
    // team_members fallback returns empty for simplicity
    const teamsChain = makeChain({ data: [], error: null });

    (supabase.from as any)
      .mockReturnValueOnce(errorChain)
      .mockReturnValueOnce(teamsChain);

    // Should not throw, just return empty via fallback
    const result = await fetchUserAccessibleCompanies(USER_ID);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCurrentCompanyFromSettings
// ---------------------------------------------------------------------------

describe('getCurrentCompanyFromSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the saved company ID from validation service', async () => {
    (companyDataValidationService.getEffectiveCurrentCompany as any).mockResolvedValue({ id: COMPANY_ID });

    const result = await getCurrentCompanyFromSettings(USER_ID);
    expect(result).toBe(COMPANY_ID);
  });

  it('returns null when no company is set', async () => {
    (companyDataValidationService.getEffectiveCurrentCompany as any).mockResolvedValue(null);

    const result = await getCurrentCompanyFromSettings(USER_ID);
    expect(result).toBeNull();
  });

  it('falls back to direct DB query when validation service throws', async () => {
    (companyDataValidationService.getEffectiveCurrentCompany as any).mockRejectedValue(new Error('service down'));

    const settingsChain = makeChain({ data: { current_company_id: COMPANY_ID }, error: null });
    (supabase.from as any).mockReturnValueOnce(settingsChain);

    const result = await getCurrentCompanyFromSettings(USER_ID);
    expect(result).toBe(COMPANY_ID);
  });

  it('returns null if fallback DB query also fails', async () => {
    (companyDataValidationService.getEffectiveCurrentCompany as any).mockRejectedValue(new Error('service down'));

    const settingsChain = makeChain({ data: null, error: { message: 'DB error', code: 'PGRST116' } });
    (supabase.from as any).mockReturnValueOnce(settingsChain);

    const result = await getCurrentCompanyFromSettings(USER_ID);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateUserCurrentCompany
// ---------------------------------------------------------------------------

describe('updateUserCurrentCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('upserts current_company_id into user_settings', async () => {
    const accessChain = makeChain({
      data: [{ company_id: COMPANY_ID, permission_level: 'admin', joined_at: null, status: 'active' }],
      error: null,
    });
    const detailsChain = makeChain({
      data: [{ id: COMPANY_ID, name: 'Zentrix', slug: 'zentrix' }],
      error: null,
    });
    const membershipChain = makeChain({ data: { status: 'active' }, error: null });
    const settingsChain = makeChain({ data: null, error: null });
    const upsertChain = makeChain({ error: null });
    const verifyChain = makeChain({ data: { current_company_id: COMPANY_ID }, error: null });

    (supabase.from as any)
      .mockReturnValueOnce(accessChain)
      .mockReturnValueOnce(detailsChain)
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(settingsChain)
      .mockReturnValueOnce(upsertChain)
      .mockReturnValueOnce(verifyChain);

    await expect(updateUserCurrentCompany(USER_ID, COMPANY_ID)).resolves.not.toThrow();
  });

  it('throws when upsert fails', async () => {
    const accessChain = makeChain({
      data: [{ company_id: COMPANY_ID, permission_level: 'admin', joined_at: null, status: 'active' }],
      error: null,
    });
    const detailsChain = makeChain({
      data: [{ id: COMPANY_ID, name: 'Zentrix', slug: 'zentrix' }],
      error: null,
    });
    const membershipChain = makeChain({ data: { status: 'active' }, error: null });
    const settingsChain = makeChain({ data: null, error: null });
    const upsertChain = makeChain({ error: { message: 'Upsert failed' } });

    (supabase.from as any)
      .mockReturnValueOnce(accessChain)
      .mockReturnValueOnce(detailsChain)
      .mockReturnValueOnce(membershipChain)
      .mockReturnValueOnce(settingsChain)
      .mockReturnValueOnce(upsertChain);

    await expect(updateUserCurrentCompany(USER_ID, COMPANY_ID)).rejects.toThrow();
  });
});
