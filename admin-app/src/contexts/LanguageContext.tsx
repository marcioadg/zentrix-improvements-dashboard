import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '@/contexts/SettingsContext';
import { SupportedLanguage } from '@/i18n/index';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: SupportedLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

/**
 * LanguageProvider reads the user's language_preference from SettingsContext
 * and keeps i18next in sync. This way the language persists across sessions
 * without any client-side storage manipulation.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const { settings, updateSettings } = useSettings();

  // Sync i18next with the user's persisted preference
  useEffect(() => {
    const preferred = settings?.language_preference;
    if (preferred && preferred !== i18n.language) {
      i18n.changeLanguage(preferred);
    }
  }, [settings?.language_preference, i18n]);

  const changeLanguage = async (lang: SupportedLanguage) => {
    await i18n.changeLanguage(lang);
    await updateSettings({ language_preference: lang });
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage: i18n.language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
