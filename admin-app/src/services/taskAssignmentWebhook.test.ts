import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { sendTaskAssignedWebhook, getUserProfileForWebhook } from './taskAssignmentWebhook';

const basePayload = {
  taskId: 'task-123',
  taskTitle: 'Fix the bug',
  assigneeUserId: 'user-abc',
  assignedByUserId: 'user-xyz',
  assignedByName: 'Alice',
  assignedByEmail: 'alice@example.com',
  companyId: 'company-456',
};

describe('sendTaskAssignedWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls supabase.functions.invoke with correct event_type', () => {
    const mockThen = vi.fn().mockReturnValue({ catch: vi.fn() });
    vi.mocked(supabase.functions.invoke).mockReturnValue({ then: mockThen } as any);

    sendTaskAssignedWebhook(basePayload);

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'send-webhook-event',
      expect.objectContaining({
        body: expect.objectContaining({
          event_type: 'task_assigned',
        }),
      })
    );
  });

  it('does not throw even if functions.invoke throws', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() => {
      throw new Error('Network failure');
    });

    await expect(sendTaskAssignedWebhook(basePayload)).resolves.toBeUndefined();
  });
});

describe('getUserProfileForWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns profile data on success', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { full_name: 'John', email: 'john@test.com' },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await getUserProfileForWebhook('user-abc');

    expect(result).toEqual({ fullName: 'John', email: 'john@test.com' });
  });

  it('returns null on error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('DB error'),
          }),
        }),
      }),
    } as any);

    const result = await getUserProfileForWebhook('user-abc');

    expect(result).toBeNull();
  });

  it("defaults fullName to 'Unknown User' when full_name is null", async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { full_name: null, email: 'noname@test.com' },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await getUserProfileForWebhook('user-abc');

    expect(result).toEqual({ fullName: 'Unknown User', email: 'noname@test.com' });
  });
});
