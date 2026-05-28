import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskFilters } from './TaskFilters';

const defaultProps = {
  filter: 'all' as const,
  onFilterChange: vi.fn(),
  taskCounts: { total: 10, active: 7, completed: 3 },
  onClearCompleted: vi.fn(),
};

describe('TaskFilters', () => {
  it('renders without crashing', () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.getByText('All Tasks')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('displays task counts in badges', () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onFilterChange when filter buttons clicked', () => {
    const onFilterChange = vi.fn();
    render(<TaskFilters {...defaultProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByText('Active'));
    expect(onFilterChange).toHaveBeenCalledWith('active');

    fireEvent.click(screen.getByText('Completed'));
    expect(onFilterChange).toHaveBeenCalledWith('completed');
  });

  it('shows Clear Completed button when completed count > 0', () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.getByText('Clear Completed')).toBeInTheDocument();
  });

  it('hides Clear Completed button when completed count is 0', () => {
    render(
      <TaskFilters
        {...defaultProps}
        taskCounts={{ total: 5, active: 5, completed: 0 }}
      />
    );
    expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
  });

  it('calls onClearCompleted when clear button clicked', () => {
    const onClearCompleted = vi.fn();
    render(<TaskFilters {...defaultProps} onClearCompleted={onClearCompleted} />);
    fireEvent.click(screen.getByText('Clear Completed'));
    expect(onClearCompleted).toHaveBeenCalledOnce();
  });

  it('renders search bar when onSearchChange is provided', () => {
    render(
      <TaskFilters
        {...defaultProps}
        searchTerm="test"
        onSearchChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('does not render search bar when onSearchChange is not provided', () => {
    render(<TaskFilters {...defaultProps} />);
    expect(screen.queryByPlaceholderText('Search tasks...')).not.toBeInTheDocument();
  });

  it('calls onSearchChange when search input changes', () => {
    const onSearchChange = vi.fn();
    render(
      <TaskFilters {...defaultProps} searchTerm="" onSearchChange={onSearchChange} />
    );
    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'hello' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('hello');
  });
});
