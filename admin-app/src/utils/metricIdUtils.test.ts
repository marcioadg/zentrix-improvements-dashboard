import { describe, it, expect } from 'vitest';
import { cleanMetricId } from './metricIdUtils';

describe('cleanMetricId', () => {
  it('removes test- prefix', () => {
    expect(cleanMetricId('test-abc-123')).toBe('abc-123');
  });

  it('does not modify IDs without test- prefix', () => {
    expect(cleanMetricId('abc-123')).toBe('abc-123');
  });

  it('only removes leading test- prefix', () => {
    expect(cleanMetricId('my-test-id')).toBe('my-test-id');
  });

  it('handles UUID-like strings with test- prefix', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(cleanMetricId(`test-${uuid}`)).toBe(uuid);
  });

  it('returns empty string for empty input', () => {
    expect(cleanMetricId('')).toBe('');
  });

  it('handles single test- prefix removal', () => {
    expect(cleanMetricId('test-')).toBe('');
  });

  it('does not double-remove test- prefix', () => {
    expect(cleanMetricId('test-test-abc')).toBe('test-abc');
  });
});
