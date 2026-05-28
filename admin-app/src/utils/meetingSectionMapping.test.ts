import { describe, it, expect } from 'vitest';
import { SECTION_TYPE_MAP, SECTION_LIBRARY, ensureWrapUpSection } from './meetingSectionMapping';

describe('SECTION_TYPE_MAP', () => {
  it('maps display names to snake_case types', () => {
    expect(SECTION_TYPE_MAP['Good News']).toBe('good_news');
    expect(SECTION_TYPE_MAP['Wrap Up']).toBe('wrap_up');
    expect(SECTION_TYPE_MAP['Check-In']).toBe('check_in');
  });
});

describe('SECTION_LIBRARY', () => {
  it('contains expected sections', () => {
    const ids = SECTION_LIBRARY.map(s => s.id);
    expect(ids).toContain('good_news');
    expect(ids).toContain('issues');
    expect(ids).toContain('custom_section');
  });

  it('all entries have required fields', () => {
    for (const section of SECTION_LIBRARY) {
      expect(section.id).toBeTruthy();
      expect(section.title).toBeTruthy();
      expect(section.defaultDuration).toBeGreaterThan(0);
      expect(section.type).toBeTruthy();
    }
  });
});

describe('ensureWrapUpSection', () => {
  it('adds wrap_up at end when missing', () => {
    const sections = [{ type: 'metrics', title: 'Metrics' }];
    const result = ensureWrapUpSection(sections);
    expect(result).toHaveLength(2);
    expect(result[result.length - 1].type).toBe('wrap_up');
    expect(result[result.length - 1].required).toBe(true);
  });

  it('moves existing wrap_up to end and marks required', () => {
    const sections = [
      { type: 'wrap_up', title: 'Wrap Up', required: false },
      { type: 'metrics', title: 'Metrics' },
    ];
    const result = ensureWrapUpSection(sections);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('metrics');
    expect(result[1].type).toBe('wrap_up');
    expect(result[1].required).toBe(true);
  });

  it('preserves other sections in order', () => {
    const sections = [
      { type: 'metrics', title: 'Metrics' },
      { type: 'goals', title: 'Goals' },
      { type: 'wrap_up', title: 'Wrap Up' },
      { type: 'issues', title: 'Issues' },
    ];
    const result = ensureWrapUpSection(sections);
    expect(result.map(s => s.type)).toEqual(['metrics', 'goals', 'issues', 'wrap_up']);
  });
});
