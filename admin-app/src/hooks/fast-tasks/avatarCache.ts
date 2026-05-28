/**
 * Avatar cache to reduce redundant profile fetches
 * Caches avatar URLs and full names for 5 minutes
 */

interface CachedProfile {
  avatarUrl: string | null;
  fullName: string | null;
  timestamp: number;
}

class AvatarCache {
  private cache = new Map<string, CachedProfile>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  get(userId: string): CachedProfile | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  set(userId: string, avatarUrl: string | null, fullName: string | null): void {
    this.cache.set(userId, {
      avatarUrl,
      fullName,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Get multiple profiles, returns map of found ones
  getMany(userIds: string[]): Map<string, CachedProfile> {
    const found = new Map<string, CachedProfile>();
    for (const userId of userIds) {
      const cached = this.get(userId);
      if (cached) {
        found.set(userId, cached);
      }
    }
    return found;
  }

  // Set multiple profiles at once
  setMany(profiles: Array<{ id: string; avatar_url: string | null; full_name: string | null }>): void {
    for (const profile of profiles) {
      this.set(profile.id, profile.avatar_url, profile.full_name);
    }
  }
}

// Export singleton instance
export const avatarCache = new AvatarCache();
