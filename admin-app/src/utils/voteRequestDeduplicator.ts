
// Vote-specific request deduplication to prevent rapid-fire voting
class VoteRequestDeduplicator {
  private pendingVotes = new Map<string, Promise<any>>();
  private lastResults = new Map<string, any>();
  private voteHistory = new Map<string, number>();
  private readonly VOTE_COOLDOWN_MS = 300; // Reduced from 500ms to 300ms

  // Generate a unique key for vote requests
  private generateVoteKey(issueId: string, userId: string, voteValue: number): string {
    return `${issueId}-${userId}-${voteValue}`;
  }

  async deduplicateVote<T>(
    issueId: string,
    userId: string,
    voteValue: number,
    voteFn: () => Promise<T>
  ): Promise<T> {
    const voteKey = this.generateVoteKey(issueId, userId, voteValue);
    const now = Date.now();

    // Check if we already have this exact vote pending
    if (this.pendingVotes.has(voteKey)) {
      return this.pendingVotes.get(voteKey) as Promise<T>;
    }

    // During cooldown, return the last successful result instead of blocking the UI
    const lastVoteTime = this.voteHistory.get(voteKey) || 0;
    if (now - lastVoteTime < this.VOTE_COOLDOWN_MS) {
      if (this.lastResults.has(voteKey)) {
        return this.lastResults.get(voteKey) as T;
      }
    }

    // Create new vote request
    const promise = voteFn().finally(() => {
      // Clean up when vote completes
      this.pendingVotes.delete(voteKey);
      this.voteHistory.set(voteKey, Date.now());

      // Clean up old history entries (older than 5 minutes)
      const cutoff = Date.now() - (5 * 60 * 1000);
      for (const [key, timestamp] of this.voteHistory.entries()) {
        if (timestamp < cutoff) {
          this.voteHistory.delete(key);
          this.lastResults.delete(key);
        }
      }
    });

    // Cache the result for cooldown returns
    promise.then((result) => {
      this.lastResults.set(voteKey, result);
    }).catch(() => {
      // Don't cache failed results
    });

    // Store the promise
    this.pendingVotes.set(voteKey, promise);

    return promise;
  }

  clear() {
    this.pendingVotes.clear();
    this.lastResults.clear();
    this.voteHistory.clear();
  }

  getStats() {
    return {
      pendingVotes: this.pendingVotes.size,
      historySize: this.voteHistory.size
    };
  }
}

export const voteRequestDeduplicator = new VoteRequestDeduplicator();
