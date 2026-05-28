import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUploadAvatar = vi.fn();
const mockRemoveAvatar = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { id: 'u1', full_name: 'John Doe', email: 'john@test.com', avatar_url: '' },
    loading: false,
  }),
}));
vi.mock('@/hooks/useProfileOperations', () => ({
  useProfileOperations: () => ({
    uploadAvatar: mockUploadAvatar,
    removeAvatar: mockRemoveAvatar,
    updateProfile: mockUpdateProfile,
    uploading: false,
  }),
}));
vi.mock('@/components/UserAvatar', () => ({
  UserAvatar: () => <div data-testid="user-avatar" />,
}));
vi.mock('@/components/modals/ChangePasswordModal', () => ({
  ChangePasswordModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="password-modal">Password Modal</div> : null,
}));
vi.mock('@/components/modals/ChangeEmailModal', () => ({
  ChangeEmailModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="email-modal">Email Modal</div> : null,
}));

import { ProfileSettings } from './ProfileSettings';

beforeEach(() => vi.clearAllMocks());

describe('ProfileSettings', () => {
  it('renders profile settings with user info', () => {
    render(<ProfileSettings />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument();
  });

  it('renders avatar section with upload button', () => {
    render(<ProfileSettings />);
    expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('disables update button when name unchanged', () => {
    render(<ProfileSettings />);
    const updateBtn = screen.getByRole('button', { name: /update/i });
    expect(updateBtn).toBeDisabled();
  });

  it('enables update button when name changes', () => {
    render(<ProfileSettings />);
    const input = screen.getByDisplayValue('John Doe');
    fireEvent.change(input, { target: { value: 'Jane Doe' } });
    const updateBtn = screen.getByRole('button', { name: /update/i });
    expect(updateBtn).not.toBeDisabled();
  });

  it('calls updateProfile when update button clicked', async () => {
    render(<ProfileSettings />);
    const input = screen.getByDisplayValue('John Doe');
    fireEvent.change(input, { target: { value: 'Jane Doe' } });
    fireEvent.click(screen.getByRole('button', { name: /update/i }));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ full_name: 'Jane Doe' });
  });

  it('opens change password modal', () => {
    render(<ProfileSettings />);
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(screen.getByTestId('password-modal')).toBeInTheDocument();
  });

  it('opens change email modal', () => {
    render(<ProfileSettings />);
    fireEvent.click(screen.getByRole('button', { name: /change email/i }));
    expect(screen.getByTestId('email-modal')).toBeInTheDocument();
  });
});
