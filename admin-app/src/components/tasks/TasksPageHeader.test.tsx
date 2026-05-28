import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TasksPageHeader } from './TasksPageHeader';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>List View</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

const defaultProps = {
  teams: [
    { id: 'team-1', name: 'Engineering' },
    { id: 'team-2', name: 'Design' },
  ],
  transformedTaskCounts: [
    { id: 'personal', totalCount: 5 },
    { id: 'team-1', totalCount: 3 },
    { id: 'team-2', totalCount: 2 },
  ],
  selectedTeamIds: ['personal'],
  filterPreferences: {
    sortBy: 'due_date' as const,
    sortOrder: 'asc' as const,
    showArchived: false,
    myTasksOnly: false,
  },
  viewMode: 'list' as const,
  onSelectionChange: vi.fn(),
  onUpdatePreferences: vi.fn(),
  onViewModeChange: vi.fn(),
  onCameraClick: vi.fn(),
};

describe('TasksPageHeader', () => {
  it('renders without crashing', () => {
    render(<TasksPageHeader {...defaultProps} />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  it('renders team names', () => {
    render(<TasksPageHeader {...defaultProps} />);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('displays task counts for teams', () => {
    render(<TasksPageHeader {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders Personal Tasks checkbox', () => {
    render(<TasksPageHeader {...defaultProps} />);
    expect(screen.getByText('Personal Tasks')).toBeInTheDocument();
  });

  it('renders Camera button', () => {
    render(<TasksPageHeader {...defaultProps} />);
    expect(screen.getByText('Camera')).toBeInTheDocument();
  });
});
