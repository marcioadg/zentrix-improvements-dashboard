import { describe, it, expect } from 'vitest';
import { shouldRenderHorizontally } from './orgChartUtils';

describe('shouldRenderHorizontally', () => {
  it('returns true when children exist', () => {
    expect(shouldRenderHorizontally([{ id: 1 }])).toBe(true);
    expect(shouldRenderHorizontally([{ id: 1 }, { id: 2 }])).toBe(true);
  });

  it('returns false for empty children array', () => {
    expect(shouldRenderHorizontally([])).toBe(false);
  });
});
