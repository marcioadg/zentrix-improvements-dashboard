import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), error: vi.fn() } }));

const mockPathname = vi.fn();
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname() }),
}));

import { RouteHistoryTracker, getPreviousRoute, getSafeFallbackRoute } from './RouteHistoryTracker';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe('RouteHistoryTracker', () => {
  it('renders nothing (returns null)', () => {
    mockPathname.mockReturnValue('/dashboard');
    const { container } = render(<RouteHistoryTracker />);
    expect(container.innerHTML).toBe('');
  });

  it('tracks route to sessionStorage', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<RouteHistoryTracker />);
    const history = JSON.parse(sessionStorage.getItem('route_history') || '[]');
    expect(history).toContain('/dashboard');
  });

  it('skips login routes', () => {
    mockPathname.mockReturnValue('/login');
    render(<RouteHistoryTracker />);
    const history = JSON.parse(sessionStorage.getItem('route_history') || '[]');
    expect(history).not.toContain('/login');
  });

  it('does not add duplicate consecutive paths', () => {
    sessionStorage.setItem('route_history', JSON.stringify(['/dashboard']));
    mockPathname.mockReturnValue('/dashboard');
    render(<RouteHistoryTracker />);
    const history = JSON.parse(sessionStorage.getItem('route_history') || '[]');
    expect(history).toEqual(['/dashboard']);
  });
});

describe('getPreviousRoute', () => {
  it('returns null when no history', () => {
    expect(getPreviousRoute()).toBeNull();
  });

  it('returns previous non-meeting route', () => {
    sessionStorage.setItem('route_history', JSON.stringify(['/dashboard', '/goals', '/meeting/123']));
    expect(getPreviousRoute()).toBe('/goals');
  });

  it('skips meeting routes', () => {
    sessionStorage.setItem('route_history', JSON.stringify(['/tasks', '/meeting/1', '/meeting/2']));
    expect(getPreviousRoute()).toBe('/tasks');
  });
});

describe('getSafeFallbackRoute', () => {
  it('returns /meetings when teamId provided', () => {
    expect(getSafeFallbackRoute('team-1')).toBe('/meetings');
  });

  it('returns /dashboard when no teamId', () => {
    expect(getSafeFallbackRoute()).toBe('/dashboard');
  });
});
