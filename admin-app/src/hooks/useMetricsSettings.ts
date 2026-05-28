
import { useCallback } from 'react';
import { useWeekStartMigration } from '@/hooks/useWeekStartMigration';

export const useMetricsSettings = (
  showCurrentWeek: boolean,
  setShowCurrentWeek: (show: boolean) => void,
  highlightCurrentWeek: boolean,
  setHighlightCurrentWeek: (highlight: boolean) => void,
  updateMetricsSettings: (updates: Partial<any>) => Promise<boolean>
) => {
  const { changeWeekStartDay } = useWeekStartMigration();
  const handleShowCurrentWeekChange = useCallback((show: boolean) => {
    setShowCurrentWeek(show);
    updateMetricsSettings({ show_current_week: show });
  }, [setShowCurrentWeek, updateMetricsSettings]);

  const handleHighlightCurrentWeekChange = useCallback((highlight: boolean) => {
    setHighlightCurrentWeek(highlight);
    updateMetricsSettings({ highlight_current_week: highlight });
  }, [setHighlightCurrentWeek, updateMetricsSettings]);

  const handleWeekStartDayChange = useCallback(async (weekStartDay: 'monday' | 'sunday') => {
    await changeWeekStartDay(weekStartDay);
  }, [changeWeekStartDay]);

  return {
    handleShowCurrentWeekChange,
    handleHighlightCurrentWeekChange,
    handleWeekStartDayChange,
  };
};
