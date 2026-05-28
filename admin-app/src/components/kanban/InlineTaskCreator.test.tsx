import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineTaskCreator } from './InlineTaskCreator';

const defaultProps = {
  onSubmit: vi.fn(),
};

describe('InlineTaskCreator', () => {
  it('renders collapsed state by default', () => {
    render(<InlineTaskCreator {...defaultProps} />);
    expect(screen.getByText('Add a task...')).toBeInTheDocument();
  });

  it('expands form when Add button clicked', () => {
    render(<InlineTaskCreator {...defaultProps} />);
    fireEvent.click(screen.getByText('Add a task...'));
    expect(screen.getByPlaceholderText('Task title...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Description (optional)...')).toBeInTheDocument();
  });

  it('shows status label when expanded', () => {
    render(<InlineTaskCreator {...defaultProps} defaultStatus="in-progress" />);
    fireEvent.click(screen.getByText('Add a task...'));
    expect(screen.getByText(/In Progress/)).toBeInTheDocument();
  });

  it('submit button disabled when title is empty', () => {
    render(<InlineTaskCreator {...defaultProps} />);
    fireEvent.click(screen.getByText('Add a task...'));
    const buttons = screen.getAllByRole('button');
    const submit = buttons.find(b => b.getAttribute('type') === 'submit');
    expect(submit).toBeDisabled();
  });

  it('calls onSubmit with correct args on form submit', () => {
    const onSubmit = vi.fn();
    render(<InlineTaskCreator onSubmit={onSubmit} defaultStatus="todo" />);
    fireEvent.click(screen.getByText('Add a task...'));

    fireEvent.change(screen.getByPlaceholderText('Task title...'), {
      target: { value: 'My new task' },
    });
    fireEvent.change(screen.getByPlaceholderText('Description (optional)...'), {
      target: { value: 'Details here' },
    });

    const buttons = screen.getAllByRole('button');
    const submit = buttons.find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submit!);

    expect(onSubmit).toHaveBeenCalledWith(
      'My new task',
      'Details here',
      { type: 'personal' },
      'todo'
    );
  });

  it('collapses form after submit', () => {
    render(<InlineTaskCreator {...defaultProps} />);
    fireEvent.click(screen.getByText('Add a task...'));
    fireEvent.change(screen.getByPlaceholderText('Task title...'), {
      target: { value: 'Task' },
    });
    const buttons = screen.getAllByRole('button');
    const submit = buttons.find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submit!);
    expect(screen.getByText('Add a task...')).toBeInTheDocument();
  });

  it('normalizes inprogress status to in-progress', () => {
    const onSubmit = vi.fn();
    render(<InlineTaskCreator onSubmit={onSubmit} defaultStatus="inprogress" />);
    fireEvent.click(screen.getByText('Add a task...'));
    fireEvent.change(screen.getByPlaceholderText('Task title...'), {
      target: { value: 'Task' },
    });
    const buttons = screen.getAllByRole('button');
    const submit = buttons.find(b => b.getAttribute('type') === 'submit');
    fireEvent.click(submit!);
    expect(onSubmit).toHaveBeenCalledWith('Task', '', { type: 'personal' }, 'in-progress');
  });
});
