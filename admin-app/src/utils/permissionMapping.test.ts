vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { mapDBRoleToUIPermission, getPermissionDisplayName, hasManagerAccess, hasDirectorAccess } from './permissionMapping';

describe('mapDBRoleToUIPermission', () => {
  it('maps standard roles correctly', () => {
    expect(mapDBRoleToUIPermission('view-only')).toBe('view-only');
    expect(mapDBRoleToUIPermission('member')).toBe('member');
    expect(mapDBRoleToUIPermission('manager')).toBe('manager');
    expect(mapDBRoleToUIPermission('director')).toBe('director');
    expect(mapDBRoleToUIPermission('super_admin')).toBe('super_admin');
    expect(mapDBRoleToUIPermission('inactive')).toBe('inactive');
  });

  it('maps legacy admin to director', () => {
    expect(mapDBRoleToUIPermission('admin')).toBe('director');
  });

  it('maps legacy owner to director', () => {
    expect(mapDBRoleToUIPermission('owner')).toBe('director');
  });

  it('maps legacy viewer to view-only', () => {
    expect(mapDBRoleToUIPermission('viewer')).toBe('view-only');
  });

  it('maps legacy user to member', () => {
    expect(mapDBRoleToUIPermission('user')).toBe('member');
  });

  it('maps unknown role to member', () => {
    expect(mapDBRoleToUIPermission('unknown_role')).toBe('member');
  });
});

describe('getPermissionDisplayName', () => {
  it('returns correct display names', () => {
    expect(getPermissionDisplayName('view-only')).toBe('View-Only');
    expect(getPermissionDisplayName('member')).toBe('Member');
    expect(getPermissionDisplayName('manager')).toBe('Manager');
    expect(getPermissionDisplayName('director')).toBe('Director');
    expect(getPermissionDisplayName('super_admin')).toBe('Super Admin');
    expect(getPermissionDisplayName('inactive')).toBe('Inactive');
  });
});

describe('hasManagerAccess', () => {
  it('returns true for manager-level and above', () => {
    expect(hasManagerAccess('manager')).toBe(true);
    expect(hasManagerAccess('director')).toBe(true);
    expect(hasManagerAccess('super_admin')).toBe(true);
  });

  it('returns false for below manager level', () => {
    expect(hasManagerAccess('member')).toBe(false);
    expect(hasManagerAccess('view-only')).toBe(false);
    expect(hasManagerAccess('inactive')).toBe(false);
  });
});

describe('hasDirectorAccess', () => {
  it('returns true for director-level and above', () => {
    expect(hasDirectorAccess('director')).toBe(true);
    expect(hasDirectorAccess('super_admin')).toBe(true);
  });

  it('returns false for below director level', () => {
    expect(hasDirectorAccess('manager')).toBe(false);
    expect(hasDirectorAccess('member')).toBe(false);
    expect(hasDirectorAccess('view-only')).toBe(false);
    expect(hasDirectorAccess('inactive')).toBe(false);
  });
});
