import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditGoalModal } from './EditGoalModal';

// Mock logger and sonner
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock hooks
vi.mock('@/hooks/useMultipleTeamMembers', () => ({
  useMultipleTeamMembers: () => ({
    allUsers: [],
    usersInAllTeams: [],
    getUserTeams: vi.fn(() => []),
    loading: false,
  }),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfiles: () => ({ profiles: [] }),
}));

vi.mock('@/hooks/useUserTeams', () => ({
  useUserTeams: () => ({ teams: [] }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useLeadershipAccess', () => ({
  useLeadershipAccess: () => ({ isLeadershipMember: false }),
}));

vi.mock('@/hooks/useUserTeamMemberships', () => ({
  useUserTeamMemberships: () => ({ teamIds: [], loading: false }),
}));

vi.mock('@/hooks/useGoalMilestones', () => ({
  useGoalMilestones: () => ({
    milestones: [],
    addMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
  }),
}));

// Mock sub-components
vi.mock('@/components/goals/MultiTeamSelector', () => ({
  MultiTeamSelector: (props: any) => <div data-testid="multi-team-selector" />,
}));

vi.mock('@/components/goals/OwnerSelectorWithDisabled', () => ({
  OwnerSelectorWithDisabled: (props: any) => <div data-testid="owner-selector" />,
}));

vi.mock('@/components/ui/elastic-slider', () => ({
  ElasticSlider: (props: any) => <div data-testid="elastic-slider" />,
}));

const mockGoal = {
  id: 'goal-1',
  title: 'Test Goal Title',
  description: 'A test description',
  owner_id: 'user-1',
  team_id: 'team-1',
  target_date: '2026-06-01',
  is_company_goal: false,
  team_assignments: [{ team_id: 'team-1' }],
  progress: 50,
  status: 'active',
  created_at: '2026-01-01',
  created_by: 'user-1',
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  goal: mockGoal as any,
  onUpdate: vi.fn().mockResolvedValue(true),
  teamId: 'team-1',
};

describe('EditGoalModal', () => {
  it('renders nothing visible when open=false', () => {
    const { container } = render(
      <EditGoalModal {...defaultProps} open={false} />
    );
    expect(screen.queryByText('Edit Goal')).not.toBeInTheDocument();
  });

  it('renders modal with goal title when open=true and goal provided', () => {
    render(<EditGoalModal {...defaultProps} />);
    expect(screen.getByText('Edit Goal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Goal Title')).toBeInTheDocument();
  });

  it('shows delete button when onDelete prop is provided', () => {
    render(
      <EditGoalModal {...defaultProps} onDelete={vi.fn().mockResolvedValue(true)} />
    );
    expect(screen.getByText('Archive Goal')).toBeInTheDocument();
  });

  it('does not show delete button when onDelete prop is not provided', () => {
    render(<EditGoalModal {...defaultProps} />);
    expect(screen.queryByText('Archive Goal')).not.toBeInTheDocument();
  });

  it('shows form fields (title input, description)', () => {
    render(<EditGoalModal {...defaultProps} />);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test description')).toBeInTheDocument();
  });
});
