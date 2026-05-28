import { useEffect } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { applyThemeColor, THEME_STORAGE_KEY, THEME_COLORS } from '@/lib/themeColors';

/**
 * Syncs theme_color from DB to localStorage and applies it.
 * Until auth resolves, localStorage fallback is used (set in main.tsx via initTheme).
 * Once settings load, DB value takes priority.
 */
export const ThemeColorSync: React.FC = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.theme_color && THEME_COLORS.some((c) => c.name === settings.theme_color)) {
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme_color);
      applyThemeColor(settings.theme_color);
    }
  }, [settings?.theme_color]);

  return null;
};
