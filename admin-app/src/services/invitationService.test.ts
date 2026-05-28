import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

vi.mock('@/lib/statsigAnalytics', () => ({ trackTeamMemberInvited: vi.fn() }));

import { sendInvitation, resendInvitation } from './invitationService';
import { supabase } from '@/integrations/supabase/client';

// Helper to build a chainable supabase query mock that resolves to { data, error }
function makeQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'ilike', 'eq', 'or', 'maybeSingle', 'single'];
  for (const method of methods) {
    chain[method] = vi.fn(() => {
      // terminal methods return a promise
      if (method === 'maybeSingle' || method === 'single') {
        return Promise.resolve(result);
      }
      return chain;
    });
  }
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sendInvitation', () => {
  it('returns error when email is missing (empty string)', async () => {
    const response = await sendInvitation({ email: '', companyId: 'company-123' });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Missing required fields for invitation (email, companyId)');
  });

  it('returns error when companyId is missing (empty string)', async () => {
    const response = await sendInvitation({ email: 'user@example.com', companyId: '' });

    expect(response.success).toBe(false);
    expect(response.error).toBe('Missing required fields for invitation (email, companyId)');
  });

  it('normalizes email to lowercase before using it', async () => {
    const normalizedEmail = 'user@example.com';
    const rawEmail = 'User@EXAMPLE.COM';

    // profiles (existingUser) → null
    const profilesChain = makeQueryChain({ data: null, error: null });
    // company_members (existingMembership) → null
    const companyMembersChain = makeQueryChain({ data: null, error: null });
    // companies (company name) → { name: 'Acme' }
    const companiesChain = makeQueryChain({ data: { name: 'Acme' }, error: null });
    // profiles again (inviter) → null
    const inviterChain = makeQueryChain({ data: null, error: null });

    let profilesCallCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        profilesCallCount += 1;
        return (profilesCallCount === 1 ? profilesChain : inviterChain) as ReturnType<typeof supabase.from>;
      }
      if (table === 'company_members') {
        return companyMembersChain as ReturnType<typeof supabase.from>;
      }
      if (table === 'companies') {
        return companiesChain as ReturnType<typeof supabase.from>;
      }
      return makeQueryChain({ data: null, error: null }) as ReturnType<typeof supabase.from>;
    });

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, invitationId: 'inv-1', inviteLink: 'https://example.com/invite' },
      error: null,
    });

    const response = await sendInvitation({
      email: rawEmail,
      companyId: 'company-123',
      invitedBy: 'user-456',
    });

    expect(response.success).toBe(true);

    // Verify the edge function was called with the normalized (lowercase) email
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      'os-invite-user',
      expect.objectContaining({
        body: expect.objectContaining({ email: normalizedEmail }),
      })
    );
  });

  it('returns error when existing membership status is pending', async () => {
    const profilesChain = makeQueryChain({ data: null, error: null });
    const companyMembersChain = makeQueryChain({
      data: { status: 'pending', email: 'user@example.com' },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return profilesChain as ReturnType<typeof supabase.from>;
      }
      if (table === 'company_members') {
        return companyMembersChain as ReturnType<typeof supabase.from>;
      }
      return makeQueryChain({ data: null, error: null }) as ReturnType<typeof supabase.from>;
    });

    const response = await sendInvitation({
      email: 'user@example.com',
      companyId: 'company-123',
    });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/pending invitation/i);
  });

  it('returns error when existing membership status is active', async () => {
    const profilesChain = makeQueryChain({ data: null, error: null });
    const companyMembersChain = makeQueryChain({
      data: { status: 'active', email: 'user@example.com' },
      error: null,
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return profilesChain as ReturnType<typeof supabase.from>;
      }
      if (table === 'company_members') {
        return companyMembersChain as ReturnType<typeof supabase.from>;
      }
      return makeQueryChain({ data: null, error: null }) as ReturnType<typeof supabase.from>;
    });

    const response = await sendInvitation({
      email: 'user@example.com',
      companyId: 'company-123',
    });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/already a member/i);
  });
});

describe('resendInvitation', () => {
  it('always returns not available error', async () => {
    const response = await resendInvitation('any-invitation-id');

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/resend not available/i);
  });
});
