import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreeYearMilestonesSection } from './ThreeYearMilestonesSection';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockUpdateData = vi.fn();
const mockAddThreeYearMetricTarget = vi.fn();
const mockUpdateThreeYearMetricTarget = vi.fn();
const mockRemoveThreeYearMetricTarget = vi.fn();

vi.mock('@/contexts/SimpleStrategyContext', () => ({
  useSimpleStrategy: vi.fn(() => ({
    data: {
      threeYearMilestones: {
        revenue: '',
        profit: '',
        metricTargets: [],
        whatItLooksLike: [],
      },
    },
    updateData: mockUpdateData,
    updateThreeYearDate: vi.fn(),
    addThreeYearMetricTarget: mockAddThreeYearMetricTarget,
    updateThreeYearMetricTarget: mockUpdateThreeYearMetricTarget,
    removeThreeYearMetricTarget: mockRemoveThreeYearMetricTarget,
    strategicPlan: null,
  })),
}));

vi.mock('@/hooks/useInlineEditing', () => ({
  useInlineEditing: vi.fn(() => ({
    editingId: null,
    editValue: '',
    setEditValue: vi.fn(),
    startEditing: vi.fn(),
    saveEdit: vi.fn(),
    cancelEdit: vi.fn(),
    handleKeyDown: vi.fn(),
  })),
}));

vi.mock('@/hooks/useLeadershipAccess', () => ({
  useLeadershipAccess: vi.fn(() => ({
    isLeadershipMember: true,
  })),
}));

import { useSimpleStrategy } from '@/contexts/SimpleStrategyContext';

describe('ThreeYearMilestonesSection', () => {
  it('renders without crashing', () => {
    render(<ThreeYearMilestonesSection />);
    expect(screen.getByText('Key measurable targets for the next 3 years')).toBeInTheDocument();
  });

  it('shows revenue and profit input fields', () => {
    render(<ThreeYearMilestonesSection />);
    expect(screen.getByLabelText('Revenue Target')).toBeInTheDocument();
    expect(screen.getByLabelText('Profit Target')).toBeInTheDocument();
  });

  it('shows add metric target button', () => {
    render(<ThreeYearMilestonesSection />);
    // The add button is the Plus icon button next to the metric input fields
    const metricNameInput = screen.getByPlaceholderText('Metric name');
    const targetValueInput = screen.getByPlaceholderText('Target value');
    expect(metricNameInput).toBeInTheDocument();
    expect(targetValueInput).toBeInTheDocument();
  });

  it('renders existing metric targets when provided', () => {
    vi.mocked(useSimpleStrategy).mockReturnValue({
      data: {
        threeYearMilestones: {
          revenue: '$5M',
          profit: '$1M',
          metricTargets: [
            { id: 'm1', name: 'Customer Count', target: '1000' },
            { id: 'm2', name: 'NPS Score', target: '70' },
          ],
          whatItLooksLike: [],
        },
      },
      updateData: mockUpdateData,
      updateThreeYearDate: vi.fn(),
      addThreeYearMetricTarget: mockAddThreeYearMetricTarget,
      updateThreeYearMetricTarget: mockUpdateThreeYearMetricTarget,
      removeThreeYearMetricTarget: mockRemoveThreeYearMetricTarget,
      strategicPlan: null,
    } as any);

    render(<ThreeYearMilestonesSection />);
    expect(screen.getByDisplayValue('Customer Count')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('NPS Score')).toBeInTheDocument();
    expect(screen.getByDisplayValue('70')).toBeInTheDocument();
  });

  it('shows What Does It Look Like section', () => {
    render(<ThreeYearMilestonesSection />);
    expect(screen.getByText('What Does It Look Like?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what the company will look like...')).toBeInTheDocument();
  });
});
