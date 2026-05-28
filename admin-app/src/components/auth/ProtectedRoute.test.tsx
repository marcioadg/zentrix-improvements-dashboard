import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock dependencies before imports
const mockUseAuth = vi.fn();
const mockUseMultiCompany = vi.fn();
const mockUseSubscription = vi.fn();
const mockUseProfile = vi.fn();
const mockRefreshCompanies = vi.fn();
const mockIsMobileOrTabletDevice = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/MultiCompanyContext', () => ({ useMultiCompany: () => mockUseMultiCompany() }));
vi.mock('@/hooks/useSubscription', () => ({ useSubscription: () => mockUseSubscription() }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => mockUseProfile() }));
vi.mock('@/utils/mobileDetection', () => ({ isMobileOrTabletDevice: () => mockIsMobileOrTabletDevice() }));
vi.mock('@/utils/logger', () => ({ logger: { debug: vi.fn(), log: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/components/ui/loading-spinner', () => ({
  LoadingSpinner: ({ size }: { size: string }) => <div data-testid="loading-spinner" data-size={size} />,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
    <div data-testid="navigate" data-to={to} data-replace={String(replace)} />
  ),
  useNavigate: () => mockNavigate,
}));

import { ProtectedRoute } from './ProtectedRoute';

const defaultAuth = { user: { id: 'u1' }, session: { access_token: 'tok' }, loading: false };
const defaultCompany = { currentCompany: { id: 'c1' }, loading: false, refreshCompanies: mockRefreshCompanies };
const defaultSubscription = { subscription: { subscribed: true }, loading: false };
const defaultProfile = { profile: { role: 'member' }, loading: false };

beforeEach(() => {
  vi.clearAllMocks();
  mockIsMobileOrTabletDevice.mockReturnValue(false);
  mockUseAuth.mockReturnValue(defaultAuth);
  mockUseMultiCompany.mockReturnValue(defaultCompany);
  mockUseSubscription.mockReturnValue(defaultSubscription);
  mockUseProfile.mockReturnValue(defaultProfile);
  Object.defineProperty(window, 'location', {
    value: { pathname: '/dashboard', search: '', hash: '' },
    writable: true,
  });
});

describe('ProtectedRoute', () => {
  it('renders children when authenticated with company and subscription', () => {
    render(<ProtectedRoute><div>Protected Content</div></ProtectedRoute>);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({ ...defaultAuth, loading: true });
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('redirects to login when no user/session', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.dataset.to).toContain('/login');
  });

  it('preserves redirect path when redirecting to login', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });
    Object.defineProperty(window, 'location', {
      value: { pathname: '/goals', search: '?q=1', hash: '' },
      writable: true,
    });
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.dataset.to).toContain('redirect=');
    expect(nav.dataset.to).toContain('%2Fgoals');
  });

  it('redirects deactivated users to /account-deactivated', () => {
    mockUseProfile.mockReturnValue({ profile: { role: 'inactive' }, loading: false });
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.dataset.to).toBe('/account-deactivated');
  });

  it('triggers a defensive company refresh before redirecting when no company is loaded', () => {
    mockRefreshCompanies.mockResolvedValue(undefined);
    mockUseMultiCompany.mockReturnValue({ currentCompany: null, loading: false, refreshCompanies: mockRefreshCompanies });

    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);

    expect(mockRefreshCompanies).toHaveBeenCalled();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('allows settings path without subscription', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/settings', search: '', hash: '' },
      writable: true,
    });
    mockUseSubscription.mockReturnValue({ subscription: { subscribed: false }, loading: false });
    render(<ProtectedRoute><div>Settings</div></ProtectedRoute>);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('redirects to billing when not subscribed on web', () => {
    mockUseSubscription.mockReturnValue({ subscription: { subscribed: false }, loading: false });
    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);
    const nav = screen.getByTestId('navigate');
    expect(nav.dataset.to).toBe('/settings?tab=billing');
  });

  it('skips subscription check on mobile routes', () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/m/tasks', search: '', hash: '' },
      writable: true,
    });
    mockUseSubscription.mockReturnValue({ subscription: { subscribed: false }, loading: false });
    render(<ProtectedRoute><div>Mobile Content</div></ProtectedRoute>);
    expect(screen.getByText('Mobile Content')).toBeInTheDocument();
  });

  it('skips subscription check on mobile device', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseSubscription.mockReturnValue({ subscription: { subscribed: false }, loading: false });
    render(<ProtectedRoute><div>Mobile Device</div></ProtectedRoute>);
    expect(screen.getByText('Mobile Device')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login even when an access token hash is present', () => {
    mockUseAuth.mockReturnValue({ user: null, session: null, loading: false });
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', search: '', hash: '#access_token=abc' },
      writable: true,
    });

    render(<ProtectedRoute><div>Content</div></ProtectedRoute>);

    const nav = screen.getByTestId('navigate');
    expect(nav.dataset.to).toBe('/login');
  });
});
