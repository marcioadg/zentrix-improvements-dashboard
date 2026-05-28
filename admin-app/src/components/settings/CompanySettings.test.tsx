import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { mockNavigate, mockToast, mockRefreshCompanies, mockDeleteCompany } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockRefreshCompanies: vi.fn(),
  mockDeleteCompany: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock('@/contexts/MultiCompanyContext', () => ({
  useMultiCompany: () => ({
    currentCompany: {
      id: 'c1',
      name: 'Test Company',
      zentrix_support_access: false,
      auto_create_overdue_issues: false,
      require_task_before_solve: true,
      ai_meeting_transcription: false,
    },
    refreshCompanies: mockRefreshCompanies,
  }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/hooks/useCompanyManagement', () => ({
  useCompanyManagement: () => ({ deleteCompany: mockDeleteCompany }),
}));

// Build a proper chainable mock for Supabase
const makeMaybeSingle = (data: any) => vi.fn().mockResolvedValue({ data, error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'company_members') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: makeMaybeSingle({ permission_level: 'director' }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: makeMaybeSingle({ role: 'member' }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({ data: [], error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn() } }));
vi.mock('@/components/modals/CompanyDeletionModal', () => ({
  CompanyDeletionModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-modal">Delete Modal</div> : null,
}));

import { CompanySettings } from './CompanySettings';

beforeEach(() => vi.clearAllMocks());

describe('CompanySettings', () => {
  it('renders company settings with company name', () => {
    render(<CompanySettings />);
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument();
  });

  it('renders toggle switches for company features', () => {
    render(<CompanySettings />);
    expect(screen.getByText('Support Access')).toBeInTheDocument();
    expect(screen.getByText('Auto-create Issues')).toBeInTheDocument();
    expect(screen.getByText('Task Confirmation')).toBeInTheDocument();
  });

  it('enables update button when company name changes and user has permissions', async () => {
    render(<CompanySettings />);

    // Wait for permission check to complete
    await waitFor(() => {
      const input = screen.getByDisplayValue('Test Company');
      expect(input).not.toBeDisabled();
    });

    const input = screen.getByDisplayValue('Test Company');
    fireEvent.change(input, { target: { value: 'New Name' } });

    const updateBtn = screen.getByRole('button', { name: /update/i });
    expect(updateBtn).not.toBeDisabled();
  });

  it('shows danger zone for users with edit permission', async () => {
    render(<CompanySettings />);
    await waitFor(() => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    });
  });
});
