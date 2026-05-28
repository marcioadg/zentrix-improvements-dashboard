import { vi } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { VotingService } from './VotingService';

describe('VotingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('castVote', () => {
    it('returns success with votesRemaining on successful vote', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, votes_remaining: 3 },
        error: null,
      } as any);

      const result = await VotingService.castVote('issue-1', 1, 'team-1', 'meeting-1');

      expect(result.success).toBe(true);
      expect(result.votesRemaining).toBe(3);
    });

    it('returns failure with error on supabase error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as any);

      const result = await VotingService.castVote('issue-1', 1, 'team-1', 'meeting-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('returns failure when response has success=false', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: false, error: 'Vote limit reached', votes_remaining: 0 },
        error: null,
      } as any);

      const result = await VotingService.castVote('issue-1', 1, 'team-1', 'meeting-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Vote limit reached');
    });

    it('returns generic error on exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));

      const result = await VotingService.castVote('issue-1', 1, 'team-1', 'meeting-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to cast vote');
    });
  });

  describe('removeVote', () => {
    it('returns error when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await VotingService.removeVote('issue-1', 1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('returns success on successful removal', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      // First call: select to find the vote (issue_votes)
      // Second call: delete the vote (issue_votes)
      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // SELECT query: .select().eq().eq().eq().order().limit().single()
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({
                          data: { id: 'vote-1' },
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        } else {
          // DELETE query: .delete().eq()
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          } as any;
        }
      });

      const result = await VotingService.removeVote('issue-1', 1);

      expect(result.success).toBe(true);
    });

    it('returns error when no vote found to remove', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: 'No rows found' },
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      } as any);

      const result = await VotingService.removeVote('issue-1', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getIssueVoteCount', () => {
    it('returns count from RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
      } as any);

      const result = await VotingService.getIssueVoteCount('issue-1');

      expect(result).toBe(5);
    });

    it('returns 0 on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Error' },
      } as any);

      const result = await VotingService.getIssueVoteCount('issue-1');

      expect(result).toBe(0);
    });
  });

  describe('getUserIssueVotes', () => {
    it('returns zeros when no user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await VotingService.getUserIssueVotes('issue-1');

      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(0);
      expect(result.totalVotes).toBe(0);
    });

    it('returns correct upvotes/downvotes/totalVotes', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { vote_value: 1 },
                { vote_value: 1 },
                { vote_value: -1 },
              ],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await VotingService.getUserIssueVotes('issue-1');

      expect(result.upvotes).toBe(2);
      expect(result.downvotes).toBe(1);
      expect(result.totalVotes).toBe(1); // net: 2 - 1 = 1, max(0, 1) = 1
    });
  });

  describe('updateCompanyVoteLimit', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await VotingService.updateCompanyVoteLimit('team-1', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('returns success when update succeeds', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await VotingService.updateCompanyVoteLimit('team-1', 10);

      expect(result.success).toBe(true);
    });

    it('returns failure on update error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      } as any);

      const result = await VotingService.updateCompanyVoteLimit('team-1', 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });

    it('returns failure on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await VotingService.updateCompanyVoteLimit('team-1', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update');
    });
  });

  describe('updateMeetingVoteLimit', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await VotingService.updateMeetingVoteLimit('meeting-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authenticated');
    });

    it('returns success when update succeeds', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any);

      const result = await VotingService.updateMeetingVoteLimit('meeting-1', 5);

      expect(result.success).toBe(true);
    });

    it('returns failure on update error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
        }),
      } as any);

      const result = await VotingService.updateMeetingVoteLimit('meeting-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toBe('DB error');
    });

    it('returns failure on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await VotingService.updateMeetingVoteLimit('meeting-1', 5);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to update meeting vote limit');
    });
  });

  describe('getUserVotesUsed', () => {
    it('returns 0 when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      const result = await VotingService.getUserVotesUsed('team-1', 'meeting-1');

      expect(result).toBe(0);
    });

    it('returns vote count from RPC', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 7,
        error: null,
      } as any);

      const result = await VotingService.getUserVotesUsed('team-1', 'meeting-1');

      expect(result).toBe(7);
    });

    it('returns 0 on RPC error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      const result = await VotingService.getUserVotesUsed('team-1', 'meeting-1');

      expect(result).toBe(0);
    });

    it('returns 0 on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await VotingService.getUserVotesUsed('team-1', 'meeting-1');

      expect(result).toBe(0);
    });
  });

  describe('getIssueVoteCount with meetingStateId', () => {
    it('passes meetingStateId to RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 3,
        error: null,
      } as any);

      const result = await VotingService.getIssueVoteCount('issue-1', 'meeting-1');

      expect(result).toBe(3);
      expect(supabase.rpc).toHaveBeenCalledWith('get_issue_vote_count_with_meeting', {
        p_issue_id: 'issue-1',
        p_meeting_state_id: 'meeting-1',
      });
    });

    it('returns 0 on exception', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('crash'));

      const result = await VotingService.getIssueVoteCount('issue-1');

      expect(result).toBe(0);
    });
  });

  describe('getUserIssueVotes edge cases', () => {
    it('returns zeros on query error', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query error' },
            }),
          }),
        }),
      } as any);

      const result = await VotingService.getUserIssueVotes('issue-1');

      expect(result).toEqual({ upvotes: 0, downvotes: 0, totalVotes: 0 });
    });

    it('returns zeros on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await VotingService.getUserIssueVotes('issue-1');

      expect(result).toEqual({ upvotes: 0, downvotes: 0, totalVotes: 0 });
    });

    it('handles meetingStateId filter', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);
      const mockEq = vi.fn().mockResolvedValue({
        data: [{ vote_value: 1 }],
        error: null,
      });
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      } as any);

      const result = await VotingService.getUserIssueVotes('issue-1', 'meeting-1');

      expect(result.upvotes).toBe(1);
    });
  });

  describe('removeVote with meetingStateId', () => {
    it('filters by meetingStateId when provided', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as any);

      let callCount = 0;
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        limit: vi.fn().mockReturnValue({
                          single: vi.fn().mockResolvedValue({
                            data: { id: 'vote-1' },
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          } as any;
        }
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        } as any;
      });

      const result = await VotingService.removeVote('issue-1', 1, 'meeting-1');

      expect(result.success).toBe(true);
    });

    it('returns failure on exception', async () => {
      vi.mocked(supabase.auth.getUser).mockRejectedValue(new Error('crash'));

      const result = await VotingService.removeVote('issue-1', 1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove vote');
    });
  });
});
