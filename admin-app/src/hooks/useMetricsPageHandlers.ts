
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UserSettings } from '@/hooks/useUserSettings';
import { logger } from '@/utils/logger';

interface UseMetricsPageHandlersProps {
  addMetric: (metricData: any) => Promise<void>;
  setShowAddMetricModal: (show: boolean) => void;
  setSelectedTeam: (teamId: string) => void;
  clearAllTransientState: () => void;
  setTimePeriod: (period: string) => void;
  updateMetricsSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  showCurrentWeek: boolean;
  setShowCurrentWeek: (show: boolean) => void;
  highlightCurrentWeek: boolean;
  setHighlightCurrentWeek: (highlight: boolean) => void;
}

export const useMetricsPageHandlers = ({
  addMetric,
  setShowAddMetricModal,
  setSelectedTeam,
  clearAllTransientState,
  setTimePeriod,
  updateMetricsSettings,
  showCurrentWeek,
  setShowCurrentWeek,
  highlightCurrentWeek,
  setHighlightCurrentWeek,
}: UseMetricsPageHandlersProps) => {
  const { toast } = useToast();

  const handleAddMetric = useCallback(async (metricData: any) => {
    try {
      await addMetric(metricData);
      toast({
        title: "Metric Added",
        description: `${metricData.metric_name} has been added successfully.`,
      });
      setShowAddMetricModal(false);
    } catch (error) {
      logger.error('Error adding metric:', error);
      toast({
        title: "Error",
        description: "Failed to add metric. Please try again.",
        variant: "destructive",
      });
    }
  }, [addMetric, toast, setShowAddMetricModal]);

  const handleOpenAddMetricModal = useCallback(() => {
    setShowAddMetricModal(true);
  }, [setShowAddMetricModal]);

  const handleCloseAddMetricModal = useCallback((open: boolean) => {
    setShowAddMetricModal(open);
  }, [setShowAddMetricModal]);

  const handleTeamChange = useCallback((teamId: string) => {
    clearAllTransientState();
    setSelectedTeam(teamId);
  }, [clearAllTransientState, setSelectedTeam]);

  const handleTimePeriodChange = useCallback((newTimePeriod: string) => {
    clearAllTransientState();
    setTimePeriod(newTimePeriod);
  }, [clearAllTransientState, setTimePeriod]);

  const handleShowCurrentWeekChange = useCallback(async (show: boolean) => {
    setShowCurrentWeek(show);
    await updateMetricsSettings({ show_current_week: show });
  }, [setShowCurrentWeek, updateMetricsSettings]);

  const handleHighlightCurrentWeekChange = useCallback(async (highlight: boolean) => {
    setHighlightCurrentWeek(highlight);
    await updateMetricsSettings({ highlight_current_week: highlight });
  }, [setHighlightCurrentWeek, updateMetricsSettings]);

  return {
    handleAddMetric,
    handleOpenAddMetricModal,
    handleCloseAddMetricModal,
    handleTeamChange,
    handleTimePeriodChange,
    handleShowCurrentWeekChange,
    handleHighlightCurrentWeekChange,
  };
};
