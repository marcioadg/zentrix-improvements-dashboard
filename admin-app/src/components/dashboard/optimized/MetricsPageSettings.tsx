
import { useCallback } from 'react';
import { UserSettings } from '@/hooks/useUserSettings';
import { useWeekStartMigration } from '@/hooks/useWeekStartMigration';

export const useMetricsPageSettings = (
  userSettings: UserSettings,
  updateMetricsSettings: (updates: Partial<UserSettings>) => Promise<boolean>
) => {
  const { changeWeekStartDay } = useWeekStartMigration();
  const handleShowCurrentWeekChange = useCallback((show: boolean) => {
    updateMetricsSettings({ show_current_week: show });
  }, [updateMetricsSettings]);

  const handleHighlightCurrentWeekChange = useCallback((highlight: boolean) => {
    updateMetricsSettings({ highlight_current_week: highlight });
  }, [updateMetricsSettings]);

  const handleWeekStartDayChange = useCallback(async (weekStartDay: 'monday' | 'sunday') => {
    await changeWeekStartDay(weekStartDay);
  }, [changeWeekStartDay]);

  return {
    showCurrentWeek: userSettings?.show_current_week || false,
    highlightCurrentWeek: userSettings?.highlight_current_week || false,
    handleShowCurrentWeekChange,
    handleHighlightCurrentWeekChange,
    handleWeekStartDayChange,
  };
};
