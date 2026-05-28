import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MeetingErrorHandler } from './meetingErrorHandler';

describe('MeetingErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeMeetingError', () => {
    it('returns auth error when user is not logged in', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'some error' },
        'team-1'
      );

      expect(result.error.type).toBe('auth');
      expect(result.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'navigate', data: { path: '/auth' } }),
        ])
      );
    });

    it('handles RLS error with debug info showing team not found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { is_team_member: false, has_director_access: false, team_exists: false },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'row-level security', code: '42501' },
        'team-1'
      );

      expect(result.error.type).toBe('permission');
      expect(result.error.message).toContain('Team not found');
    });

    it('handles RLS error when user is not a team member', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { is_team_member: false, has_director_access: false, team_exists: true },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'row-level security' },
        'team-1'
      );

      expect(result.error.type).toBe('permission');
      expect(result.error.message).toContain('not a member');
      expect(result.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'contact_admin' }),
        ])
      );
    });

    it('handles RLS error with no debug info', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'rpc not found' },
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'row-level security' },
        'team-1'
      );

      expect(result.error.type).toBe('permission');
      expect(result.error.message).toContain('Unable to determine permissions');
    });

    it('handles RLS error when user is member but still getting error (temporary)', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { is_team_member: true, has_director_access: false, team_exists: true },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'row-level security' },
        'team-1'
      );

      expect(result.error.type).toBe('permission');
      expect(result.error.message).toContain('Temporary');
      expect(result.actions).toEqual(
        expect.arrayContaining([expect.objectContaining({ action: 'retry' })])
      );
    });

    it('handles permission/access error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'unavailable' },
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'permission denied' },
        'team-1'
      );

      expect(result.error.type).toBe('permission');
    });

    it('handles network error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'network failure', code: 'NETWORK_ERROR' },
        'team-1'
      );

      expect(result.error.type).toBe('network');
      expect(result.actions).toEqual(
        expect.arrayContaining([expect.objectContaining({ action: 'retry' })])
      );
    });

    it('handles unknown error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'something weird happened' },
        'team-1'
      );

      expect(result.error.type).toBe('unknown');
      expect(result.actions.length).toBeGreaterThanOrEqual(2);
    });

    it('handles error with no message', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      } as any);

      const result = await MeetingErrorHandler.analyzeMeetingError({}, 'team-1');

      expect(result.error.type).toBe('unknown');
      expect(result.error.message).toContain('Unknown error');
    });

    it('handles debug info RPC throwing an exception', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('RPC crash'));

      const result = await MeetingErrorHandler.analyzeMeetingError(
        { message: 'something' },
        'team-1'
      );

      // Should still return a result despite debug info failure
      expect(result.error).toBeDefined();
    });
  });

  describe('joinAsTemporaryObserver', () => {
    it('returns false when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.joinAsTemporaryObserver('team-1', 'meeting-1');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Authentication required');
    });

    it('returns true on success', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.joinAsTemporaryObserver('team-1', 'meeting-1');

      expect(result).toBe(true);
    });

    it('returns false on RPC error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      } as any);

      const result = await MeetingErrorHandler.joinAsTemporaryObserver('team-1', 'meeting-1');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });

    it('returns false when RPC returns success=false', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: false, error: 'Not allowed' },
        error: null,
      } as any);

      const result = await MeetingErrorHandler.joinAsTemporaryObserver('team-1', 'meeting-1');

      expect(result).toBe(false);
    });

    it('returns false on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await MeetingErrorHandler.joinAsTemporaryObserver('team-1', 'meeting-1');

      expect(result).toBe(false);
    });
  });

  describe('cleanupTemporaryObservers', () => {
    it('calls RPC and completes without error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        error: null,
      } as any);

      await expect(
        MeetingErrorHandler.cleanupTemporaryObservers('meeting-1')
      ).resolves.toBeUndefined();
    });

    it('handles RPC error gracefully', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        error: { message: 'cleanup failed' },
      } as any);

      await expect(
        MeetingErrorHandler.cleanupTemporaryObservers('meeting-1')
      ).resolves.toBeUndefined();
    });

    it('handles exception gracefully', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('crash'));

      await expect(
        MeetingErrorHandler.cleanupTemporaryObservers('meeting-1')
      ).resolves.toBeUndefined();
    });
  });
});
