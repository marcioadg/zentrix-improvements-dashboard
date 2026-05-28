import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAddTask } from './QuickAddTask';

vi.mock('@/utils/taskUtils', () => ({
  getDefaultDueDate: () => '2026-04-01',
}));
vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const defaultProps = {
  onAddTask: vi.fn().mockResolvedValue(undefined),
};

describe('QuickAddTask', () => {
  it('renders without crashing', () => {
    render(<QuickAddTask {...defaultProps} />);
    expect(screen.getByPlaceholderText(/What needs to be done/)).toBeInTheDocument();
  });

  it('submit button is disabled when title is empty', () => {
    render(<QuickAddTask {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(b => b.getAttribute('type') === 'submit');
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when title has text', () => {
    render(<QuickAddTask {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/What needs to be done/), {
      target: { value: 'New task' },
    });
    const buttons = screen.getAllByRole('button');
    const submitButton = buttons.find(b => b.getAttribute('type') === 'submit');
    expect(submitButton).not.toBeDisabled();
  });

  it('disables input when loading prop is true', () => {
    render(<QuickAddTask {...defaultProps} loading={true} />);
    expect(screen.getByPlaceholderText(/What needs to be done/)).toBeDisabled();
  });

  it('shows details section when calendar button is clicked', () => {
    render(<QuickAddTask {...defaultProps} />);
    // Calendar button is the outline button
    const buttons = screen.getAllByRole('button');
    const calendarButton = buttons.find(b => b.getAttribute('type') === 'button');
    fireEvent.click(calendarButton!);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });
});
