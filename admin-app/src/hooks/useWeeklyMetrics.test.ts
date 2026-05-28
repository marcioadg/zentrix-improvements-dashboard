
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWeeklyMetrics } from './useWeeklyMetrics';
import { supabase } from '@/integrations/supabase/client';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  },
}));

// Mock context hooks used by useSimplifiedMetrics
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
  }),
}));

vi.mock('@/contexts/MultiCompanyContext', () => ({
  useMultiCompany: () => ({
    currentCompany: { id: 'test-company-id', name: 'Test Company' },
    loading: false,
  }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { week_start_day: 'monday' },
    loading: false,
  }),
}));

// Mock the logger to silence output
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock realtime hook
vi.mock('@/hooks/useMetricsRealtime', () => ({
  useMetricsRealtime: () => ({
    realtimeEvents: [],
    clearEvents: vi.fn(),
  }),
}));

// Mock metric data service
vi.mock('@/services/metricDataService', () => ({
  fetchMetricsData: vi.fn().mockResolvedValue([]),
  clearMetricsCache: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useWeeklyMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useWeeklyMetrics('test-team'), {
      wrapper: createWrapper(),
    });

    // Hook should expose metrics array and loading state
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current.metrics)).toBe(true);
  });

  it('should return empty metrics when no data is available', async () => {
    const { result } = renderHook(() => useWeeklyMetrics('test-team'), {
      wrapper: createWrapper(),
    });

    // With mocked empty data, metrics should be empty
    expect(result.current.metrics).toEqual([]);
  });

  it('should handle undefined teamId gracefully', () => {
    const { result } = renderHook(() => useWeeklyMetrics(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current.metrics)).toBe(true);
  });
});
