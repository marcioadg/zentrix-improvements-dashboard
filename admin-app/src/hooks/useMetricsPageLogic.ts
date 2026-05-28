
import { useState, useCallback } from 'react';
import { UserSettings } from '@/hooks/useUserSettings';

export const useMetricsPageLogic = (userSettings: UserSettings) => {
  const [timePeriod, setTimePeriod] = useState('last_13_weeks');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | undefined>(undefined);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [managementMode, setManagementMode] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showCurrentWeek, setShowCurrentWeek] = useState(userSettings?.show_current_week || false);
  const [highlightCurrentWeek, setHighlightCurrentWeek] = useState(userSettings?.highlight_current_week || false);
  const [showAddMetricModal, setShowAddMetricModal] = useState(false);

  const clearAllTransientState = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setSelectedMetrics([]);
  }, []);

  return {
    timePeriod,
    setTimePeriod,
    customRange,
    setCustomRange,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    managementMode,
    setManagementMode,
    selectedMetrics,
    setSelectedMetrics,
    searchText,
    setSearchText,
    showCurrentWeek,
    setShowCurrentWeek,
    highlightCurrentWeek,
    setHighlightCurrentWeek,
    showAddMetricModal,
    setShowAddMetricModal,
    clearAllTransientState,
  };
};
