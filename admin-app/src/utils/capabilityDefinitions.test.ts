import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_CATEGORIES,
  CAPABILITY_DEFINITIONS,
  PERMISSION_LEVEL_CAPABILITIES,
  type CapabilityDefinition,
} from './capabilityDefinitions';

describe('CAPABILITY_CATEGORIES', () => {
  it('contains expected categories', () => {
    expect(CAPABILITY_CATEGORIES).toContain('Metrics & Data');
    expect(CAPABILITY_CATEGORIES).toContain('Team Management');
    expect(CAPABILITY_CATEGORIES).toContain('Meetings & Communication');
    expect(CAPABILITY_CATEGORIES).toContain('Planning & Strategy');
    expect(CAPABILITY_CATEGORIES).toContain('Administration');
    expect(CAPABILITY_CATEGORIES).toContain('System Access');
  });

  it('has exactly 6 categories', () => {
    expect(CAPABILITY_CATEGORIES).toHaveLength(6);
  });
});

describe('CAPABILITY_DEFINITIONS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CAPABILITY_DEFINITIONS)).toBe(true);
    expect(CAPABILITY_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const cap of CAPABILITY_DEFINITIONS) {
      expect(cap).toHaveProperty('key');
      expect(cap).toHaveProperty('label');
      expect(cap).toHaveProperty('description');
      expect(cap).toHaveProperty('category');
      expect(typeof cap.key).toBe('string');
      expect(typeof cap.label).toBe('string');
      expect(typeof cap.description).toBe('string');
      expect(typeof cap.category).toBe('string');
    }
  });

  it('all capability keys are unique', () => {
    const keys = CAPABILITY_DEFINITIONS.map(c => c.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('every capability category is one of the known categories', () => {
    for (const cap of CAPABILITY_DEFINITIONS) {
      expect(CAPABILITY_CATEGORIES).toContain(cap.category);
    }
  });

  it('contains expected capabilities', () => {
    const keys = CAPABILITY_DEFINITIONS.map(c => c.key);
    expect(keys).toContain('view_metrics');
    expect(keys).toContain('edit_metrics');
    expect(keys).toContain('manage_metrics');
    expect(keys).toContain('full_company_access');
    expect(keys).toContain('access_admin_panel');
  });
});

describe('PERMISSION_LEVEL_CAPABILITIES', () => {
  const levels = ['inactive', 'view-only', 'member', 'manager', 'director', 'super_admin'] as const;

  it('defines all permission levels', () => {
    for (const level of levels) {
      expect(PERMISSION_LEVEL_CAPABILITIES).toHaveProperty(level);
    }
  });

  it('inactive has no capabilities', () => {
    expect(PERMISSION_LEVEL_CAPABILITIES['inactive']).toHaveLength(0);
  });

  it('view-only has fewer capabilities than member', () => {
    expect(PERMISSION_LEVEL_CAPABILITIES['view-only'].length).toBeLessThan(
      PERMISSION_LEVEL_CAPABILITIES['member'].length
    );
  });

  it('super_admin has all system access capabilities', () => {
    const superAdminCaps = PERMISSION_LEVEL_CAPABILITIES['super_admin'];
    expect(superAdminCaps).toContain('system_wide_access');
    expect(superAdminCaps).toContain('override_security');
    expect(superAdminCaps).toContain('access_admin_panel');
    expect(superAdminCaps).toContain('manage_multiple_companies');
  });

  it('director has fewer capabilities than super_admin', () => {
    expect(PERMISSION_LEVEL_CAPABILITIES['director'].length).toBeLessThan(
      PERMISSION_LEVEL_CAPABILITIES['super_admin'].length
    );
  });

  it('manager has company data access but member does not', () => {
    expect(PERMISSION_LEVEL_CAPABILITIES['manager']).toContain('view_company_data');
    expect(PERMISSION_LEVEL_CAPABILITIES['member']).not.toContain('view_company_data');
  });

  it('every referenced capability key exists in CAPABILITY_DEFINITIONS', () => {
    const definedKeys = new Set(CAPABILITY_DEFINITIONS.map(c => c.key));
    for (const level of levels) {
      for (const cap of PERMISSION_LEVEL_CAPABILITIES[level]) {
        expect(definedKeys.has(cap)).toBe(true);
      }
    }
  });

  it('all capability arrays contain strings', () => {
    for (const level of levels) {
      for (const cap of PERMISSION_LEVEL_CAPABILITIES[level]) {
        expect(typeof cap).toBe('string');
      }
    }
  });

  it('capabilities are cumulative up the hierarchy', () => {
    const memberCaps = new Set(PERMISSION_LEVEL_CAPABILITIES['member']);
    const managerCaps = new Set(PERMISSION_LEVEL_CAPABILITIES['manager']);
    // Every member capability should be present in manager
    for (const cap of memberCaps) {
      expect(managerCaps.has(cap)).toBe(true);
    }
  });
});
