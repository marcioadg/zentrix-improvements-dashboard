import { describe, it, expect, vi } from "vitest";

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { canManageUserPassword, hasManagerAccess, getRoleLevel, isRoleHigher } from './roleHierarchy';

describe('canManageUserPassword', () => {
  it('allows same user to manage own password', () => {
    expect(canManageUserPassword('member', 'member', 'user-1', 'user-1')).toBe(true);
  });

  it('allows super_admin to manage any target', () => {
    expect(canManageUserPassword('super_admin', 'director', 'admin-1', 'user-2')).toBe(true);
    expect(canManageUserPassword('super_admin', 'super_admin', 'admin-1', 'admin-2')).toBe(true);
  });

  it('allows manager to manage member password', () => {
    expect(canManageUserPassword('manager', 'member', 'mgr-1', 'user-1')).toBe(true);
  });

  it('denies member managing manager password', () => {
    expect(canManageUserPassword('member', 'manager', 'user-1', 'mgr-1')).toBe(false);
  });

  it('denies view-only managing any password', () => {
    expect(canManageUserPassword('view-only', 'member', 'vo-1', 'user-1')).toBe(false);
  });

  it('denies manager managing same-level user password', () => {
    expect(canManageUserPassword('manager', 'manager', 'mgr-1', 'mgr-2')).toBe(false);
  });
});

describe('hasManagerAccess', () => {
  it('returns true for manager', () => {
    expect(hasManagerAccess('manager')).toBe(true);
  });

  it('returns true for director', () => {
    expect(hasManagerAccess('director')).toBe(true);
  });

  it('returns true for super_admin', () => {
    expect(hasManagerAccess('super_admin')).toBe(true);
  });

  it('returns false for member', () => {
    expect(hasManagerAccess('member')).toBe(false);
  });

  it('returns false for view-only', () => {
    expect(hasManagerAccess('view-only')).toBe(false);
  });

  it('returns false for inactive', () => {
    expect(hasManagerAccess('inactive')).toBe(false);
  });
});

describe('getRoleLevel', () => {
  it('returns correct level for each role', () => {
    expect(getRoleLevel('inactive')).toBe(-1);
    expect(getRoleLevel('view-only')).toBe(0);
    expect(getRoleLevel('member')).toBe(1);
    expect(getRoleLevel('manager')).toBe(2);
    expect(getRoleLevel('director')).toBe(3);
    expect(getRoleLevel('super_admin')).toBe(4);
  });
});

describe('isRoleHigher', () => {
  it('returns true when first role is higher', () => {
    expect(isRoleHigher('director', 'manager')).toBe(true);
  });

  it('returns false when first role is lower', () => {
    expect(isRoleHigher('member', 'director')).toBe(false);
  });

  it('returns false for same role', () => {
    expect(isRoleHigher('manager', 'manager')).toBe(false);
  });
});
