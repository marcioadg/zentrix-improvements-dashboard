import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockShowDestructiveToast, mockDismiss, mockSuccess, mockError } = vi.hoisted(() => ({
  mockShowDestructiveToast: vi.fn(),
  mockDismiss: vi.fn(),
  mockSuccess: vi.fn(),
  mockError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { dismiss: mockDismiss, success: mockSuccess, error: mockError },
}));

vi.mock('@/services/destructiveToastService', () => ({
  destructiveToastService: {
    showDestructiveToast: mockShowDestructiveToast,
  },
}));

import { toast, useDestructiveToast, useToast } from './use-toast';
import { renderHook } from '@testing-library/react';

describe('toast function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows destructive toast', () => {
    toast({ title: 'Error', description: 'Something failed', variant: 'destructive' });

    expect(mockShowDestructiveToast).toHaveBeenCalledWith('Something failed', 'Error');
  });

  it('silently filters non-destructive toasts', () => {
    toast({ title: 'Info', description: 'Some info' });

    expect(mockShowDestructiveToast).not.toHaveBeenCalled();
  });

  it('uses title as content when no description', () => {
    toast({ title: 'Error occurred', variant: 'destructive' });

    expect(mockShowDestructiveToast).toHaveBeenCalledWith('Error occurred', 'Error occurred');
  });

  it('defaults variant to "default"', () => {
    toast({ title: 'Hello' });

    expect(mockShowDestructiveToast).not.toHaveBeenCalled();
  });
});

describe('useDestructiveToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows destructive toast', () => {
    const { result } = renderHook(() => useDestructiveToast());

    result.current.toast({ description: 'Bad thing', variant: 'destructive' });

    expect(mockShowDestructiveToast).toHaveBeenCalledWith('Bad thing', undefined);
  });

  it('filters non-destructive toasts', () => {
    const { result } = renderHook(() => useDestructiveToast());

    result.current.toast({ description: 'Good thing', variant: 'default' });

    expect(mockShowDestructiveToast).not.toHaveBeenCalled();
  });

  it('dismiss calls sonner dismiss', () => {
    const { result } = renderHook(() => useDestructiveToast());

    result.current.dismiss('toast-1');

    expect(mockDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('returns empty toasts array', () => {
    const { result } = renderHook(() => useDestructiveToast());

    expect(result.current.toasts).toEqual([]);
  });
});

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows destructive toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.toast({ description: 'Error!', variant: 'destructive' });

    expect(mockShowDestructiveToast).toHaveBeenCalledWith('Error!', undefined);
  });

  it('routes success messages to sonner success toasts', () => {
    const { result } = renderHook(() => useToast());

    const successMessages = [
      'Operation success',
      'Task complete',
      'Changes saved',
      'Item created',
      'Record updated',
      'User added',
      'Entry deleted',
      'Task assigned',
      'User invited',
      'Message sent',
      'Email sent to user',
    ];

    for (const msg of successMessages) {
      result.current.toast({ description: msg });
    }

    expect(mockShowDestructiveToast).not.toHaveBeenCalled();
    expect(mockSuccess).toHaveBeenCalledTimes(successMessages.length);
  });

  it('silently blocks non-destructive non-success messages', () => {
    const { result } = renderHook(() => useToast());

    result.current.toast({ description: 'Some neutral message' });

    expect(mockShowDestructiveToast).not.toHaveBeenCalled();
  });

  it('dismiss calls sonner dismiss', () => {
    const { result } = renderHook(() => useToast());

    result.current.dismiss();

    expect(mockDismiss).toHaveBeenCalledWith(undefined);
  });
});
