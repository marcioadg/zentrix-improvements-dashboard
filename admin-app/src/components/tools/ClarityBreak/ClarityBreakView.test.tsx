import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClarityBreakView from './ClarityBreakView';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

// Mock hooks
vi.mock('@/hooks/useAutosaveText', () => ({
  useAutosaveText: () => ({ value: '', setValue: vi.fn(), isSaving: false, hasUnsavedChanges: false }),
}));

vi.mock('@/hooks/usePageVisibility', () => ({
  usePageVisibility: () => true,
}));

vi.mock('@/contexts/ToolsContext', () => ({
  useTools: () => ({ activeTool: 'clarity-break', selectedTool: 'clarity-break' }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/ClarityBreakContext', () => ({
  useClarityBreakTimer: () => ({
    timerState: {
      isRunning: false,
      elapsedSeconds: 0,
      isPaused: false,
      promptIndex: 0,
      sessionId: null,
      insights: '',
      sessionPrompts: [],
      notes: {},
    },
    updateTimerState: vi.fn(),
    clearTimerState: vi.fn(),
    syncToDatabase: vi.fn(),
  }),
}));

// Mock child components
vi.mock('./ClarityBreakTimer', () => ({ default: () => <div data-testid="clarity-break-timer" /> }));
vi.mock('./PrivacyIndicator', () => ({ default: () => <div data-testid="privacy-indicator" /> }));
vi.mock('./ClarityBreakResume', () => ({ default: () => <div data-testid="clarity-break-resume" /> }));

const defaultHook = {
  incompleteSession: null,
  createSession: vi.fn(),
  resumeSession: vi.fn(),
  abandonSession: vi.fn(),
  saveEntry: vi.fn(),
  completeSession: vi.fn(),
  history: [],
  loading: false,
  getBreakEntries: vi.fn(),
  currentBreak: null,
};

describe('ClarityBreakView', () => {
  it('renders without crashing', () => {
    render(<ClarityBreakView clarityBreaksHook={defaultHook as any} />);
    expect(screen.getByText('Start a Clarity Break')).toBeInTheDocument();
  });

  it('shows start button when no active break', () => {
    render(<ClarityBreakView clarityBreaksHook={defaultHook as any} />);
    expect(screen.getByText('Start Clarity Break')).toBeInTheDocument();
  });

  it('shows prompts/questions area with core questions listed', () => {
    render(<ClarityBreakView clarityBreaksHook={defaultHook as any} />);
    expect(screen.getByText('Core Questions (Always Asked):')).toBeInTheDocument();
    expect(screen.getByText('What is stopping us from 10X the business?')).toBeInTheDocument();
    expect(screen.getByText('Am I focusing on the most important things?')).toBeInTheDocument();
    expect(screen.getByText('Do I have the Right People in the Right Seats to grow?')).toBeInTheDocument();
  });
});
