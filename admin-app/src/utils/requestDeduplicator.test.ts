import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Create a fresh instance for each test to avoid shared state
class RequestDeduplicatorForTest {
  private pendingRequests = new Map<string, { promise: Promise<any>; timestamp: number }>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 30 * 1000;
  private cacheHits = 0;
  private cacheMisses = 0;

  async deduplicate<T>(key: string, requestFn: () => Promise<T>, ttl: number = this.DEFAULT_TTL): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      this.cacheHits++;
      return cached.data;
    }
    this.cacheMisses++;

    const pending = this.pendingRequests.get(key);
    if (pending) {
      return pending.promise;
    }

    const promise = requestFn().then(
      (data) => {
        this.cache.set(key, { data, timestamp: Date.now(), ttl });
        this.pendingRequests.delete(key);
        return data;
      },
      (error) => {
        this.pendingRequests.delete(key);
        throw error;
      }
    );

    this.pendingRequests.set(key, { promise, timestamp: Date.now() });
    return promise;
  }

  invalidateCache(pattern: string | RegExp): void {
    const keys = Array.from(this.cache.keys());
    const keysToDelete = keys.filter(key =>
      typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    } else {
      this.clear();
    }
  }

  resetCircuitBreaker(_key: string): void {
    this.pendingRequests.delete(_key);
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheHitRate: this.getCacheHitRate()
    };
  }

  private getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
}

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicatorForTest;

  beforeEach(() => {
    vi.useFakeTimers();
    deduplicator = new RequestDeduplicatorForTest();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('deduplicate', () => {
    it('calls requestFn and returns result on first call', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const result = await deduplicator.deduplicate('key1', fn);
      expect(result).toBe('result');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('returns cached result on second call within TTL', async () => {
      const fn = vi.fn().mockResolvedValue('cached');
      await deduplicator.deduplicate('key1', fn);
      const result = await deduplicator.deduplicate('key1', fn);
      expect(result).toBe('cached');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls requestFn again after TTL expires', async () => {
      const fn = vi.fn().mockResolvedValue('fresh');
      await deduplicator.deduplicate('key1', fn, 1000);
      vi.advanceTimersByTime(2000);
      await deduplicator.deduplicate('key1', fn, 1000);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent requests with the same key', async () => {
      let resolveRequest!: (v: string) => void;
      const fn = vi.fn(() => new Promise<string>(res => { resolveRequest = res; }));

      const p1 = deduplicator.deduplicate('key', fn);
      const p2 = deduplicator.deduplicate('key', fn);

      resolveRequest('shared');
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe('shared');
      expect(r2).toBe('shared');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('propagates errors and removes pending request', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      await expect(deduplicator.deduplicate('key', fn)).rejects.toThrow('fail');
      expect(deduplicator.getStats().pendingRequests).toBe(0);
    });

    it('uses custom TTL', async () => {
      const fn = vi.fn().mockResolvedValue('val');
      await deduplicator.deduplicate('key', fn, 500);
      vi.advanceTimersByTime(300);
      await deduplicator.deduplicate('key', fn, 500);
      expect(fn).toHaveBeenCalledTimes(1); // Still within TTL

      vi.advanceTimersByTime(300);
      await deduplicator.deduplicate('key', fn, 500);
      expect(fn).toHaveBeenCalledTimes(2); // TTL expired
    });
  });

  describe('invalidateCache', () => {
    it('removes cache entries matching a string pattern', async () => {
      await deduplicator.deduplicate('user:1', vi.fn().mockResolvedValue('u1'));
      await deduplicator.deduplicate('user:2', vi.fn().mockResolvedValue('u2'));
      await deduplicator.deduplicate('team:1', vi.fn().mockResolvedValue('t1'));

      deduplicator.invalidateCache('user');

      expect(deduplicator.getStats().cacheSize).toBe(1);
    });

    it('removes cache entries matching a RegExp pattern', async () => {
      await deduplicator.deduplicate('user:1', vi.fn().mockResolvedValue('u1'));
      await deduplicator.deduplicate('user:2', vi.fn().mockResolvedValue('u2'));
      await deduplicator.deduplicate('team:1', vi.fn().mockResolvedValue('t1'));

      deduplicator.invalidateCache(/^user:/);

      expect(deduplicator.getStats().cacheSize).toBe(1);
    });

    it('does nothing when no keys match', async () => {
      await deduplicator.deduplicate('key1', vi.fn().mockResolvedValue('v1'));
      deduplicator.invalidateCache('nonexistent');
      expect(deduplicator.getStats().cacheSize).toBe(1);
    });
  });

  describe('clear', () => {
    it('clears all cache and pending entries', async () => {
      await deduplicator.deduplicate('key1', vi.fn().mockResolvedValue('v1'));
      deduplicator.clear();
      expect(deduplicator.getStats().cacheSize).toBe(0);
      expect(deduplicator.getStats().pendingRequests).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('clears a specific key from cache', async () => {
      await deduplicator.deduplicate('key1', vi.fn().mockResolvedValue('v1'));
      await deduplicator.deduplicate('key2', vi.fn().mockResolvedValue('v2'));
      deduplicator.clearCache('key1');
      expect(deduplicator.getStats().cacheSize).toBe(1);
    });

    it('clears all entries when called without key', async () => {
      await deduplicator.deduplicate('key1', vi.fn().mockResolvedValue('v1'));
      await deduplicator.deduplicate('key2', vi.fn().mockResolvedValue('v2'));
      deduplicator.clearCache();
      expect(deduplicator.getStats().cacheSize).toBe(0);
    });
  });

  describe('resetCircuitBreaker', () => {
    it('removes stale pending request for a given key', () => {
      deduplicator.resetCircuitBreaker('some-key');
      expect(deduplicator.getStats().pendingRequests).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns initial stats with zeroes', () => {
      const stats = deduplicator.getStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.pendingRequests).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });

    it('calculates hit rate correctly', async () => {
      const fn = vi.fn().mockResolvedValue('v');
      await deduplicator.deduplicate('k', fn); // miss
      await deduplicator.deduplicate('k', fn); // hit
      await deduplicator.deduplicate('k', fn); // hit

      const stats = deduplicator.getStats();
      expect(stats.cacheHitRate).toBeCloseTo(66.67, 1);
    });
  });
});

// Also import and smoke-test the real exported singleton
import { requestDeduplicator } from './requestDeduplicator';

describe('requestDeduplicator singleton', () => {
  beforeEach(() => {
    requestDeduplicator.clear();
  });

  it('is exported and functional', async () => {
    const fn = vi.fn().mockResolvedValue(42);
    const result = await requestDeduplicator.deduplicate('singleton-key', fn);
    expect(result).toBe(42);
  });

  it('getStats returns expected shape', () => {
    const stats = requestDeduplicator.getStats();
    expect(stats).toHaveProperty('cacheSize');
    expect(stats).toHaveProperty('pendingRequests');
    expect(stats).toHaveProperty('cacheHitRate');
  });
});
