import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanCard } from './KanbanCard';

vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfiles: () => ({ profiles: [] }),
}));

vi.mock('@/utils/taskUtils', () => ({
  getDefaultDueDate: () => '2026-04-01',
}));

vi.mock('@/utils/dueDateUtils', () => ({
  getCompletedDateInfo: () => null,
}));

vi.mock('@/components/modals/EditTaskModal', () => ({
  EditTaskModal: () => <div data-testid="edit-modal">Edit Modal</div>,
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock('@/components/shared/MultiAssigneeDisplay', () => ({
  MultiAssigneeDisplay: () => <div data-testid="multi-assignee" />,
}));

const mockTask = {
  id: 'task-1',
  title: 'Test Task',
  description: 'A test description',
  status: 'todo' as const,
  due_date: '2026-04-15',
  user_id: 'user-1',
  assigned_to: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('KanbanCard', () => {
  it('renders without crashing', () => {
    render(<KanbanCard task={mockTask} onDelete={vi.fn()} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('displays task description', () => {
    render(<KanbanCard task={mockTask} onDelete={vi.fn()} />);
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('hides description when not provided', () => {
    const taskNoDesc = { ...mockTask, description: undefined };
    render(<KanbanCard task={taskNoDesc} onDelete={vi.fn()} />);
    expect(screen.queryByText('A test description')).not.toBeInTheDocument();
  });

  it('calls onDelete when archive button clicked', () => {
    const onDelete = vi.fn();
    render(<KanbanCard task={mockTask} onDelete={onDelete} />);
    const archiveBtn = screen.getByTitle('Archive task');
    fireEvent.click(archiveBtn);
    expect(onDelete).toHaveBeenCalledWith('task-1');
  });

  it('shows Anonymous badge for feedback-widget source', () => {
    const anonTask = { ...mockTask, source: 'feedback-widget' };
    render(<KanbanCard task={anonTask} onDelete={vi.fn()} />);
    expect(screen.getByText('Anonymous')).toBeInTheDocument();
  });

  it('applies line-through style when task is done', () => {
    const doneTask = { ...mockTask, status: 'done' as const };
    render(<KanbanCard task={doneTask} onDelete={vi.fn()} />);
    const title = screen.getByText('Test Task');
    expect(title.className).toContain('line-through');
  });
});
