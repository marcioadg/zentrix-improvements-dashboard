import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from '@/integrations/supabase/client';
import { issuesTeamPreferenceService } from './issuesTeamPreferenceService';

describe('issuesTeamPreferenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMostLikelyTeam', () => {
    it('returns null (not yet implemented)', async () => {
      const result = await issuesTeamPreferenceService.getMostLikelyTeam('u1');
      expect(result).toBeNull();
    });
  });

  describe('updateTeamPreference', () => {
    it('calls RPC with correct params', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);
      await issuesTeamPreferenceService.updateTeamPreference('u1', 't1');
      expect(supabase.rpc).toHaveBeenCalledWith('update_issues_team_preference', {
        p_user_id: 'u1',
        p_team_id: 't1',
      });
    });

    it('throws on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'rpc fail' },
      } as any);
      await expect(
        issuesTeamPreferenceService.updateTeamPreference('u1', 't1')
      ).rejects.toThrow('Failed to update team preference');
    });

    it('throws on exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('network'));
      await expect(
        issuesTeamPreferenceService.updateTeamPreference('u1', 't1')
      ).rejects.toThrow('network');
    });
  });
});
