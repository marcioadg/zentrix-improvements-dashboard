
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface VoteResult {
  success: boolean;
  error?: string;
  votesRemaining?: number;
}

export interface UserVoteData {
  upvotes: number;
  downvotes: number;
  totalVotes: number;
}

export interface IssueVoteData {
  issueId: string;
  totalVotes: number;
  userVotes: UserVoteData;
}

// Interface for the cast_vote function response
interface CastVoteResponse {
  success: boolean;
  error?: string;
  votes_remaining?: number;
}

export class VotingService {
  static async castVote(
    issueId: string,
    voteValue: 1 | -1,
    teamId: string,
    meetingStateId: string
  ): Promise<VoteResult> {
    try {
      const { data, error } = await supabase.rpc('cast_vote', {
        p_issue_id: issueId,
        p_vote_value: voteValue,
        p_team_id: teamId,
        p_meeting_state_id: meetingStateId
      });

      if (error) {
        logger.error('VotingService: Error casting vote:', error);
        return { success: false, error: error.message };
      }

      // Type assertion to properly access the response properties
      const response = data as unknown as CastVoteResponse;

      if (!response.success) {
        return { success: false, error: response.error, votesRemaining: response.votes_remaining };
      }

      return { success: true, votesRemaining: response.votes_remaining };
    } catch (error) {
      logger.error('VotingService: Exception casting vote:', error);
      return { success: false, error: 'Failed to cast vote' };
    }
  }

  static async removeVote(
    issueId: string,
    voteValue: 1 | -1,
    meetingStateId?: string
  ): Promise<VoteResult> {
    try {
      // Get current user to ensure we're only removing their votes
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // First, find the most recent vote to delete
      let query = supabase
        .from('issue_votes')
        .select('id')
        .eq('issue_id', issueId)
        .eq('user_id', user.id)
        .eq('vote_value', voteValue);
        
      // Filter by meeting if provided (for meeting-scoped votes)
      if (meetingStateId) {
        query = query.eq('meeting_state_id', meetingStateId);
      }
      
      const { data: voteToDelete, error: selectError } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (selectError) {
        logger.error('VotingService: Error finding vote to remove:', selectError);
        return { success: false, error: 'No vote found to remove' };
      }

      if (!voteToDelete) {
        return { success: false, error: 'No vote found to remove' };
      }

      // Now delete the specific vote by ID
      const { error: deleteError } = await supabase
        .from('issue_votes')
        .delete()
        .eq('id', voteToDelete.id);

      if (deleteError) {
        logger.error('VotingService: Error removing vote:', deleteError);
        return { success: false, error: deleteError.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('VotingService: Exception removing vote:', error);
      return { success: false, error: 'Failed to remove vote' };
    }
  }

  static async getIssueVoteCount(issueId: string, meetingStateId?: string): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('get_issue_vote_count_with_meeting', {
        p_issue_id: issueId,
        p_meeting_state_id: meetingStateId || null
      });

      if (error) {
        logger.error('VotingService: Error getting vote count:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      logger.error('VotingService: Exception getting vote count:', error);
      return 0;
    }
  }

  static async getUserIssueVotes(issueId: string, meetingStateId?: string): Promise<UserVoteData> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { upvotes: 0, downvotes: 0, totalVotes: 0 };
      }

      // Query issue_votes table directly with meeting filter
      let query = supabase
        .from('issue_votes')
        .select('vote_value')
        .eq('user_id', user.id)
        .eq('issue_id', issueId);

      // Filter by meeting if provided
      if (meetingStateId) {
        query = query.eq('meeting_state_id', meetingStateId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('VotingService: Error getting user votes:', error);
        return { upvotes: 0, downvotes: 0, totalVotes: 0 };
      }

      const upvotes = data?.filter(v => v.vote_value === 1).length || 0;
      const downvotes = data?.filter(v => v.vote_value === -1).length || 0;
      
      // Calculate net votes: each upvote = +1, each downvote = -1 from user's total allocation
      const totalVotes = data?.reduce((sum, vote) => sum + vote.vote_value, 0) || 0;

      return {
        upvotes,
        downvotes,
        totalVotes: Math.max(0, totalVotes) // Ensure never negative
      };
    } catch (error) {
      logger.error('VotingService: Exception getting user votes:', error);
      return { upvotes: 0, downvotes: 0, totalVotes: 0 };
    }
  }

  static async getUserVotesUsed(
    teamId: string,
    meetingStateId: string
  ): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return 0;
      }

      const { data, error } = await supabase.rpc('get_user_votes_used', {
        p_user_id: user.id,
        p_team_id: teamId,
        p_meeting_state_id: meetingStateId
      });

      if (error) {
        logger.error('VotingService: Error getting votes used:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      logger.error('VotingService: Exception getting votes used:', error);
      return 0;
    }
  }

  // Update user vote limit (personal setting)
  static async updateCompanyVoteLimit(teamId: string, voteLimit: number): Promise<VoteResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('teams')
        .update({ company_vote_limit: voteLimit })
        .eq('id', teamId);

      if (error) {
        logger.error('VotingService: Error updating company vote limit:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('VotingService: Exception updating company vote limit:', error);
      return { success: false, error: 'Failed to update company vote limit' };
    }
  }

  // Update meeting vote limit (scriber setting for team)
  static async updateMeetingVoteLimit(meetingId: string, voteLimit: number): Promise<VoteResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('meetings_state')
        .update({ vote_limit: voteLimit })
        .eq('id', meetingId);

      if (error) {
        logger.error('VotingService: Error updating meeting vote limit:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error('VotingService: Exception updating meeting vote limit:', error);
      return { success: false, error: 'Failed to update meeting vote limit' };
    }
  }
}
