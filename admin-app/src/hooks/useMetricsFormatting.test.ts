import { vi, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/utils/metricUtils', () => ({
  checkTargetCondition: (value: number, target: number, logic: string) => {
    if (logic === 'greater_than_or_equal') return value >= target;
    if (logic === 'less_than_or_equal') return value <= target;
    return value >= target;
  },
}));

import { useMetricsFormatting } from './useMetricsFormatting';

describe('useMetricsFormatting', () => {
  describe('formatValue', () => {
    it('returns "-" for null value', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(null, 'Number')).toBe('-');
    });

    it('formats percentage', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(85, 'Percentage')).toBe('85%');
      expect(result.current.formatValue(85.5, 'Percentage')).toBe('85.5%');
    });

    it('formats currency with $ symbol', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(1000, 'Currency')).toBe('$1,000');
      expect(result.current.formatValue(1234.56, 'Currency')).toBe('$1,234.56');
    });

    it('formats Yes/No', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(1, 'Yes/No')).toBe('Yes');
      expect(result.current.formatValue(0, 'Yes/No')).toBe('No');
      expect(result.current.formatValue(5, 'Yes/No')).toBe('5');
    });

    it('formats Number with thousands separator', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(10000, 'Number')).toBe('10,000');
      expect(result.current.formatValue(42.7, 'Number')).toBe('42.7');
    });

    it('formats Time values', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(120, 'Time')).toBe('120');
      expect(result.current.formatValue(3.5, 'Time')).toBe('3.5');
    });

    it('formats unknown unit with thousands separator', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      expect(result.current.formatValue(5000, 'Custom')).toBe('5,000');
    });
  });

  describe('getValueColor', () => {
    it('returns muted foreground when no target is set', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = { target_value: null };
      expect(result.current.getValueColor(50, metric)).toBe('text-muted-foreground');
    });

    it('returns muted foreground with opacity when value is null', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = { target_value: 100 };
      expect(result.current.getValueColor(null, metric)).toBe('text-muted-foreground/50');
    });

    it('returns on-target class when target is met', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = { target_value: 50 };
      expect(result.current.getValueColor(60, metric)).toBe('text-foreground metric-on-target');
    });

    it('returns off-target class when target is not met', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = { target_value: 100 };
      expect(result.current.getValueColor(50, metric)).toBe('text-foreground metric-off-target');
    });

    it('uses aggregatedCustomTargets when weekStart matches', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = {
        target_value: 100,
        aggregatedCustomTargets: { '2026-01-01': 30 },
      };
      // value 30 >= custom target 30 → met
      expect(result.current.getValueColor(30, metric, '2026-01-01')).toBe('text-foreground metric-on-target');
    });

    it('uses weeklyCustomTargets when weekStart matches', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = {
        target_value: 100,
        weeklyCustomTargets: { '2026-01-01': { custom_target_value: 20 } },
      };
      expect(result.current.getValueColor(20, metric, '2026-01-01')).toBe('text-foreground metric-on-target');
    });

    it('uses adjusted_target_value as fallback', () => {
      const { result } = renderHook(() => useMetricsFormatting());
      const metric = { target_value: 100, adjusted_target_value: 40 };
      expect(result.current.getValueColor(40, metric)).toBe('text-foreground metric-on-target');
    });
  });
});
