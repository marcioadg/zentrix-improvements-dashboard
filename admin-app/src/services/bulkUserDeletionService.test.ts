import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getSession: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import {
  bulkDeleteUsers,
  bulkDeactivateUsers,
} from './bulkUserDeletionService';

const CURRENT_USER_ID = 'current-user-123';
const OTHER_USER_IDS = ['user-1', 'user-2', 'user-3'];

describe('bulkDeleteUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it('throws when userIds is empty', async () => {
    await expect(bulkDeleteUsers([], CURRENT_USER_ID)).rejects.toThrow(
      'No users provided for deletion',
    );
  });

  it('throws when userIds.length exceeds 500', async () => {
    const tooMany = Array.from({ length: 501 }, (_, i) => `user-${i}`);
    await expect(bulkDeleteUsers(tooMany, CURRENT_USER_ID)).rejects.toThrow(
      /Cannot delete more than 500 users at once/,
    );
  });

  it('throws when currentUserId is included in userIds', async () => {
    const userIds = [...OTHER_USER_IDS, CURRENT_USER_ID];
    await expect(bulkDeleteUsers(userIds, CURRENT_USER_ID)).rejects.toThrow(
      'Cannot delete your own account in bulk operation',
    );
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns BulkDeletionResult on success', async () => {
    const mockSession = { access_token: 'tok', user: { id: CURRENT_USER_ID } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    } as any);

    const invokePayload = {
      success: true,
      successCount: 3,
      failureCount: 0,
      errors: [],
    };
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: invokePayload,
      error: null,
    } as any);

    const result = await bulkDeleteUsers(OTHER_USER_IDS, CURRENT_USER_ID);

    expect(result).toEqual({
      success: true,
      successCount: 3,
      failureCount: 0,
      errors: [],
    });

    expect(supabase.auth.getSession).toHaveBeenCalledOnce();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('os-delete-user', {
      body: {
        userIds: OTHER_USER_IDS,
        currentUserId: CURRENT_USER_ID,
        transferToUserId: undefined,
        deleteData: undefined,
      },
    });
  });

  it('forwards transferToUserId and deleteData option to edge function', async () => {
    const mockSession = { access_token: 'tok', user: { id: CURRENT_USER_ID } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    } as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, successCount: 1, failureCount: 0, errors: [] },
      error: null,
    } as any);

    await bulkDeleteUsers(['user-1'], CURRENT_USER_ID, 'transfer-user-99', {
      deleteData: true,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('os-delete-user', {
      body: {
        userIds: ['user-1'],
        currentUserId: CURRENT_USER_ID,
        transferToUserId: 'transfer-user-99',
        deleteData: true,
      },
    });
  });

  it('throws when session is missing', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    await expect(
      bulkDeleteUsers(OTHER_USER_IDS, CURRENT_USER_ID),
    ).rejects.toThrow('Authentication required for user deletion');
  });

  it('throws when edge function returns an error', async () => {
    const mockSession = { access_token: 'tok', user: { id: CURRENT_USER_ID } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession as any },
      error: null,
    } as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Edge function failed' },
    } as any);

    await expect(
      bulkDeleteUsers(OTHER_USER_IDS, CURRENT_USER_ID),
    ).rejects.toThrow('Deletion service error: Edge function failed');
  });
});

// ---------------------------------------------------------------------------

describe('bulkDeactivateUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it('throws when userIds is empty', async () => {
    await expect(bulkDeactivateUsers([], CURRENT_USER_ID)).rejects.toThrow(
      'No users provided for deactivation',
    );
  });

  it('throws when userIds.length exceeds 500', async () => {
    const tooMany = Array.from({ length: 501 }, (_, i) => `user-${i}`);
    await expect(
      bulkDeactivateUsers(tooMany, CURRENT_USER_ID),
    ).rejects.toThrow(/Cannot deactivate more than 500 users at once/);
  });

  it('throws when currentUserId is included in userIds', async () => {
    const userIds = [...OTHER_USER_IDS, CURRENT_USER_ID];
    await expect(
      bulkDeactivateUsers(userIds, CURRENT_USER_ID),
    ).rejects.toThrow('Cannot deactivate your own account in bulk operation');
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('returns BulkDeletionResult when current user is super_admin and all deactivations succeed', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { role: 'super_admin' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as any);

    const result = await bulkDeactivateUsers(OTHER_USER_IDS, CURRENT_USER_ID);

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(OTHER_USER_IDS.length);
    expect(result.failureCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('throws when the current user is not a super_admin', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi
            .fn()
            .mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
      }),
    } as any);

    await expect(
      bulkDeactivateUsers(OTHER_USER_IDS, CURRENT_USER_ID),
    ).rejects.toThrow(
      'Only super administrators can perform bulk user deactivation',
    );
  });

  it('records partial failures when some updates fail', async () => {
    let updateCallCount = 0;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'super_admin' },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              updateCallCount += 1;
              // Fail the second user update
              if (updateCallCount === 2) {
                return Promise.resolve({ error: { message: 'DB error' } });
              }
              return Promise.resolve({ error: null });
            }),
          }),
        } as any;
      }
      // admin_actions insert
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as any;
    });

    const result = await bulkDeactivateUsers(
      ['user-1', 'user-2', 'user-3'],
      CURRENT_USER_ID,
    );

    expect(result.success).toBe(false);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].userId).toBe('user-2');
  });
});
