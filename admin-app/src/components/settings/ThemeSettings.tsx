import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation('settings');

  const handleThemeChange = (value: 'light' | 'dark') => {
    setTheme(value);
  };

  const getThemeIcon = (themeOption: 'light' | 'dark') => {
    return themeOption === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-semibold">{t('appearance.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('appearance.subtitle')}
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="theme-select" className="text-sm font-medium">
            {t('appearance.theme')}
          </Label>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger id="theme-select" className="w-full max-w-sm">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {getThemeIcon(theme)}
                  <span className="capitalize">
                    {theme === 'light' ? t('appearance.themeLight') : t('appearance.themeDark')}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-3">
                  <Sun className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{t('appearance.themeLight')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('appearance.themeLightDescription')}
                    </span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-3">
                  <Moon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{t('appearance.themeDark')}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('appearance.themeDarkDescription')}
                    </span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {theme === 'light' ? t('appearance.themeLightDescription') : t('appearance.themeDarkDescription')}
          </p>
        </div>
      </div>
    </div>
  );
};
