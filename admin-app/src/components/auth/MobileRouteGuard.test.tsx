import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockIsMobileOrTabletDevice = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('@/utils/mobileDetection', () => ({ isMobileOrTabletDevice: () => mockIsMobileOrTabletDevice() }));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  useLocation: () => mockUseLocation(),
}));

import { MobileRouteGuard } from './MobileRouteGuard';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MobileRouteGuard', () => {
  it('renders children on desktop (non-mobile device)', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(false);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
    render(<MobileRouteGuard><div>Desktop Content</div></MobileRouteGuard>);
    expect(screen.getByText('Desktop Content')).toBeInTheDocument();
  });

  it('renders children for public routes on mobile', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/login' });
    render(<MobileRouteGuard><div>Login Page</div></MobileRouteGuard>);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children for /m/ routes on mobile', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/m/tasks' });
    render(<MobileRouteGuard><div>Mobile Tasks</div></MobileRouteGuard>);
    expect(screen.getByText('Mobile Tasks')).toBeInTheDocument();
  });

  it('redirects /dashboard to /m/tasks on mobile', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/dashboard' });
    render(<MobileRouteGuard><div>Content</div></MobileRouteGuard>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/m/tasks');
  });

  it('redirects /settings to /m/settings on mobile', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/settings' });
    render(<MobileRouteGuard><div>Content</div></MobileRouteGuard>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/m/settings');
  });

  it('blocks /checkout on mobile by redirecting to /m/tasks', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/checkout' });
    render(<MobileRouteGuard><div>Content</div></MobileRouteGuard>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/m/tasks');
  });

  it('redirects unmapped routes to /m/tasks on mobile', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/some-unknown-page' });
    render(<MobileRouteGuard><div>Content</div></MobileRouteGuard>);
    expect(screen.getByTestId('navigate').dataset.to).toBe('/m/tasks');
  });

  it('allows blog routes on mobile as public', () => {
    mockIsMobileOrTabletDevice.mockReturnValue(true);
    mockUseLocation.mockReturnValue({ pathname: '/blog/my-post' });
    render(<MobileRouteGuard><div>Blog Post</div></MobileRouteGuard>);
    expect(screen.getByText('Blog Post')).toBeInTheDocument();
  });
});
