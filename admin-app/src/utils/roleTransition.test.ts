import { describe, it, expect } from 'vitest';
import {
  getLegacyRoleForDisplay,
  hasAdminAccess,
  hasManagerOrAboveAccess,
  getPermissionDisplayName,
  getProfileWithRole,
} from './roleTransition';

describe('getLegacyRoleForDisplay', () => {
  it('maps known permission levels', () => {
    expect(getLegacyRoleForDisplay('super_admin')).toBe('super_admin');
    expect(getLegacyRoleForDisplay('director')).toBe('owner');
    expect(getLegacyRoleForDisplay('manager')).toBe('manager');
    expect(getLegacyRoleForDisplay('member')).toBe('member');
    expect(getLegacyRoleForDisplay('view-only')).toBe('view-only');
    expect(getLegacyRoleForDisplay('inactive')).toBe('inactive');
  });

  it('defaults to member for undefined or unknown', () => {
    expect(getLegacyRoleForDisplay(undefined)).toBe('member');
    expect(getLegacyRoleForDisplay('unknown')).toBe('member');
  });
});

describe('hasAdminAccess', () => {
  it('returns true for super_admin and director', () => {
    expect(hasAdminAccess('super_admin')).toBe(true);
    expect(hasAdminAccess('director')).toBe(true);
  });

  it('returns false for non-admin levels', () => {
    expect(hasAdminAccess('manager')).toBe(false);
    expect(hasAdminAccess('member')).toBe(false);
    expect(hasAdminAccess(undefined)).toBe(false);
  });
});

describe('hasManagerOrAboveAccess', () => {
  it('returns true for super_admin, director, manager', () => {
    expect(hasManagerOrAboveAccess('super_admin')).toBe(true);
    expect(hasManagerOrAboveAccess('director')).toBe(true);
    expect(hasManagerOrAboveAccess('manager')).toBe(true);
  });

  it('returns false for member and below', () => {
    expect(hasManagerOrAboveAccess('member')).toBe(false);
    expect(hasManagerOrAboveAccess('view-only')).toBe(false);
    expect(hasManagerOrAboveAccess(undefined)).toBe(false);
  });
});

describe('getPermissionDisplayName', () => {
  it('returns human-readable names', () => {
    expect(getPermissionDisplayName('super_admin')).toBe('Super Admin');
    expect(getPermissionDisplayName('director')).toBe('Director');
    expect(getPermissionDisplayName('view-only')).toBe('View-Only');
  });

  it('defaults to Member for unknown', () => {
    expect(getPermissionDisplayName(undefined)).toBe('Member');
    expect(getPermissionDisplayName('foo')).toBe('Member');
  });
});

describe('getProfileWithRole', () => {
  const baseProfile = {
    id: '1',
    email: 'test@test.com',
    full_name: 'Test User',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  it('returns null when profile is null', () => {
    expect(getProfileWithRole(null, 'director')).toBeNull();
  });

  it('attaches legacy role from permission level', () => {
    const result = getProfileWithRole(baseProfile, 'director');
    expect(result?.role).toBe('owner');
  });

  it('preserves other profile fields', () => {
    const result = getProfileWithRole(baseProfile, 'member');
    expect(result?.email).toBe('test@test.com');
    expect(result?.full_name).toBe('Test User');
  });
});
