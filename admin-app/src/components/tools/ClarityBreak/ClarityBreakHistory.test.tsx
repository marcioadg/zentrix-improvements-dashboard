import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClarityBreakHistory from './ClarityBreakHistory';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

// Mock date-fns format to avoid timezone issues
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: (date: Date, formatStr: string) => {
      if (formatStr === 'MMM d, yyyy') return 'Jan 15, 2026';
      if (formatStr === 'PPP') return 'January 15, 2026';
      if (formatStr === 'PPpp') return 'January 15, 2026 at 10:00 AM';
      if (formatStr === 'yyyy-MM-dd') return '2026-01-15';
      return 'mocked-date';
    },
  };
});

const makeHook = (overrides = {}) => ({
  history: [],
  loading: false,
  getBreakEntries: vi.fn().mockResolvedValue([]),
  incompleteSession: null,
  createSession: vi.fn(),
  resumeSession: vi.fn(),
  abandonSession: vi.fn(),
  saveEntry: vi.fn(),
  completeSession: vi.fn(),
  currentBreak: null,
  ...overrides,
});

describe('ClarityBreakHistory', () => {
  it('renders without crashing with empty history', () => {
    render(<ClarityBreakHistory clarityBreaksHook={makeHook() as any} />);
    expect(screen.getByText('Past Clarity Breaks')).toBeInTheDocument();
  });

  it('shows "no history" message when empty', () => {
    render(<ClarityBreakHistory clarityBreaksHook={makeHook() as any} />);
    expect(screen.getByText('No clarity breaks yet.')).toBeInTheDocument();
    expect(screen.getByText('Start your first session above to begin tracking your insights.')).toBeInTheDocument();
  });

  it('renders history entries when provided', () => {
    const hook = makeHook({
      history: [
        {
          id: 'b1',
          started_at: '2026-01-15T10:00:00Z',
          ended_at: '2026-01-15T10:30:00Z',
          duration_minutes: 30,
          insights: 'Focus on delegation',
        },
        {
          id: 'b2',
          started_at: '2026-01-15T14:00:00Z',
          ended_at: null,
          duration_minutes: 45,
          insights: null,
        },
      ],
    });

    render(<ClarityBreakHistory clarityBreaksHook={hook as any} />);
    expect(screen.queryByText('No clarity breaks yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});
