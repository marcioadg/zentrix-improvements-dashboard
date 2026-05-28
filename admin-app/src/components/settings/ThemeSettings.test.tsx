import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockSetTheme = vi.fn();

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', setTheme: mockSetTheme }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'appearance.title': 'Appearance',
        'appearance.subtitle': 'Customize your theme',
        'appearance.theme': 'Theme',
        'appearance.themeLight': 'Light',
        'appearance.themeDark': 'Dark',
        'appearance.themeLightDescription': 'Light mode description',
        'appearance.themeDarkDescription': 'Dark mode description',
      };
      return map[key] || key;
    },
  }),
}));

import { ThemeSettings } from './ThemeSettings';

beforeEach(() => vi.clearAllMocks());

describe('ThemeSettings', () => {
  it('renders theme settings section', () => {
    render(<ThemeSettings />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Customize your theme')).toBeInTheDocument();
  });

  it('shows current theme label', () => {
    render(<ThemeSettings />);
    expect(screen.getByText('Light')).toBeInTheDocument();
  });

  it('shows theme description for current theme', () => {
    render(<ThemeSettings />);
    expect(screen.getByText('Light mode description')).toBeInTheDocument();
  });
});
