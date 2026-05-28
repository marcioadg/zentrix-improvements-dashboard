/**
 * 🎯 PHASE 4: Request Deduplication System
 * Prevents duplicate API calls and manages request caching
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  private readonly DEFAULT_TTL = 30 * 1000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    // Periodic cleanup of expired requests and cache
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Deduplicate requests based on a unique key
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      this.cacheHits++;
      return cached.data;
    }
    this.cacheMisses++;

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    // Create new request
    const promise = requestFn().then(
      (data) => {
        // Cache successful response
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });
        // Remove from pending
        this.pendingRequests.delete(key);
        return data;
      },
      (error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      }
    );

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Invalidate cache entries by key pattern
   */
  invalidateCache(pattern: string | RegExp): void {
    const keys = Array.from(this.cache.keys());
    const keysToDelete = keys.filter(key => 
      typeof pattern === 'string' 
        ? key.includes(pattern)
        : pattern.test(key)
    );
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
  }

  /**
   * Clear all cache and pending requests
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Clear cache entries matching a specific key
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    } else {
      this.clear();
    }
  }

  /**
   * Reset circuit breaker state for a given key (no-op placeholder for compatibility)
   */
  resetCircuitBreaker(_key: string): void {
    // Circuit breaker logic is handled externally; this clears any stale pending request
    this.pendingRequests.delete(_key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Cleanup expired cache entries
    for (const [key, cached] of this.cache.entries()) {
      if ((now - cached.timestamp) > cached.ttl) {
        this.cache.delete(key);
      }
    }

    // Cleanup stale pending requests (older than 5 minutes)
    for (const [key, pending] of this.pendingRequests.entries()) {
      if ((now - pending.timestamp) > 5 * 60 * 1000) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  private cacheHits = 0;
  private cacheMisses = 0;

  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();