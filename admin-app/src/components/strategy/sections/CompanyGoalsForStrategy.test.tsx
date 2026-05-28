import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompanyGoalsForStrategy } from './CompanyGoalsForStrategy';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock goalProgressStatusSync
vi.mock('@/lib/goalProgressStatusSync', () => ({
  syncStatusFromProgress: vi.fn(() => ({ status: null, shouldCelebrate: false })),
  syncProgressFromStatus: vi.fn(() => ({ progress: undefined, shouldCelebrate: false })),
  triggerCelebrationSafely: vi.fn(),
}));

// Mock AddGoalModal
vi.mock('@/components/modals/AddGoalModal', () => ({
  AddGoalModal: () => null,
}));

// Mock UserAvatar
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ fullName }: { fullName: string }) => <span data-testid="user-avatar">{fullName}</span>,
}));

// Mock ElasticSlider
vi.mock('@/components/ui/elastic-slider', () => ({
  ElasticSlider: () => <div data-testid="elastic-slider" />,
}));

const mockUpdateGoal = vi.fn().mockResolvedValue(true);
const mockSetGoals = vi.fn();

vi.mock('@/hooks/useCompanyGoals', () => ({
  useCompanyGoals: vi.fn(() => ({
    goals: [],
    loading: false,
    isLeadershipMember: true,
    updateGoal: mockUpdateGoal,
    setGoals: mockSetGoals,
  })),
}));

vi.mock('@/hooks/useOptimizedProfileLookup', () => ({
  useOptimizedProfileLookup: vi.fn(() => ({
    profiles: {},
  })),
}));

vi.mock('@/hooks/useGoalMilestones', () => ({
  useGoalMilestones: vi.fn(() => ({
    milestones: [],
    addMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    progress: 0,
  })),
}));

vi.mock('@/hooks/useGoalsPermissions', () => ({
  useGoalsPermissions: vi.fn(() => ({
    canEdit: true,
    canEditMilestone: vi.fn(() => true),
  })),
}));

vi.mock('@/hooks/useOptimizedUserTeams', () => ({
  useOptimizedUserTeams: vi.fn(() => ({
    allTeams: [],
  })),
}));

vi.mock('@/hooks/useMultiCompanyAccess', () => ({
  useMultiCompanyAccess: vi.fn(() => ({
    currentCompany: { id: 'c1' },
  })),
}));

vi.mock('@/hooks/meeting/useGoalReorderBroadcast', () => ({
  useGoalReorderBroadcast: vi.fn(() => ({
    publishGoalUpdated: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Import mocked modules so we can change return values per-test
import { useCompanyGoals } from '@/hooks/useCompanyGoals';
import { useOptimizedProfileLookup } from '@/hooks/useOptimizedProfileLookup';

describe('CompanyGoalsForStrategy', () => {
  it('renders without crashing', () => {
    render(<CompanyGoalsForStrategy />);
    expect(screen.getByText('Company Goals')).toBeInTheDocument();
  });

  it('shows empty state when no goals', () => {
    render(<CompanyGoalsForStrategy />);
    expect(screen.getByText('No company goals yet.')).toBeInTheDocument();
  });

  it('renders goal items when goals exist', () => {
    vi.mocked(useCompanyGoals).mockReturnValue({
      goals: [
        {
          id: 'g1',
          title: 'Increase Revenue',
          status: 'on_track',
          owner_id: 'u1',
          team_id: 't1',
          progress: 50,
          is_company_goal: true,
        },
        {
          id: 'g2',
          title: 'Expand Market',
          status: 'off_track',
          owner_id: 'u2',
          team_id: 't1',
          progress: 20,
          is_company_goal: true,
        },
      ],
      loading: false,
      isLeadershipMember: true,
      updateGoal: mockUpdateGoal,
      setGoals: mockSetGoals,
    } as any);

    vi.mocked(useOptimizedProfileLookup).mockReturnValue({
      profiles: {
        u1: { full_name: 'Alice', email: 'alice@test.com', avatar_url: null },
        u2: { full_name: 'Bob', email: 'bob@test.com', avatar_url: null },
      },
    } as any);

    render(<CompanyGoalsForStrategy />);
    expect(screen.getAllByText('Increase Revenue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expand Market').length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    vi.mocked(useCompanyGoals).mockReturnValue({
      goals: [],
      loading: true,
      isLeadershipMember: true,
      updateGoal: mockUpdateGoal,
      setGoals: mockSetGoals,
    } as any);

    render(<CompanyGoalsForStrategy />);
    expect(screen.getByText('Company Goals')).toBeInTheDocument();
    // Should not show empty state text when loading
    expect(screen.queryByText('No company goals yet.')).not.toBeInTheDocument();
  });

  it('shows access restricted message for non-leadership members', () => {
    vi.mocked(useCompanyGoals).mockReturnValue({
      goals: [],
      loading: false,
      isLeadershipMember: false,
      updateGoal: mockUpdateGoal,
      setGoals: mockSetGoals,
    } as any);

    render(<CompanyGoalsForStrategy />);
    expect(screen.getByText('Leadership Access Only')).toBeInTheDocument();
  });
});
