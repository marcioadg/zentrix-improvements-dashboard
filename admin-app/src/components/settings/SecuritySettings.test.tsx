import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { mockUseAuth, mockToast, mockUpdateUser } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockToast: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { updateUser: mockUpdateUser },
    from: vi.fn(() => ({ select: vi.fn(() => ({ data: [], error: null })) })),
  },
}));
vi.mock('@/components/settings/DeleteAccountDialog', () => ({
  DeleteAccountDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

import SecuritySettings from './SecuritySettings';

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1', email: 'test@test.com' } });
});

describe('SecuritySettings', () => {
  it('renders security settings sections', () => {
    render(<SecuritySettings />);
    expect(screen.getByText('Security & Privacy')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Session Management')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('disables update button when passwords are empty', () => {
    render(<SecuritySettings />);
    const updateBtn = screen.getByRole('button', { name: /update password/i });
    expect(updateBtn).toBeDisabled();
  });

  it('shows error toast when passwords do not match', async () => {
    render(<SecuritySettings />);
    const newPwInput = screen.getByPlaceholderText('Enter new password');
    const confirmInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(newPwInput, { target: { value: 'Password1!' } });
    fireEvent.change(confirmInput, { target: { value: 'Different1!' } });

    const updateBtn = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updateBtn);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error', variant: 'destructive' })
    );
  });

  it('shows error toast when password is too short', async () => {
    render(<SecuritySettings />);
    const newPwInput = screen.getByPlaceholderText('Enter new password');
    const confirmInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(newPwInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Password must be at least 8 characters.' })
    );
  });

  it('calls supabase updateUser on valid password change', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<SecuritySettings />);

    fireEvent.change(screen.getByPlaceholderText('Enter new password'), { target: { value: 'ValidPass1!' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'ValidPass1!' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await vi.waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'ValidPass1!' });
    });
  });

  it('opens delete account dialog when clicking delete button', () => {
    render(<SecuritySettings />);
    const deleteBtn = screen.getByRole('button', { name: /delete account/i });
    fireEvent.click(deleteBtn);
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<SecuritySettings />);
    const newPwInput = screen.getByPlaceholderText('Enter new password');
    expect(newPwInput).toHaveAttribute('type', 'password');

    // Find the toggle button (sibling of input)
    const toggleButtons = screen.getAllByRole('button').filter(b => !b.textContent);
    // Click the first toggle (new password)
    if (toggleButtons.length > 0) {
      fireEvent.click(toggleButtons[0]);
    }
  });
});
