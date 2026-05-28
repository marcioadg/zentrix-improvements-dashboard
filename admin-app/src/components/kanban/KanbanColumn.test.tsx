import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanColumn } from './KanbanColumn';

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    isOver: false,
    setNodeRef: vi.fn(),
  }),
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
  EditTaskModal: () => null,
}));

vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));

vi.mock('@/components/shared/MultiAssigneeDisplay', () => ({
  MultiAssigneeDisplay: () => null,
}));

const mockTasks = [
  { id: '1', title: 'Task One', status: 'todo' as const, created_at: '', updated_at: '' },
  { id: '2', title: 'Task Two', status: 'todo' as const, created_at: '', updated_at: '' },
];

describe('KanbanColumn', () => {
  it('renders without crashing', () => {
    render(
      <KanbanColumn title="To Do" status="todo" tasks={mockTasks} onDeleteTask={vi.fn()} />
    );
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('displays task count', () => {
    render(
      <KanbanColumn title="To Do" status="todo" tasks={mockTasks} onDeleteTask={vi.fn()} />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', () => {
    render(
      <KanbanColumn title="Done" status="done" tasks={[]} onDeleteTask={vi.fn()} />
    );
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('renders task cards', () => {
    render(
      <KanbanColumn title="To Do" status="todo" tasks={mockTasks} onDeleteTask={vi.fn()} />
    );
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });
});
