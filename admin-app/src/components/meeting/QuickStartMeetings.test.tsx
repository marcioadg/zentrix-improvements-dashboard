import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStartMeetings } from './QuickStartMeetings';

// Mock sonner
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Mock logger
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

// Mock custom hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

vi.mock('@/hooks/useOptimizedUserTeams', () => ({
  useOptimizedUserTeams: vi.fn(() => ({
    teams: [{ id: 'team-1', name: 'Team Alpha' }],
  })),
}));

vi.mock('@/hooks/useMultiCompanyAccess', () => ({
  useMultiCompanyAccess: vi.fn(() => ({
    currentCompany: { id: 'company-1', name: 'Test Co' },
  })),
}));

vi.mock('@/hooks/meeting/useOptimizedActiveMeetings', () => ({
  useOptimizedActiveMeetings: vi.fn(() => ({
    meetings: [],
    addOptimisticMeeting: vi.fn(),
    forceRefetch: vi.fn(),
  })),
}));

vi.mock('@/hooks/useOptimisticMeetingState', () => ({
  useOptimisticMeetingState: vi.fn(() => ({
    isStarting: false,
    startingMeetingType: null,
    setMeetingStarting: vi.fn(),
    setMeetingStarted: vi.fn(),
    setMeetingError: vi.fn(),
  })),
}));

vi.mock('@/hooks/meeting/useCustomMeetingTemplates', () => ({
  useCustomMeetingTemplates: vi.fn(() => ({
    templates: [],
  })),
}));

vi.mock('@/hooks/meeting/useTemplateDelete', () => ({
  useTemplateDelete: vi.fn(() => ({
    deleteTemplate: vi.fn(),
  })),
}));

// Mock child components
vi.mock('@/components/meeting/TeamSelectionModal', () => ({
  TeamSelectionModal: () => <div data-testid="team-selection-modal" />,
}));

vi.mock('@/components/meeting/CustomTemplateSelectionModal', () => ({
  CustomTemplateSelectionModal: () => <div data-testid="custom-template-modal" />,
}));

vi.mock('@/components/meeting/MeetingMembers', () => ({
  MeetingMembers: () => <div data-testid="meeting-members" />,
}));

vi.mock('@/utils/meetingSectionMapping', () => ({
  ensureWrapUpSection: vi.fn((s) => s),
}));

describe('QuickStartMeetings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<QuickStartMeetings />);
    expect(screen.getByText('Start a meeting')).toBeInTheDocument();
  });

  it('displays meeting type cards (Weekly, Quarterly, Annual, Custom)', () => {
    render(<QuickStartMeetings />);
    expect(screen.getByText('Weekly Meeting')).toBeInTheDocument();
    expect(screen.getByText('Quarterly Meeting')).toBeInTheDocument();
    expect(screen.getByText('Annual Meeting')).toBeInTheDocument();
    expect(screen.getByText('Custom Meeting')).toBeInTheDocument();
  });

  it('shows "Active" indicator when an active meeting exists', async () => {
    const { useOptimizedActiveMeetings } = await import('@/hooks/meeting/useOptimizedActiveMeetings');
    vi.mocked(useOptimizedActiveMeetings).mockReturnValue({
      meetings: [
        {
          id: 'meeting-1',
          team_id: 'team-1',
          status: 'active',
          meeting_type: 'weekly',
          team_name: 'Team Alpha',
          isOptimistic: false,
        },
      ] as any,
      addOptimisticMeeting: vi.fn(),
      forceRefetch: vi.fn(),
    } as any);

    render(<QuickStartMeetings />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows loading state when meeting is starting', async () => {
    const { useOptimisticMeetingState } = await import('@/hooks/useOptimisticMeetingState');
    vi.mocked(useOptimisticMeetingState).mockReturnValue({
      isStarting: true,
      startingMeetingType: 'weekly',
      setMeetingStarting: vi.fn(),
      setMeetingStarted: vi.fn(),
      setMeetingError: vi.fn(),
    } as any);

    render(<QuickStartMeetings />);
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });
});
