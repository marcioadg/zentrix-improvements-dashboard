import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskItem } from './TaskItem';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/utils/dueDateUtils', () => ({
  getDueDateInfo: (d: string | undefined) =>
    d ? { text: '3 days left', urgencyClass: '', isOverdue: false, isDueToday: false, dueDate: new Date(d) } : null,
  getCompletedDateInfo: () => null,
}));
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: ({ fullName }: any) => <div data-testid="avatar">{fullName}</div>,
}));
vi.mock('@/hooks/useCelebration', () => ({
  useCelebration: () => ({ triggerCelebration: vi.fn() }),
}));

const mockTask = {
  id: 'task-1',
  title: 'Fix the bug',
  description: 'Something is broken',
  completed: false,
  due_date: '2026-04-01',
  assigned_to: 'user-1',
  created_at: '2026-01-01',
};

const defaultProps = {
  task: mockTask,
  onToggleTask: vi.fn(),
  onArchiveTask: vi.fn(),
  onEditTask: vi.fn(),
  getProfileName: (id: string) => 'John Doe',
  getInitials: (name: string) => 'JD',
  getProfileAvatar: (id: string) => undefined,
};

describe('TaskItem', () => {
  it('renders without crashing', () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByText('Fix the bug')).toBeInTheDocument();
  });

  it('displays assigned user avatar', () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('John Doe');
  });

  it('shows due date info when not completed', () => {
    render(<TaskItem {...defaultProps} />);
    expect(screen.getByText('3 days left')).toBeInTheDocument();
  });

  it('hides due date info when completed', () => {
    const completedTask = { ...mockTask, completed: true };
    render(<TaskItem {...defaultProps} task={completedTask} />);
    expect(screen.queryByText('3 days left')).not.toBeInTheDocument();
  });

  it('calls onArchiveTask when archive button clicked', () => {
    const onArchiveTask = vi.fn();
    render(<TaskItem {...defaultProps} onArchiveTask={onArchiveTask} />);
    fireEvent.click(screen.getByTitle('Archive Task'));
    expect(onArchiveTask).toHaveBeenCalledWith('task-1');
  });

  it('calls onEditTask when title clicked', () => {
    const onEditTask = vi.fn();
    render(<TaskItem {...defaultProps} onEditTask={onEditTask} />);
    fireEvent.click(screen.getByText('Fix the bug'));
    expect(onEditTask).toHaveBeenCalledWith(mockTask);
  });

  it('shows Personal badge for personal tasks', () => {
    const personalTask = { ...mockTask, task_type: 'personal' as const };
    render(<TaskItem {...defaultProps} task={personalTask} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('applies line-through class when completed', () => {
    const completedTask = { ...mockTask, completed: true };
    render(<TaskItem {...defaultProps} task={completedTask} />);
    const title = screen.getByText('Fix the bug');
    expect(title.className).toContain('line-through');
  });
});
