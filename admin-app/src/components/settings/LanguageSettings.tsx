import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '@/i18n/index';
import { useToast } from '@/hooks/use-toast';

export const LanguageSettings: React.FC = () => {
  const { t } = useTranslation('settings');
  const { currentLanguage, changeLanguage } = useLanguage();
  const { toast } = useToast();

  const handleLanguageChange = async (value: string) => {
    await changeLanguage(value as SupportedLanguage);
    toast({
      title: t('language.saved'),
      description: t('language.savedDescription'),
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-[16px] font-semibold">{t('language.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('language.subtitle')}
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="space-y-3">
          <Label htmlFor="language-select" className="text-sm font-medium">
            {t('language.label')}
          </Label>
          <Select value={currentLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger id="language-select" className="w-full max-w-sm">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>
                    {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nativeLabel ?? currentLanguage}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{lang.nativeLabel}</span>
                      {lang.nativeLabel !== lang.label && (
                        <span className="text-xs text-muted-foreground">{lang.label}</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
