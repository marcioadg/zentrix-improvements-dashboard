import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsOverview } from './MetricsOverview';
import { MemoryRouter } from 'react-router-dom';

const mockMetrics = [
  {
    id: 'm1',
    name: 'Revenue',
    value: '1000',
    unit: 'USD',
    target: 1200,
    targetLogic: '>=',
    status: 'behind' as const,
    weekStart: '2026-03-01',
    teamName: 'Sales',
  },
  {
    id: 'm2',
    name: 'NPS Score',
    value: '85',
    unit: 'pts',
    target: 80,
    targetLogic: '>=',
    status: 'on-track' as const,
    weekStart: '2026-03-01',
    teamName: 'Support',
  },
];

vi.mock('@/hooks/useMetricsOverview', () => ({
  useMetricsOverview: () => ({
    myMetrics: mockMetrics,
    loading: false,
  }),
}));

describe('MetricsOverview', () => {
  const renderWithRouter = () =>
    render(
      <MemoryRouter>
        <MetricsOverview />
      </MemoryRouter>
    );

  it('renders without crashing', () => {
    renderWithRouter();
    expect(screen.getByText('My Metrics')).toBeInTheDocument();
  });

  it('displays metric names', () => {
    renderWithRouter();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('NPS Score')).toBeInTheDocument();
  });

  it('displays metric values with units', () => {
    renderWithRouter();
    expect(screen.getByText('1000 USD')).toBeInTheDocument();
    expect(screen.getByText('85 pts')).toBeInTheDocument();
  });

  it('displays target values', () => {
    renderWithRouter();
    expect(screen.getByText('Target: 1200 USD')).toBeInTheDocument();
    expect(screen.getByText('Target: 80 pts')).toBeInTheDocument();
  });

  it('displays status badges', () => {
    renderWithRouter();
    expect(screen.getByText('Behind')).toBeInTheDocument();
    expect(screen.getByText('On Track')).toBeInTheDocument();
  });

  it('displays team names', () => {
    renderWithRouter();
    expect(screen.getByText('Sales')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('renders View All link', () => {
    renderWithRouter();
    expect(screen.getByText('View All')).toBeInTheDocument();
  });
});
