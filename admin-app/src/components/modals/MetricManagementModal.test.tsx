import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MinimalAddMetricsModal } from './MetricManagementModal';

// Mock logger and sonner
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock hooks
const mockUseCompanyMetrics = vi.fn().mockReturnValue({
  teams: [],
  metrics: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
});
vi.mock('@/hooks/useCompanyMetrics', () => ({
  useCompanyMetrics: (...args: any[]) => mockUseCompanyMetrics(...args),
}));

vi.mock('@/contexts/MultiCompanyContext', () => ({
  useMultiCompany: () => ({
    currentCompany: { id: 'company-1', name: 'Test Company' },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: { week_start_day: 'monday' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock service functions
vi.mock('@/services/metricOperations', () => ({
  deleteMetric: vi.fn(),
  bulkDeleteMetrics: vi.fn(),
  createMetric: vi.fn(),
  bulkAssignMetricsToTeams: vi.fn().mockResolvedValue({ assigned: 0, skipped: 0, errors: [] }),
  bulkCopyMetricsToTeams: vi.fn().mockResolvedValue({ copied: 0, skipped: [], errors: [] }),
}));

vi.mock('@/components/shared/TeamMultiSelect', () => ({
  TeamMultiSelect: (props: any) => <div data-testid="team-multi-select" />,
}));

vi.mock('@/services/metricDependencyService', () => ({
  findBulkDependentFormulas: vi.fn().mockResolvedValue({ dependentMetrics: [] }),
}));

// Mock sub-components
vi.mock('@/components/modals/AddMetricModal', () => ({
  AddMetricModal: (props: any) => <div data-testid="add-metric-modal" />,
}));

vi.mock('./MetricDeleteConfirmationDialog', () => ({
  MetricDeleteConfirmationDialog: (props: any) => <div data-testid="metric-delete-dialog" />,
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
};

describe('MinimalAddMetricsModal', () => {
  it('renders nothing visible when open=false', () => {
    render(<MinimalAddMetricsModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Configure Metrics')).not.toBeInTheDocument();
  });

  it('renders modal when open=true', () => {
    render(<MinimalAddMetricsModal {...defaultProps} />);
    expect(screen.getByText('Configure Metrics')).toBeInTheDocument();
  });

  it('shows search input', () => {
    render(<MinimalAddMetricsModal {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('Search metrics, owners, or teams...')
    ).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    mockUseCompanyMetrics.mockReturnValue({
      teams: [],
      metrics: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<MinimalAddMetricsModal {...defaultProps} />);
    expect(screen.getByText(/Loading company metrics/)).toBeInTheDocument();

    // Reset to default
    mockUseCompanyMetrics.mockReturnValue({
      teams: [],
      metrics: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });
});
