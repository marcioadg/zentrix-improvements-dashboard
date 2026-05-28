import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StandupTaskView } from './StandupTaskView';

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock logger
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

// Mock custom hooks
vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: vi.fn(() => ({
    members: [],
  })),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfiles: vi.fn(() => ({
    profiles: [],
  })),
}));

vi.mock('@/contexts/MultiCompanyContext', () => ({
  useMultiCompany: vi.fn(() => ({
    currentCompany: { id: 'company-1', name: 'Test Co' },
  })),
}));

vi.mock('@/hooks/useCelebration', () => ({
  useCelebration: vi.fn(() => ({
    triggerCelebration: vi.fn(),
  })),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => ({
    profile: { id: 'user-1', full_name: 'Test User' },
  })),
}));

vi.mock('@/contexts/NewMeetingTimerContext', () => ({
  useNewMeetingTimer: vi.fn(() => ({
    timerState: { meetingStartTime: null },
  })),
}));

vi.mock('@/utils/dueDateUtils', () => ({
  getDueDateInfo: vi.fn(() => null),
}));

// Mock child components
vi.mock('@/components/modals/EditTaskModal', () => ({
  EditTaskModal: () => <div data-testid="edit-task-modal" />,
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ fullName }: { fullName: string }) => <div data-testid="user-avatar">{fullName}</div>,
}));

describe('StandupTaskView', () => {
  const defaultProps = {
    teamId: 'team-1',
    tasks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty tasks', () => {
    render(<StandupTaskView {...defaultProps} />);
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<StandupTaskView {...defaultProps} loading={true} />);
    expect(screen.getByText('Stand-up Task View')).toBeInTheDocument();
    // Loading state renders 3 placeholder divs with animate-pulse
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeInTheDocument();
  });

  it('renders task items when tasks provided with matching team members', async () => {
    const { useTeamMembers } = await import('@/hooks/useTeamMembers');
    vi.mocked(useTeamMembers).mockReturnValue({
      members: [
        {
          id: 'member-1',
          user_id: 'user-1',
          team_id: 'team-1',
          profiles: { full_name: 'Alice Smith', email: 'alice@test.com', avatar_url: null },
        },
      ],
    } as any);

    const { useProfiles } = await import('@/hooks/useProfiles');
    vi.mocked(useProfiles).mockReturnValue({
      profiles: [
        { id: 'user-1', full_name: 'Alice Smith', email: 'alice@test.com', avatar_url: null },
      ],
    } as any);

    const tasks = [
      {
        id: 'task-1',
        title: 'Fix the bug',
        completed: false,
        assigned_to: ['user-1'],
        created_at: '2025-01-01T00:00:00Z',
        archived: false,
        description: '',
        due_date: null,
      },
    ];

    render(<StandupTaskView {...defaultProps} tasks={tasks as any} />);
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0);
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
  });

  it('shows empty state message when no tasks', () => {
    render(<StandupTaskView {...defaultProps} tasks={[]} />);
    expect(screen.getByText('No tasks found')).toBeInTheDocument();
    expect(screen.getByText('No active tasks for this team.')).toBeInTheDocument();
  });
});
