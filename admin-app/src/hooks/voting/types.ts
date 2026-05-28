
export interface UserVoteData {
  upvotes: number;
  downvotes: number;
  totalVotes: number;
}

export interface VotingState {
  voteCount: number;
  userVotes: UserVoteData;
  votesUsed: number;
  loading: boolean;
  pendingActions: Set<string>;
}

export interface VotingActions {
  castVote: (voteValue: 1 | -1) => Promise<void>;
  removeVote: (voteValue: 1 | -1) => Promise<void>;
}

export interface UseVotingReturn extends VotingActions {
  voteCount: number;
  userVotes: UserVoteData;
  votesUsed: number;
  votesRemaining: number;
  voteLimit: number;
  loading: boolean;
}
