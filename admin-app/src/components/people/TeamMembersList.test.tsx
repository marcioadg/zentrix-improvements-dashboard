import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ profile: { role: 'member' }, loading: false }),
}));
vi.mock('@/hooks/useCooldownTracker', () => ({
  useCooldownTracker: () => ({ isInCooldown: false, remainingMinutes: 0 }),
}));
vi.mock('@/components/shared/RoleSelector', () => ({
  RoleSelector: () => <div data-testid="role-selector" />,
}));
vi.mock('@/utils/userDisplayUtils', () => ({
  getUserDisplayName: (u: any) => u?.full_name || 'Unknown',
  getUserDisplayInfo: (u: any) => ({
    displayName: u?.full_name || 'Unknown',
    hasRealName: !!u?.full_name,
    subtitle: u?.email,
  }),
}));

import { TeamMembersList } from './TeamMembersList';

const mockHandlers = {
  onUserClick: vi.fn(),
  onRoleChange: vi.fn(),
  onEditName: vi.fn(),
  onDeactivateUser: vi.fn(),
  onDeleteUser: vi.fn(),
};

describe('TeamMembersList', () => {
  it('shows empty state when no users', () => {
    render(<TeamMembersList users={[]} currentUserId="u1" roleUpdating={null} {...mockHandlers} />);
    expect(screen.getByText('No team members found')).toBeInTheDocument();
  });

  it('renders user count in header', () => {
    const users = [
      { user_id: 'u1', full_name: 'Alice', email: 'alice@test.com', access_type: 'direct', role: 'member' },
      { user_id: 'u2', full_name: 'Bob', email: 'bob@test.com', access_type: 'direct', role: 'member' },
    ] as any;
    render(<TeamMembersList users={users} currentUserId="u1" roleUpdating={null} {...mockHandlers} />);
    expect(screen.getByText('Team Members (2)')).toBeInTheDocument();
  });

  it('renders UserRow for each user', () => {
    const users = [
      { user_id: 'u1', full_name: 'Alice', email: 'alice@test.com', access_type: 'direct', role: 'member' },
    ] as any;
    render(<TeamMembersList users={users} currentUserId="u2" roleUpdating={null} {...mockHandlers} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
