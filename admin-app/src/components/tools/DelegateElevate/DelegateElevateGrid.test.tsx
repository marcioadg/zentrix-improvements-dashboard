import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DelegateElevateGrid from './DelegateElevateGrid';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

// Mock hooks
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user1', email: 'test@test.com' } }),
}));

const mockAddTask = vi.fn();
const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();

let mockTasks: any[] = [];

vi.mock('@/hooks/useDelegateElevateSessions', () => ({
  useDelegateElevateSessions: () => ({
    currentSession: { id: 's1', name: 'Test Session' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useDelegateElevateTasks', () => ({
  useDelegateElevateTasks: () => ({
    tasks: mockTasks,
    loading: false,
    addTask: mockAddTask,
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
  }),
}));

vi.mock('@/hooks/useDelegateElevateVersions', () => ({
  useDelegateElevateVersions: () => ({
    versions: [],
    loading: false,
    saveVersion: vi.fn(),
    refetchVersions: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: () => ({
    hasUnsavedChanges: false,
    isSaving: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock child components to simplify rendering
vi.mock('./TaskModal', () => ({ default: () => <div data-testid="task-modal" /> }));
vi.mock('./EditTaskModal', () => ({ default: () => <div data-testid="edit-task-modal" /> }));
vi.mock('./DeleteTaskConfirmation', () => ({ default: () => <div data-testid="delete-task-confirmation" /> }));
vi.mock('./SaveVersionModal', () => ({ default: () => <div data-testid="save-version-modal" /> }));
vi.mock('./VersionHistoryModal', () => ({ default: () => <div data-testid="version-history-modal" /> }));
vi.mock('./AutoSaveIndicator', () => ({ default: () => <div data-testid="autosave-indicator" /> }));

describe('DelegateElevateGrid', () => {
  it('renders without crashing', () => {
    render(<DelegateElevateGrid />);
    expect(screen.getByText('Drag your tasks into the right quadrant')).toBeInTheDocument();
  });

  it('shows all 4 quadrant labels', () => {
    render(<DelegateElevateGrid />);
    expect(screen.getByText('Love + Great At')).toBeInTheDocument();
    expect(screen.getByText('Like + Good At')).toBeInTheDocument();
    expect(screen.getByText("Don't Like + Good At")).toBeInTheDocument();
    expect(screen.getByText("Don't Like + Not Good At")).toBeInTheDocument();
  });

  it('shows add task button', () => {
    render(<DelegateElevateGrid />);
    expect(screen.getByText('Add Task')).toBeInTheDocument();
  });

  it('renders tasks in correct quadrants when tasks provided', () => {
    mockTasks = [
      { id: 't1', title: 'Strategic Planning', description: '', quadrant: 'Love+Great', time_per_week: 5 },
      { id: 't2', title: 'Data Entry', description: '', quadrant: 'DontLike+NotGood', time_per_week: 2 },
    ];

    render(<DelegateElevateGrid />);
    expect(screen.getAllByText('Strategic Planning').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Data Entry').length).toBeGreaterThanOrEqual(1);

    // Reset
    mockTasks = [];
  });
});
