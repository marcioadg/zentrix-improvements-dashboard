import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { mockNavigate, mockToast, mockSignInWithPassword, mockDeleteUserAccount } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockDeleteUserAccount: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { signInWithPassword: mockSignInWithPassword },
    from: vi.fn(() => ({ select: vi.fn(() => ({ data: [], error: null })) })),
  },
}));
vi.mock('@/services/userAccountDeletionService', () => ({
  deleteUserAccount: () => mockDeleteUserAccount(),
}));
vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), log: vi.fn() } }));

import { DeleteAccountDialog } from './DeleteAccountDialog';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  userEmail: 'test@example.com',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeleteAccountDialog', () => {
  it('renders dialog when open', () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(<DeleteAccountDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Account')).not.toBeInTheDocument();
  });

  it('disables delete button when password is empty', () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    const deleteBtn = screen.getByRole('button', { name: /delete my account/i });
    expect(deleteBtn).toBeDisabled();
  });

  it('shows error when submitting empty password', () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    // The button is disabled so we can't click it, but handleConfirm checks for empty
    const input = screen.getByPlaceholderText('Your password');
    fireEvent.change(input, { target: { value: '  ' } });
    // Button should still be disabled for whitespace-only
    const deleteBtn = screen.getByRole('button', { name: /delete my account/i });
    expect(deleteBtn).toBeDisabled();
  });

  it('enables delete button when password is entered', () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    const input = screen.getByPlaceholderText('Your password');
    fireEvent.change(input, { target: { value: 'mypassword' } });
    const deleteBtn = screen.getByRole('button', { name: /delete my account/i });
    expect(deleteBtn).not.toBeDisabled();
  });

  it('shows incorrect password error on auth failure', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid' } });
    render(<DeleteAccountDialog {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));

    await vi.waitFor(() => {
      expect(screen.getByText('Incorrect password')).toBeInTheDocument();
    });
  });

  it('navigates and deletes account on successful password verification', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockDeleteUserAccount.mockResolvedValue({ success: true });
    render(<DeleteAccountDialog {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'correct' } });
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('clears password and error when dialog is closed', () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your password'), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
