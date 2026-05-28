import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseAuth = vi.fn();
const mockUseUserCapabilities = vi.fn();
const mockIsSuperAdminAssistant = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useUserCapabilities', () => ({ useUserCapabilities: () => mockUseUserCapabilities() }));
vi.mock('@/hooks/useUserRoles', () => ({
  useCurrentUserRoles: () => ({ isSuperAdminAssistant: mockIsSuperAdminAssistant }),
}));
vi.mock('@/utils/capabilityDefinitions', () => ({ PERMISSION_LEVEL_CAPABILITIES: {} }));
vi.mock('@/utils/logger', () => ({ logger: { debug: vi.fn(), log: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => <div data-testid="loading-spinner" />,
}));
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

import { SuperAdminRoute } from './SuperAdminRoute';

beforeEach(() => {
  vi.clearAllMocks();
  mockIsSuperAdminAssistant.mockReturnValue(false);
});

describe('SuperAdminRoute', () => {
  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseUserCapabilities.mockReturnValue({ hasCapability: vi.fn(), permissionLevel: '' });
    render(<SuperAdminRoute><div>Admin</div></SuperAdminRoute>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('redirects non-admin users to dashboard', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'a@b.com' }, loading: false });
    mockUseUserCapabilities.mockReturnValue({ hasCapability: vi.fn(), permissionLevel: 'member' });
    render(<SuperAdminRoute><div>Admin</div></SuperAdminRoute>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/dashboard');
  });

  it('renders children for super_admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'a@b.com' }, loading: false });
    mockUseUserCapabilities.mockReturnValue({ hasCapability: vi.fn(), permissionLevel: 'super_admin' });
    render(<SuperAdminRoute><div>Admin Panel</div></SuperAdminRoute>);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders children for super_admin_assistant', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'a@b.com' }, loading: false });
    mockUseUserCapabilities.mockReturnValue({ hasCapability: vi.fn(), permissionLevel: 'member' });
    mockIsSuperAdminAssistant.mockReturnValue(true);
    render(<SuperAdminRoute><div>Admin Panel</div></SuperAdminRoute>);
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('redirects when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseUserCapabilities.mockReturnValue({ hasCapability: vi.fn(), permissionLevel: '' });
    render(<SuperAdminRoute><div>Admin</div></SuperAdminRoute>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/dashboard');
  });
});
