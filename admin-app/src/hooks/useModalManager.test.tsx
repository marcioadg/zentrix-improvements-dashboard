import { vi, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/logger', () => ({ logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useModalManager } from './useModalManager';

const mockUser = { id: '1', full_name: 'Test User', email: 'test@test.com' } as any;
const mockTeam = { id: 't1', name: 'Team A' } as any;

describe('useModalManager', () => {
  it('has correct initial state with all modals closed and no selected user', () => {
    const { result } = renderHook(() => useModalManager());
    const state = result.current;

    expect(state.showUserProfile).toBe(false);
    expect(state.showEditName).toBe(false);
    expect(state.showEditTeam).toBe(false);
    expect(state.selectedUser).toBeNull();
  });

  it('openUserProfile sets selectedUser and showUserProfile=true', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openUserProfile(mockUser);
    });

    expect(result.current.selectedUser).toEqual(mockUser);
    expect(result.current.showUserProfile).toBe(true);
  });

  it('openEditName sets userToEdit and showEditName=true', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openEditName(mockUser);
    });

    expect(result.current.userToEdit).toEqual(mockUser);
    expect(result.current.showEditName).toBe(true);
  });

  it('openDeactivateConfirm sets deleteAction to deactivate', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openDeactivateConfirm(mockUser);
    });

    expect(result.current.deleteAction).toBe('deactivate');
  });

  it('openDeleteConfirm sets deleteAction to delete', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openDeleteConfirm(mockUser);
    });

    expect(result.current.deleteAction).toBe('delete');
  });

  it('openEditTeam sets editingTeam and showEditTeam=true', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openEditTeam(mockTeam);
    });

    expect(result.current.editingTeam).toEqual(mockTeam);
    expect(result.current.showEditTeam).toBe(true);
  });

  it('closeAllModals resets everything to initial state', () => {
    const { result } = renderHook(() => useModalManager());

    act(() => {
      result.current.openUserProfile(mockUser);
      result.current.openEditTeam(mockTeam);
    });

    act(() => {
      result.current.closeAllModals();
    });

    expect(result.current.showUserProfile).toBe(false);
    expect(result.current.showEditName).toBe(false);
    expect(result.current.showEditTeam).toBe(false);
    expect(result.current.selectedUser).toBeNull();
    expect(result.current.editingTeam).toBeNull();
  });
});
