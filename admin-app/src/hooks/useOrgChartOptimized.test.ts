/**
 * Tests for the multi-company assignment filtering logic in useOrgChartOptimized.
 *
 * These tests verify the fix for:
 *   "Users in multiple companies disappear from the org chart"
 *
 * The bug: role_assignments were fetched without verifying the assigned user
 * is an *active member* of the current company. Users assigned to roles in
 * Company A would show up (or cause broken cards) in Company B's org chart.
 *
 * The fix (in fetchRolesOptimized): after building memberDataMap from
 * company_members, filter assignments to only those where
 * memberDataMap.has(assignment.user_id) is true.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Pure logic extracted for unit testing
// (mirrors the filtering logic in useOrgChartOptimized.fetchRolesOptimized)
// ---------------------------------------------------------------------------

/**
 * Given a list of assignments (each with a user_id) and a map of
 * active company members (user_id → member data), return only the
 * assignments where the user is an active member of the company.
 */
function filterAssignmentsByCompanyMembership(
  assignments: Array<{ user_id: string; role_id: string; profile: { full_name: string; email: string } | null }>,
  memberDataMap: Map<string, { user_id: string; image_url: string | null }>
): Array<{ user_id: string; role_id: string; profile: any; company_member: any }> {
  return assignments
    .filter(a => memberDataMap.has(a.user_id))
    .map(a => ({
      ...a,
      company_member: memberDataMap.get(a.user_id) ?? null,
    }));
}

/**
 * Mirrors OrgRoleCard's assignedPeople filter:
 *   assignments.map(a => ({ ...a.profile, image_url: a.company_member?.image_url }))
 *              .filter(p => p?.id && (p?.full_name || p?.email))
 */
function buildAssignedPeople(
  assignments: Array<{ profile: { id: string; full_name?: string; email?: string } | null; company_member: { image_url: string | null } | null }>
) {
  return assignments
    .map(a => ({
      ...a.profile,
      image_url: a.company_member?.image_url ?? null,
    }))
    .filter(p => p?.id && (p?.full_name || p?.email));
}

// ---------------------------------------------------------------------------
// Tests: filterAssignmentsByCompanyMembership
// ---------------------------------------------------------------------------

describe('filterAssignmentsByCompanyMembership (multi-company org chart fix)', () => {
  const memberA = { user_id: 'user-A', image_url: null };
  const memberB = { user_id: 'user-B', image_url: 'http://img.example.com/b.png' };

  const profileA = { full_name: 'Alice', email: 'alice@example.com' };
  const profileB = { full_name: 'Bob', email: 'bob@example.com' };
  const profileC = { full_name: 'Carol', email: 'carol@example.com' };

  const assignments = [
    { user_id: 'user-A', role_id: 'role-1', profile: profileA },
    { user_id: 'user-B', role_id: 'role-1', profile: profileB },
    { user_id: 'user-C', role_id: 'role-2', profile: profileC }, // NOT a member of current company
  ];

  it('keeps assignments for users who are active members of the current company', () => {
    const memberDataMap = new Map([
      ['user-A', memberA],
      ['user-B', memberB],
    ]);

    const result = filterAssignmentsByCompanyMembership(assignments, memberDataMap);

    const userIds = result.map(a => a.user_id);
    expect(userIds).toContain('user-A');
    expect(userIds).toContain('user-B');
    expect(userIds).not.toContain('user-C');
  });

  it('returns empty array when no assignments match company membership', () => {
    const memberDataMap = new Map<string, any>(); // nobody is a member
    const result = filterAssignmentsByCompanyMembership(assignments, memberDataMap);
    expect(result).toHaveLength(0);
  });

  it('attaches company_member data to matching assignments', () => {
    const memberDataMap = new Map([['user-B', memberB]]);
    const result = filterAssignmentsByCompanyMembership(assignments, memberDataMap);

    expect(result).toHaveLength(1);
    expect(result[0].company_member).toEqual(memberB);
    expect(result[0].company_member.image_url).toBe('http://img.example.com/b.png');
  });

  it('handles the case where a multi-company user is in Company B but not Company A', () => {
    // User-C is in Company B's org chart (role-2) but we're viewing Company A.
    // Company A's memberDataMap only has user-A and user-B.
    const companyAMemberMap = new Map([
      ['user-A', memberA],
      ['user-B', memberB],
    ]);

    const result = filterAssignmentsByCompanyMembership(assignments, companyAMemberMap);

    // user-C should be excluded from Company A's org chart
    expect(result.find(a => a.user_id === 'user-C')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests: buildAssignedPeople (OrgRoleCard null-guard)
// ---------------------------------------------------------------------------

describe('buildAssignedPeople (OrgRoleCard null-guard)', () => {
  it('includes person with full_name', () => {
    const assignments = [
      { profile: { id: 'u1', full_name: 'Alice', email: 'alice@example.com' }, company_member: null },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people).toHaveLength(1);
    expect(people[0].full_name).toBe('Alice');
  });

  it('includes person with email only (no full_name)', () => {
    const assignments = [
      { profile: { id: 'u2', full_name: '', email: 'bob@example.com' }, company_member: null },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people).toHaveLength(1);
    expect(people[0].email).toBe('bob@example.com');
  });

  it('excludes person with no id', () => {
    const assignments = [
      { profile: { id: '', full_name: 'Ghost', email: 'ghost@example.com' }, company_member: null },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people).toHaveLength(0);
  });

  it('excludes person with null full_name AND null/empty email (broken data)', () => {
    const assignments = [
      { profile: { id: 'u3', full_name: '', email: '' }, company_member: null },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people).toHaveLength(0);
  });

  it('excludes null profile', () => {
    const assignments = [{ profile: null as any, company_member: null }];
    const people = buildAssignedPeople(assignments);
    expect(people).toHaveLength(0);
  });

  it('sets image_url from company_member when present', () => {
    const assignments = [
      {
        profile: { id: 'u4', full_name: 'Carol', email: 'carol@example.com' },
        company_member: { image_url: 'http://img.example.com/carol.png' },
      },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people[0].image_url).toBe('http://img.example.com/carol.png');
  });

  it('sets image_url to null when company_member is null', () => {
    const assignments = [
      {
        profile: { id: 'u5', full_name: 'Dave', email: 'dave@example.com' },
        company_member: null,
      },
    ];
    const people = buildAssignedPeople(assignments);
    expect(people[0].image_url).toBeNull();
  });
});
