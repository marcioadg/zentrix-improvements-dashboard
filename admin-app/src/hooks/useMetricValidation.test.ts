import { vi, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn(() => ({ data: null, error: null }))
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

import { useMetricValidation } from './useMetricValidation';

const mockMetrics = [
  { id: 'm1', metric_name: 'Revenue', user_id: 'u1', weeklyValues: { '2024-01-01': 100 } },
  { id: 'm2', metric_name: 'Calls', user_id: 'u2', weeklyValues: { '2024-01-01': 50 } },
] as any[];

describe('useMetricValidation', () => {
  describe('validateMetricValue', () => {
    it('returns valid for empty string', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricValue('');
      expect(validation.isValid).toBe(true);
    });

    it('returns valid for a valid number', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricValue('42');
      expect(validation.isValid).toBe(true);
    });

    it('returns invalid for NaN', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricValue('abc');
      expect(validation.isValid).toBe(false);
    });

    it('returns invalid for out of range value', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricValue('999999999999999999');
      expect(validation.isValid).toBe(false);
    });
  });

  describe('validateMetricUniqueness', () => {
    it('returns valid when no duplicate exists', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricUniqueness('Unique Metric', '2024-01-01', 'u1');
      expect(validation.isValid).toBe(true);
    });

    it('returns invalid when duplicate exists', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateMetricUniqueness('Revenue', '2024-01-01', 'u1');
      expect(validation.isValid).toBe(false);
    });
  });

  describe('validateBeforeSave', () => {
    it('returns invalid for invalid value', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateBeforeSave('m1', '2024-01-01', 'abc', 'u1');
      expect(validation.isValid).toBe(false);
    });

    it('returns invalid when metric not found', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateBeforeSave('nonexistent', '2024-01-01', '100', 'u1');
      expect(validation.isValid).toBe(false);
    });

    it('returns valid for valid input', () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      const validation = result.current.validateBeforeSave('m1', '2024-01-01', '100', 'u1');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('validateMetricNameUniqueness', () => {
    it('returns valid when no existing metric found in supabase', async () => {
      const { result } = renderHook(() => useMetricValidation(mockMetrics));
      let validation: any;
      await act(async () => {
        validation = await result.current.validateMetricNameUniqueness('New Metric', 'u1', 'org1');
      });
      expect(validation.isValid).toBe(true);
    });
  });
});
