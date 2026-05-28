import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enNavigation from './locales/en/navigation.json';

// Import Portuguese translations
import ptBRCommon from './locales/pt-BR/common.json';
import ptBRSettings from './locales/pt-BR/settings.json';
import ptBRNavigation from './locales/pt-BR/navigation.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'pt-BR', label: 'Portuguese (BR)', nativeLabel: 'Português (BR)' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

const resources = {
  en: {
    common: enCommon,
    settings: enSettings,
    navigation: enNavigation,
  },
  'pt-BR': {
    common: ptBRCommon,
    settings: ptBRSettings,
    navigation: ptBRNavigation,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: ['common', 'settings', 'navigation'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
