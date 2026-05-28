/**
 * 🎯 PHASE 2: Team Members Caching Layer
 * Eliminates duplicate network requests for team members data
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CachedTeamMembers<T = any> {
  data: T[];
  timestamp: number;
  companyId?: string;
}

interface FetchOptions {
  teamId: string;
  fetchFn: () => Promise<any>;
  cacheKey?: string;
}

class TeamMembersCache {
  private cache = new Map<string, CachedTeamMembers>();
  private inflightRequests = new Map<string, Promise<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private subscribers = new Set<() => void>();

  /**
   * Get team members from cache or fetch if needed
   * Deduplicates simultaneous requests to the same team
   */
  async getTeamMembers<T = any>(options: FetchOptions): Promise<T[]> {
    const { teamId, fetchFn, cacheKey = teamId } = options;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      logger.debug('🎯 TeamMembersCache: Cache HIT for', cacheKey);
      return cached.data as T[];
    }

    // Check if already fetching (request deduplication)
    const inflight = this.inflightRequests.get(cacheKey);
    if (inflight) {
      logger.debug('🔄 TeamMembersCache: Reusing in-flight request for', cacheKey);
      return inflight as Promise<T[]>;
    }

    // Fetch and cache
    logger.debug('📡 TeamMembersCache: Cache MISS - fetching', cacheKey);
    const promise = fetchFn();
    this.inflightRequests.set(cacheKey, promise);

    try {
      const data = await promise;
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      logger.debug('✅ TeamMembersCache: Cached data for', cacheKey, '- size:', data.length);
      return data as T[];
    } catch (error) {
      logger.error('❌ TeamMembersCache: Fetch failed for', cacheKey, error);
      throw error;
    } finally {
      this.inflightRequests.delete(cacheKey);
    }
  }

  /**
   * Invalidate cache for specific team or all teams
   */
  invalidate(teamId?: string): void {
    if (teamId) {
      this.cache.delete(teamId);
      logger.debug('🧹 TeamMembersCache: Invalidated cache for', teamId);
    } else {
      this.cache.clear();
      logger.debug('🧹 TeamMembersCache: Cleared all cache');
    }
    
    // Notify subscribers
    this.subscribers.forEach(callback => callback());
  }

  /**
   * Subscribe to cache invalidation events
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      cachedTeams: this.cache.size,
      inflightRequests: this.inflightRequests.size,
      cacheEntries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        size: value.data.length,
        age: Date.now() - value.timestamp,
        expired: Date.now() - value.timestamp > this.TTL,
      })),
    };
  }
}

// Global singleton instance
export const teamMembersCache = new TeamMembersCache();

/**
 * Hook to automatically invalidate cache on real-time updates
 */
export const useTeamMembersCacheInvalidation = () => {
  useEffect(() => {
    logger.log('🔔 TeamMembersCache: Setting up real-time invalidation');

    const channel = supabase
      .channel('team_members_cache_invalidation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
        },
        (payload) => {
          logger.log('🔔 TeamMembersCache: Real-time update detected:', payload);
          
          // Invalidate cache for the affected team
          if (payload.new && 'team_id' in payload.new) {
            teamMembersCache.invalidate(payload.new.team_id as string);
          }
          if (payload.old && 'team_id' in payload.old) {
            teamMembersCache.invalidate(payload.old.team_id as string);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_members',
        },
        (payload) => {
          logger.log('🔔 TeamMembersCache: Company members update detected - clearing all cache');
          // Clear all cache when company membership changes
          teamMembersCache.invalidate();
        }
      )
      .subscribe();

    return () => {
      logger.log('🔔 TeamMembersCache: Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, []);
};
