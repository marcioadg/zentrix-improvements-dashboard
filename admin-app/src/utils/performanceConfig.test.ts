import { describe, it, expect } from 'vitest';
import { PERFORMANCE_CONFIG, getQueryConfig } from './performanceConfig';

describe('PERFORMANCE_CONFIG', () => {
  describe('CACHE configuration', () => {
    it('has defined cache durations', () => {
      expect(PERFORMANCE_CONFIG.CACHE.MEETINGS_STALE_TIME).toBe(2 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.CACHE.MEETINGS_GC_TIME).toBe(15 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.CACHE.TASKS_STALE_TIME).toBe(1 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.CACHE.TASKS_GC_TIME).toBe(10 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.CACHE.TEAMS_STALE_TIME).toBe(5 * 60 * 1000);
      expect(PERFORMANCE_CONFIG.CACHE.SHORT_CACHE).toBe(30 * 1000);
    });

    it('all cache durations are positive numbers', () => {
      Object.values(PERFORMANCE_CONFIG.CACHE).forEach(duration => {
        expect(duration).toBeGreaterThan(0);
        expect(typeof duration).toBe('number');
      });
    });

    it('GC time is greater than or equal to stale time', () => {
      expect(PERFORMANCE_CONFIG.CACHE.MEETINGS_GC_TIME)
        .toBeGreaterThanOrEqual(PERFORMANCE_CONFIG.CACHE.MEETINGS_STALE_TIME);
      expect(PERFORMANCE_CONFIG.CACHE.TASKS_GC_TIME)
        .toBeGreaterThanOrEqual(PERFORMANCE_CONFIG.CACHE.TASKS_STALE_TIME);
    });
  });

  describe('DEBOUNCE configuration', () => {
    it('has defined debounce delays', () => {
      expect(PERFORMANCE_CONFIG.DEBOUNCE.SEARCH).toBe(300);
      expect(PERFORMANCE_CONFIG.DEBOUNCE.API_CALLS).toBe(1500);
      expect(PERFORMANCE_CONFIG.DEBOUNCE.SUBSCRIPTIONS).toBe(1500);
      expect(PERFORMANCE_CONFIG.DEBOUNCE.UI_UPDATES).toBe(100);
    });

    it('all debounce values are positive numbers', () => {
      Object.values(PERFORMANCE_CONFIG.DEBOUNCE).forEach(delay => {
        expect(delay).toBeGreaterThan(0);
        expect(typeof delay).toBe('number');
      });
    });
  });

  describe('RATE_LIMIT configuration', () => {
    it('has defined rate limits', () => {
      expect(PERFORMANCE_CONFIG.RATE_LIMIT.API_CALLS).toBe(2000);
      expect(PERFORMANCE_CONFIG.RATE_LIMIT.REFETCH).toBe(3000);
      expect(PERFORMANCE_CONFIG.RATE_LIMIT.SUBSCRIPTIONS).toBe(1000);
    });

    it('all rate limit values are positive numbers', () => {
      Object.values(PERFORMANCE_CONFIG.RATE_LIMIT).forEach(limit => {
        expect(limit).toBeGreaterThan(0);
        expect(typeof limit).toBe('number');
      });
    });
  });

  describe('THRESHOLDS configuration', () => {
    it('has defined thresholds', () => {
      expect(PERFORMANCE_CONFIG.THRESHOLDS.SLOW_RENDER).toBe(16);
      expect(PERFORMANCE_CONFIG.THRESHOLDS.LARGE_LIST).toBe(100);
      expect(PERFORMANCE_CONFIG.THRESHOLDS.HEAVY_COMPUTATION).toBe(50);
    });

    it('all threshold values are positive numbers', () => {
      Object.values(PERFORMANCE_CONFIG.THRESHOLDS).forEach(threshold => {
        expect(threshold).toBeGreaterThan(0);
        expect(typeof threshold).toBe('number');
      });
    });

    it('SLOW_RENDER threshold is reasonable for 60fps', () => {
      // 60fps = 16.67ms per frame, config uses 16ms
      expect(PERFORMANCE_CONFIG.THRESHOLDS.SLOW_RENDER).toBeLessThanOrEqual(17);
    });
  });

  describe('MONITORING configuration', () => {
    it('has monitoring settings', () => {
      expect(PERFORMANCE_CONFIG.MONITORING).toHaveProperty('ENABLED');
      expect(PERFORMANCE_CONFIG.MONITORING).toHaveProperty('LOG_SLOW_RENDERS');
      expect(PERFORMANCE_CONFIG.MONITORING).toHaveProperty('LOG_API_CALLS');
      expect(PERFORMANCE_CONFIG.MONITORING).toHaveProperty('TRACK_RERENDERS');
    });

    it('monitoring flags are booleans', () => {
      Object.values(PERFORMANCE_CONFIG.MONITORING).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });
});

describe('getQueryConfig', () => {
  describe('meetings configuration', () => {
    it('returns meetings-specific config', () => {
      const config = getQueryConfig('meetings');
      expect(config.staleTime).toBe(PERFORMANCE_CONFIG.CACHE.MEETINGS_STALE_TIME);
      expect(config.gcTime).toBe(PERFORMANCE_CONFIG.CACHE.MEETINGS_GC_TIME);
    });

    it('includes base query options', () => {
      const config = getQueryConfig('meetings');
      expect(config.retry).toBe(1);
      expect(config.refetchOnWindowFocus).toBe(false);
      expect(config.refetchInterval).toBe(false);
    });
  });

  describe('tasks configuration', () => {
    it('returns tasks-specific config', () => {
      const config = getQueryConfig('tasks');
      expect(config.staleTime).toBe(PERFORMANCE_CONFIG.CACHE.TASKS_STALE_TIME);
      expect(config.gcTime).toBe(PERFORMANCE_CONFIG.CACHE.TASKS_GC_TIME);
    });

    it('has shorter stale time than meetings', () => {
      const meetingsConfig = getQueryConfig('meetings');
      const tasksConfig = getQueryConfig('tasks');
      expect(tasksConfig.staleTime).toBeLessThan(meetingsConfig.staleTime);
    });
  });

  describe('teams configuration', () => {
    it('returns teams-specific config', () => {
      const config = getQueryConfig('teams');
      expect(config.staleTime).toBe(PERFORMANCE_CONFIG.CACHE.TEAMS_STALE_TIME);
      expect(config.gcTime).toBe(PERFORMANCE_CONFIG.CACHE.TEAMS_STALE_TIME * 2);
    });

    it('gcTime is double the staleTime', () => {
      const config = getQueryConfig('teams');
      expect(config.gcTime).toBe(config.staleTime * 2);
    });
  });

  describe('general configuration', () => {
    it('returns general config for unknown types', () => {
      const config = getQueryConfig('general');
      expect(config.staleTime).toBe(PERFORMANCE_CONFIG.CACHE.SHORT_CACHE);
      expect(config.gcTime).toBe(PERFORMANCE_CONFIG.CACHE.SHORT_CACHE * 2);
    });

    it('uses short cache for general queries', () => {
      const config = getQueryConfig('general');
      expect(config.staleTime).toBe(30 * 1000);
    });
  });

  describe('base configuration consistency', () => {
    it('all configs include base options', () => {
      const dataTypes: Array<'meetings' | 'tasks' | 'teams' | 'general'> = ['meetings', 'tasks', 'teams', 'general'];
      dataTypes.forEach(type => {
        const config = getQueryConfig(type);
        expect(config.retry).toBe(1);
        expect(config.refetchOnWindowFocus).toBe(false);
        expect(config.refetchInterval).toBe(false);
      });
    });

    it('all configs have valid staleTime and gcTime', () => {
      const dataTypes: Array<'meetings' | 'tasks' | 'teams' | 'general'> = ['meetings', 'tasks', 'teams', 'general'];
      dataTypes.forEach(type => {
        const config = getQueryConfig(type);
        expect(config.staleTime).toBeGreaterThan(0);
        expect(config.gcTime).toBeGreaterThan(0);
        expect(config.gcTime).toBeGreaterThanOrEqual(config.staleTime);
      });
    });
  });

  describe('response structure', () => {
    it('returns object with expected properties', () => {
      const config = getQueryConfig('meetings');
      expect(config).toHaveProperty('retry');
      expect(config).toHaveProperty('refetchOnWindowFocus');
      expect(config).toHaveProperty('refetchInterval');
      expect(config).toHaveProperty('staleTime');
      expect(config).toHaveProperty('gcTime');
    });

    it('does not modify the config on subsequent calls', () => {
      const config1 = getQueryConfig('tasks');
      const config2 = getQueryConfig('tasks');
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object instances
    });
  });

  describe('edge cases', () => {
    it('handles all valid data types', () => {
      const validTypes: Array<'meetings' | 'tasks' | 'teams' | 'general'> = ['meetings', 'tasks', 'teams', 'general'];
      validTypes.forEach(type => {
        expect(() => getQueryConfig(type)).not.toThrow();
      });
    });

    it('returns a new object each call', () => {
      const config1 = getQueryConfig('meetings');
      const config2 = getQueryConfig('meetings');
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });
});
