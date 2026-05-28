/**
 * Performance configuration for the application
 * Centralized settings for caching, debouncing, and optimization thresholds
 */

export const PERFORMANCE_CONFIG = {
  // API caching durations
  CACHE: {
    MEETINGS_STALE_TIME: 2 * 60 * 1000, // 2 minutes
    MEETINGS_GC_TIME: 15 * 60 * 1000, // 15 minutes
    TASKS_STALE_TIME: 1 * 60 * 1000, // 1 minute
    TASKS_GC_TIME: 10 * 60 * 1000, // 10 minutes
    TEAMS_STALE_TIME: 5 * 60 * 1000, // 5 minutes
    SHORT_CACHE: 30 * 1000 // 30 seconds
  },

  // Debouncing and throttling delays
  DEBOUNCE: {
    SEARCH: 300, // Search input debouncing
    API_CALLS: 1500, // API call debouncing
    SUBSCRIPTIONS: 1500, // Real-time subscription debouncing
    UI_UPDATES: 100 // UI update debouncing
  },

  // Rate limiting
  RATE_LIMIT: {
    API_CALLS: 2000, // Min time between similar API calls (ms)
    REFETCH: 3000, // Min time between refetch calls
    SUBSCRIPTIONS: 1000 // Min time between subscription triggers
  },

  // Performance thresholds
  THRESHOLDS: {
    SLOW_RENDER: 16, // Render time threshold for 60fps (ms)
    LARGE_LIST: 100, // When to use virtualization
    HEAVY_COMPUTATION: 50 // When to use web workers (ms)
  },

  // Feature flags for performance monitoring
  MONITORING: {
    ENABLED: process.env.NODE_ENV === 'development',
    LOG_SLOW_RENDERS: true,
    LOG_API_CALLS: false,
    TRACK_RERENDERS: true
  }
};

/**
 * Get optimized query configuration based on data type
 */
export const getQueryConfig = (dataType: 'meetings' | 'tasks' | 'teams' | 'general') => {
  const baseConfig = {
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  };

  switch (dataType) {
    case 'meetings':
      return {
        ...baseConfig,
        staleTime: PERFORMANCE_CONFIG.CACHE.MEETINGS_STALE_TIME,
        gcTime: PERFORMANCE_CONFIG.CACHE.MEETINGS_GC_TIME,
      };
    case 'tasks':
      return {
        ...baseConfig,
        staleTime: PERFORMANCE_CONFIG.CACHE.TASKS_STALE_TIME,
        gcTime: PERFORMANCE_CONFIG.CACHE.TASKS_GC_TIME,
      };
    case 'teams':
      return {
        ...baseConfig,
        staleTime: PERFORMANCE_CONFIG.CACHE.TEAMS_STALE_TIME,
        gcTime: PERFORMANCE_CONFIG.CACHE.TEAMS_STALE_TIME * 2,
      };
    default:
      return {
        ...baseConfig,
        staleTime: PERFORMANCE_CONFIG.CACHE.SHORT_CACHE,
        gcTime: PERFORMANCE_CONFIG.CACHE.SHORT_CACHE * 2,
      };
  }
};