import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), functions: { invoke: vi.fn() } },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  deactivateUser,
  deleteUser,
  deleteUserDirectly,
  reactivateUser,
} from './userDeletionService';

const CURRENT_USER_ID = 'current-user-123';
const TARGET_USER_ID = 'target-user-456';
const COMPANY_ID = 'company-789';

/** Build a chainable supabase query mock that resolves fluent calls with the provided result. */
function buildQueryChain(result: { data: unknown; error: unknown }) {
  const promise = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  for (const method of ['select', 'eq', 'single', 'update', 'delete']) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Self-action prevention
// ---------------------------------------------------------------------------
describe('self-action prevention', () => {
  it('deactivateUser throws SELF_DEACTIVATION when userId === currentUserId', async () => {
    await expect(deactivateUser(CURRENT_USER_ID, CURRENT_USER_ID)).rejects.toThrow(
      'SELF_DEACTIVATION',
    );
  });

  it('deleteUser throws SELF_DELETION when userId === currentUserId', async () => {
    await expect(deleteUser(CURRENT_USER_ID, CURRENT_USER_ID)).rejects.toThrow('SELF_DELETION');
  });

  it('reactivateUser throws SELF_REACTIVATION when userId === currentUserId', async () => {
    await expect(reactivateUser(CURRENT_USER_ID, CURRENT_USER_ID, COMPANY_ID)).rejects.toThrow(
      'SELF_REACTIVATION',
    );
  });
});

// ---------------------------------------------------------------------------
// 2. deactivateUser – permission checks
// ---------------------------------------------------------------------------
describe('deactivateUser – permission checks', () => {
  it('allows deactivation when current user is super_admin', async () => {
    const currentUserProfile = { id: CURRENT_USER_ID, role: 'super_admin', full_name: 'Admin' };
    const targetUserProfile = { id: TARGET_USER_ID, role: 'member', full_name: 'Target' };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(buildQueryChain({ data: currentUserProfile, error: null }) as any)
      .mockReturnValueOnce(buildQueryChain({ data: targetUserProfile, error: null }) as any)
      .mockReturnValueOnce(buildQueryChain({ data: [targetUserProfile], error: null }) as any)
      .mockReturnValueOnce(buildQueryChain({ error: null } as any) as any)
      .mockReturnValueOnce(buildQueryChain({ data: { company_id: COMPANY_ID }, error: null }) as any);

    // rpc for team removal
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    // functions.invoke for billing sync
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null } as any);

    const result = await deactivateUser(TARGET_USER_ID, CURRENT_USER_ID);
    expect(result).toBe(true);
  });

  it('throws Insufficient permissions when current user is not super_admin', async () => {
    const currentUserProfile = { id: CURRENT_USER_ID, role: 'member', full_name: 'Regular User' };
    const targetUserProfile = { id: TARGET_USER_ID, role: 'member', full_name: 'Target' };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(buildQueryChain({ data: currentUserProfile, error: null }) as any)
      .mockReturnValueOnce(buildQueryChain({ data: targetUserProfile, error: null }) as any);

    await expect(deactivateUser(TARGET_USER_ID, CURRENT_USER_ID)).rejects.toThrow(
      'Insufficient permissions',
    );
  });
});

// ---------------------------------------------------------------------------
// 3. deleteUser – permission check
// ---------------------------------------------------------------------------
describe('deleteUser – permission checks', () => {
  it('allows deletion when current user is super_admin', async () => {
    const targetUserProfile = {
      id: TARGET_USER_ID,
      email: 'target@example.com',
      full_name: 'Target',
      role: 'member',
    };
    const currentUserProfile = { id: CURRENT_USER_ID, role: 'super_admin', full_name: 'Admin' };

    // call 1: check if target user exists
    const targetChain = buildQueryChain({ data: targetUserProfile, error: null });
    // call 2: fetch current user
    const currentChain = buildQueryChain({ data: currentUserProfile, error: null });
    // call 3: verify deletion (user no longer found → error)
    const verifyChain = buildQueryChain({ data: null, error: { message: 'not found' } });

    vi.mocked(supabase.from)
      .mockReturnValueOnce(targetChain as any)
      .mockReturnValueOnce(currentChain as any)
      .mockReturnValueOnce(verifyChain as any);

    // edge function succeeds
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true },
      error: null,
    } as any);

    const result = await deleteUser(TARGET_USER_ID, CURRENT_USER_ID);
    expect(result).toBe(true);
  });

  it('throws when current user is not super_admin', async () => {
    const targetUserProfile = {
      id: TARGET_USER_ID,
      email: 'target@example.com',
      full_name: 'Target',
      role: 'member',
    };
    const currentUserProfile = { id: CURRENT_USER_ID, role: 'director', full_name: 'Director' };

    vi.mocked(supabase.from)
      .mockReturnValueOnce(buildQueryChain({ data: targetUserProfile, error: null }) as any)
      .mockReturnValueOnce(buildQueryChain({ data: currentUserProfile, error: null }) as any);

    await expect(deleteUser(TARGET_USER_ID, CURRENT_USER_ID)).rejects.toThrow(
      'Only super administrators can delete user accounts',
    );
  });
});

// ---------------------------------------------------------------------------
// 4. deleteUser returns true when target user is not found (already deleted)
// ---------------------------------------------------------------------------
describe('deleteUser – not found case', () => {
  it('returns true immediately when target user does not exist', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      buildQueryChain({ data: null, error: { message: 'not found' } }) as any,
    );

    const result = await deleteUser(TARGET_USER_ID, CURRENT_USER_ID);
    expect(result).toBe(true);
    // No further supabase calls should have been made (permission check skipped)
    expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(1);
  });
});
