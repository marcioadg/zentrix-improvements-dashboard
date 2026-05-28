import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueInlineAdd } from './IssueInlineAdd';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const defaultProps = {
  onAddIssue: vi.fn().mockResolvedValue(true),
  onCancel: vi.fn(),
};

describe('IssueInlineAdd', () => {
  it('renders without crashing', () => {
    render(<IssueInlineAdd {...defaultProps} />);
    expect(screen.getByPlaceholderText('Add issue and press Enter')).toBeInTheDocument();
  });

  it('input is autofocused', () => {
    render(<IssueInlineAdd {...defaultProps} />);
    expect(screen.getByPlaceholderText('Add issue and press Enter')).toHaveFocus();
  });

  it('calls onCancel on Escape key', () => {
    const onCancel = vi.fn();
    render(<IssueInlineAdd {...defaultProps} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Add issue and press Enter'), {
      key: 'Escape',
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onAddIssue on Enter key with non-empty title', async () => {
    const onAddIssue = vi.fn().mockResolvedValue(true);
    render(<IssueInlineAdd {...defaultProps} onAddIssue={onAddIssue} />);
    const input = screen.getByPlaceholderText('Add issue and press Enter');
    fireEvent.change(input, { target: { value: 'New issue' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddIssue).toHaveBeenCalledWith('New issue', undefined);
  });

  it('does not call onAddIssue on Enter with empty title', () => {
    const onAddIssue = vi.fn();
    render(<IssueInlineAdd {...defaultProps} onAddIssue={onAddIssue} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Add issue and press Enter'), {
      key: 'Enter',
    });
    expect(onAddIssue).not.toHaveBeenCalled();
  });
});
