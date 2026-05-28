import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseCompanyApiKeys = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'test-key',
  supabase: {},
  insightsClient: {},
  authClient: {},
  dataClient: {},
}));
vi.mock('@/hooks/useCompanyApiKeys', () => ({
  useCompanyApiKeys: () => mockUseCompanyApiKeys(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('date-fns', () => ({ formatDistanceToNow: () => '2 days' }));

import { ApiKeysSettings } from './ApiKeysSettings';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ApiKeysSettings', () => {
  it('renders header and create button', () => {
    mockUseCompanyApiKeys.mockReturnValue({
      apiKeys: [], loading: false, creating: false,
      createApiKey: vi.fn(), revokeApiKey: vi.fn(), deleteApiKey: vi.fn(),
    });
    render(<ApiKeysSettings />);
    expect(screen.getByText('API Keys')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create key/i })).toBeInTheDocument();
  });

  it('shows empty state when no keys exist', () => {
    mockUseCompanyApiKeys.mockReturnValue({
      apiKeys: [], loading: false, creating: false,
      createApiKey: vi.fn(), revokeApiKey: vi.fn(), deleteApiKey: vi.fn(),
    });
    render(<ApiKeysSettings />);
    expect(screen.getByText('No API keys created yet')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    mockUseCompanyApiKeys.mockReturnValue({
      apiKeys: [], loading: true, creating: false,
      createApiKey: vi.fn(), revokeApiKey: vi.fn(), deleteApiKey: vi.fn(),
    });
    render(<ApiKeysSettings />);
    // Loading spinner element
    expect(screen.queryByText('No API keys created yet')).not.toBeInTheDocument();
  });

  it('renders api key list with status badges', () => {
    mockUseCompanyApiKeys.mockReturnValue({
      apiKeys: [
        { id: 'k1', name: 'Test Key', key_prefix: 'sk_test_', created_at: '2025-01-01', last_used_at: null, revoked_at: null, expires_at: null },
        { id: 'k2', name: 'Revoked Key', key_prefix: 'sk_rev_', created_at: '2025-01-01', last_used_at: null, revoked_at: '2025-02-01', expires_at: null },
      ],
      loading: false, creating: false,
      createApiKey: vi.fn(), revokeApiKey: vi.fn(), deleteApiKey: vi.fn(),
    });
    render(<ApiKeysSettings />);
    expect(screen.getByText('Test Key')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Revoked')).toBeInTheDocument();
    expect(screen.getByText('1 active key')).toBeInTheDocument();
  });

  it('renders available endpoints section', () => {
    mockUseCompanyApiKeys.mockReturnValue({
      apiKeys: [], loading: false, creating: false,
      createApiKey: vi.fn(), revokeApiKey: vi.fn(), deleteApiKey: vi.fn(),
    });
    render(<ApiKeysSettings />);
    expect(screen.getByText('Available Endpoints')).toBeInTheDocument();
    expect(screen.getByText('GET /company-api/company')).toBeInTheDocument();
  });
});
