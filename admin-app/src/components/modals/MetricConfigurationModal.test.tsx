import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MetricConfigurationModal } from './MetricConfigurationModal';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

// Mock logger and sonner
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock hooks
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({
    members: [
      { user_id: 'user-1', profiles: { full_name: 'John Doe', email: 'john@test.com' } },
    ],
    loading: false,
  }),
}));

vi.mock('@/hooks/useUserTeams', () => ({
  useUserTeams: () => ({
    teams: [{ id: 'team-1', name: 'Engineering' }],
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock sub-components
vi.mock('./FormulaBuilder', () => ({
  FormulaBuilder: (props: any) => <div data-testid="formula-builder" />,
}));

vi.mock('./MetricDeleteConfirmationDialog', () => ({
  MetricDeleteConfirmationDialog: (props: any) => <div data-testid="metric-delete-dialog" />,
}));

vi.mock('@/components/shared/TeamMultiSelect', () => ({
  TeamMultiSelect: (props: any) => <div data-testid="team-multi-select" />,
}));

// Mock service functions
vi.mock('@/services/metricDependencyService', () => ({
  findDependentFormulas: vi.fn().mockResolvedValue({ dependentMetrics: [] }),
}));

vi.mock('@/services/metricOperations', () => ({
  archiveMetric: vi.fn().mockResolvedValue(undefined),
  getMetricTeamAssignments: vi.fn().mockResolvedValue([]),
  updateMetricTeamAssignments: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/constants/metricUnits', () => ({
  METRIC_UNIT_OPTIONS: [
    { value: 'number', label: 'Number' },
    { value: 'percentage', label: 'Percentage' },
  ],
}));

const mockMetric = {
  id: 'metric-1',
  metric_name: 'Revenue Target',
  description: 'Monthly revenue',
  target_value: 100000,
  target_logic: 'greater_than_or_equal',
  unit: 'number',
  owner_id: 'user-1',
  assistant_id: '',
  team_id: 'team-1',
  is_formula: false,
  formula_components: [],
  aggregation_type: 'total',
  formula_error_type: null,
  formula_error: null,
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  metric: mockMetric,
  onSave: vi.fn(),
  teamId: 'team-1',
};

describe('MetricConfigurationModal', () => {
  it('returns null when metric is null', () => {
    const { container } = render(
      <MetricConfigurationModal {...defaultProps} metric={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing visible when open=false', () => {
    render(
      <MetricConfigurationModal {...defaultProps} open={false} />
    );
    expect(screen.queryByText('Configure Metric')).not.toBeInTheDocument();
  });

  it('shows metric name in form when open with metric', () => {
    renderWithProviders(<MetricConfigurationModal {...defaultProps} />);
    expect(screen.getByText('Configure Metric')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Revenue Target')).toBeInTheDocument();
  });

  it('shows save button', () => {
    renderWithProviders(<MetricConfigurationModal {...defaultProps} />);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('shows target logic options label', () => {
    renderWithProviders(<MetricConfigurationModal {...defaultProps} />);
    expect(screen.getByText('Target Logic *')).toBeInTheDocument();
  });
});
