import { describe, it, expect, vi } from 'vitest';
import { filterMetrics, formatCellKey, clearTransientState } from './metricsPageHelpers';

describe('filterMetrics', () => {
  const metrics = [
    { metric_name: 'Revenue', owner: 'Alice' },
    { metric_name: 'Churn Rate', owner: 'Bob' },
    { metric_name: 'NPS Score', owner: 'Alice' },
    { metric_name: 'Conversion', owner: 'Charlie' },
  ];

  it('filters by metric name (case-insensitive)', () => {
    const result = filterMetrics(metrics, 'revenue');
    expect(result).toHaveLength(1);
    expect(result[0].metric_name).toBe('Revenue');
  });

  it('filters by owner name (case-insensitive)', () => {
    const result = filterMetrics(metrics, 'alice');
    expect(result).toHaveLength(2);
  });

  it('returns all metrics for empty search', () => {
    const result = filterMetrics(metrics, '');
    expect(result).toHaveLength(4);
  });

  it('returns empty array when nothing matches', () => {
    const result = filterMetrics(metrics, 'zzz');
    expect(result).toHaveLength(0);
  });

  it('matches partial strings', () => {
    const result = filterMetrics(metrics, 'conv');
    expect(result).toHaveLength(1);
    expect(result[0].metric_name).toBe('Conversion');
  });

  it('handles empty metrics array', () => {
    expect(filterMetrics([], 'test')).toEqual([]);
  });
});

describe('formatCellKey', () => {
  it('combines metricId and weekStart with dash', () => {
    expect(formatCellKey('abc-123', '2026-03-22')).toBe('abc-123-2026-03-22');
  });

  it('handles empty strings', () => {
    expect(formatCellKey('', '')).toBe('-');
  });
});

describe('clearTransientState', () => {
  it('calls all setters with reset values', () => {
    const setEditingCell = vi.fn();
    const setEditValue = vi.fn();
    const setSelectedMetrics = vi.fn();

    clearTransientState(setEditingCell, setEditValue, setSelectedMetrics);

    expect(setEditingCell).toHaveBeenCalledWith(null);
    expect(setEditValue).toHaveBeenCalledWith('');
    expect(setSelectedMetrics).toHaveBeenCalledWith([]);
  });
});
