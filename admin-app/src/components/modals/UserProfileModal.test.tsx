import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserProfileModal } from './UserProfileModal';

// Mock logger and sonner
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-user-1' } }),
}));

vi.mock('@/hooks/useUserManagement', () => ({
  useUserManagement: () => ({
    users: [],
    hasManagerAccess: false,
  }),
}));

vi.mock('@/hooks/useMultiCompanyAccess', () => ({
  useMultiCompanyAccess: () => ({
    currentCompany: { id: 'company-1', name: 'Test Company' },
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserProfileModal', () => ({
  useUserProfileModal: () => ({
    selectedRole: 'member',
    setSelectedRole: vi.fn(),
    selectedTeamIds: [],
    loading: false,
    canEdit: false,
    canEditRole: false,
    canEditTeams: false,
    availableTeams: [],
    displayUserTeams: [],
    handleCancel: vi.fn(),
    handleSave: vi.fn(),
    handleTeamToggle: vi.fn(),
    currentCompany: { id: 'company-1', name: 'Test Company' },
  }),
}));

// Mock utility functions
vi.mock('@/utils/roleHierarchy', () => ({
  canManageUserPassword: vi.fn(() => false),
}));

vi.mock('@/utils/permissionMapping', () => ({
  mapDBRoleToUIPermission: vi.fn((role: string) => role),
}));

// Mock sub-components
vi.mock('./BaseModal', () => ({
  BaseModal: ({ children, open, title, description, headerContent }: any) => (
    open ? (
      <div data-testid="base-modal">
        <div data-testid="modal-title">{title}</div>
        {description && <div data-testid="modal-description">{description}</div>}
        {headerContent}
        {children}
      </div>
    ) : null
  ),
}));

vi.mock('./user-profile/UserProfileHeader', () => ({
  UserProfileHeader: (props: any) => <div data-testid="user-profile-header" />,
}));

vi.mock('./user-profile/TeamMembershipSection', () => ({
  TeamMembershipSection: (props: any) => <div data-testid="team-membership-section" />,
}));

vi.mock('./user-profile/PasswordUpdateSection', () => ({
  PasswordUpdateSection: (props: any) => <div data-testid="password-update-section" />,
}));

vi.mock('./user-profile/AdminCompanyMembershipSection', () => ({
  AdminCompanyMembershipSection: (props: any) => <div data-testid="admin-company-membership-section" />,
}));

vi.mock('@/components/modals/AvatarEditModal', () => ({
  AvatarEditModal: (props: any) => <div data-testid="avatar-edit-modal" />,
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: (props: any) => <div data-testid="user-avatar" />,
}));

const mockUser = {
  user_id: 'user-1',
  full_name: 'Jane Smith',
  email: 'jane@test.com',
  role: 'member',
  permission_level: 'member',
  created_at: '2026-01-15T00:00:00Z',
  avatar_url: null,
  image_url: null,
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  user: mockUser as any,
  onUserUpdated: vi.fn(),
};

describe('UserProfileModal', () => {
  it('returns null when user is null', () => {
    const { container } = render(
      <UserProfileModal {...defaultProps} user={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when open=false', () => {
    render(<UserProfileModal {...defaultProps} open={false} />);
    expect(screen.queryByTestId('base-modal')).not.toBeInTheDocument();
  });

  it('renders modal with user info when open=true', () => {
    render(<UserProfileModal {...defaultProps} />);
    expect(screen.getByTestId('base-modal')).toBeInTheDocument();
    expect(screen.getByTestId('user-profile-header')).toBeInTheDocument();
  });

  it('shows user name in title', () => {
    render(<UserProfileModal {...defaultProps} />);
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Jane Smith');
  });
});
