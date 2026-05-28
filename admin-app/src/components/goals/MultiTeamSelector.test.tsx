import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiTeamSelector } from './MultiTeamSelector';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const defaultProps = {
  teams: [
    { id: 'team-1', name: 'Engineering' },
    { id: 'team-2', name: 'Design' },
  ],
  selectedTeamIds: [],
  onSelectionChange: vi.fn(),
};

describe('MultiTeamSelector', () => {
  it('renders without crashing', () => {
    render(<MultiTeamSelector {...defaultProps} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows placeholder when no teams selected', () => {
    render(<MultiTeamSelector {...defaultProps} />);
    expect(screen.getByText('Select teams')).toBeInTheDocument();
  });

  it('shows custom placeholder', () => {
    render(<MultiTeamSelector {...defaultProps} placeholder="Pick teams" />);
    expect(screen.getByText('Pick teams')).toBeInTheDocument();
  });

  it('shows team name when one team is selected', () => {
    render(<MultiTeamSelector {...defaultProps} selectedTeamIds={['team-1']} />);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('shows count when multiple teams selected', () => {
    render(
      <MultiTeamSelector {...defaultProps} selectedTeamIds={['team-1', 'team-2']} />
    );
    expect(screen.getByText('2 teams selected')).toBeInTheDocument();
  });

  it('renders disabled state', () => {
    render(<MultiTeamSelector {...defaultProps} disabled={true} />);
    const button = screen.getByRole('combobox');
    expect(button).toBeDisabled();
  });

  it('handles non-array selectedTeamIds gracefully', () => {
    render(
      <MultiTeamSelector {...defaultProps} selectedTeamIds={null as any} />
    );
    expect(screen.getByText('Select teams')).toBeInTheDocument();
  });
});
