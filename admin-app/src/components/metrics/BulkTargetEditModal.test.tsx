import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BulkTargetEditModal } from './BulkTargetEditModal';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/services/metricOperations', () => ({
  updateCustomTarget: vi.fn(),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  metricId: 'metric-1',
  teamId: 'team-1',
  metricName: 'Revenue',
  weekStarts: ['2026-03-02', '2026-03-09', '2026-03-16'],
  defaultTarget: 100,
  defaultLogic: '≥',
  formatWeekDate: (d: string) => d,
  unit: 'USD',
};

describe('BulkTargetEditModal', () => {
  it('renders without crashing when open', () => {
    render(<BulkTargetEditModal {...defaultProps} />);
    expect(screen.getByText(/Edit Weekly Targets: Revenue/)).toBeInTheDocument();
  });

  it('displays default target info', () => {
    render(<BulkTargetEditModal {...defaultProps} />);
    expect(screen.getByText(/Default target:.*≥ 100/)).toBeInTheDocument();
  });

  it('renders week rows for each weekStart', () => {
    render(<BulkTargetEditModal {...defaultProps} />);
    expect(screen.getByText('2026-03-02')).toBeInTheDocument();
    expect(screen.getByText('2026-03-09')).toBeInTheDocument();
    expect(screen.getByText('2026-03-16')).toBeInTheDocument();
  });

  it('renders Save and Cancel buttons', () => {
    render(<BulkTargetEditModal {...defaultProps} />);
    expect(screen.getByText('Save All')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows no custom targets message initially', () => {
    render(<BulkTargetEditModal {...defaultProps} />);
    expect(screen.getByText('No custom targets set')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<BulkTargetEditModal {...defaultProps} open={false} />);
    expect(screen.queryByText(/Edit Weekly Targets/)).not.toBeInTheDocument();
  });
});
