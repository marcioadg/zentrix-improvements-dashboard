import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), log: vi.fn(), debug: vi.fn() } }));

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow();
  });

  it('defaults to light theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('light');
  });

  it('changes theme to dark with setTheme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('loads theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe('dark');
  });

  it('actualTheme matches theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.actualTheme).toBe(result.current.theme);

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.actualTheme).toBe('dark');
  });
});
