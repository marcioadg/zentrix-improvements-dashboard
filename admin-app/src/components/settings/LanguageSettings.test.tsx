import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockChangeLanguage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'language.title': 'Language',
        'language.subtitle': 'Choose your language',
        'language.label': 'Display Language',
        'language.saved': 'Saved',
        'language.savedDescription': 'Language updated',
      };
      return map[key] || key;
    },
  }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ currentLanguage: 'en', changeLanguage: mockChangeLanguage }),
}));
vi.mock('@/i18n/index', () => ({
  SUPPORTED_LANGUAGES: [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'es', label: 'Spanish', nativeLabel: 'Español' },
  ],
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { LanguageSettings } from './LanguageSettings';

beforeEach(() => vi.clearAllMocks());

describe('LanguageSettings', () => {
  it('renders language settings', () => {
    render(<LanguageSettings />);
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Choose your language')).toBeInTheDocument();
  });

  it('shows current language label', () => {
    render(<LanguageSettings />);
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
