import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWeeklyMetrics } from '@/hooks/useWeeklyMetrics';
import { useConsolidatedOwnership } from '@/hooks/useConsolidatedOwnership';
import { useMetricsCellEditing } from '@/hooks/useMetricsCellEditing';
import { useMetricsPageHandlers } from '@/components/dashboard/optimized/MetricsPageHandlers';
import { useWeekStartMigration } from '@/hooks/useWeekStartMigration';
import { useMetricReorderBroadcast } from '@/hooks/meeting/useMetricReorderBroadcast';
import { logger } from '@/utils/logger';
import { clearMetricsCache } from '@/services/metricDataService';
import { MetricsFiltersRow } from '@/components/dashboard/MetricsFiltersRow';
import { WeeklyMetricsTable } from '@/components/dashboard/WeeklyMetricsTable';
import { MetricConfigurationModal } from '@/components/modals/MetricConfigurationModal';
import { MetricsManagementToolbar } from '@/components/dashboard/MetricsManagementToolbar';
import { MetricManagementModal } from '@/components/modals/MetricManagementModal';
import { AddMetricModal } from '@/components/modals/AddMetricModal';
import { MetricsExportButton } from '@/components/dashboard/MetricsExportButton';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentWeekStart, formatDateRange } from '@/lib/dateUtils';
import { fetchArchivedMetricsData } from '@/services/metricDataService';
import { useAuth } from '@/contexts/AuthContext';
import { unarchiveMetric } from '@/services/metricOperations';
import { markMetricArchiving } from '@/hooks/useMetricsRealtime';
import { Eye, EyeOff, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOwnerInitials } from '@/utils/metricUtils';

interface ConsolidatedMetricsPageContentProps {
  teams: any[];
  selectedTeam: string;
  setSelectedTeam: (teamId: string) => void;
  userSettings: any;
  updateMetricsSettings: (settings: any) => Promise<void>;
  settingsLoading: boolean;
  onCreateIssue?: (title: string, description: string, ownerId?: string) => Promise<void>;
  isInMeeting?: boolean;
  initialShowAddMetric?: boolean;
}

export const ConsolidatedMetricsPageContent: React.FC<ConsolidatedMetricsPageContentProps> = React.memo(({
  teams,
  selectedTeam,
  setSelectedTeam,
  userSettings,
  updateMetricsSettings,
  settingsLoading,
  onCreateIssue,
  isInMeeting = false,
  initialShowAddMetric = false,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [configMetric, setConfigMetric] = useState<WeeklyMetricWithOwner | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showMetricManagementModal, setShowMetricManagementModal] = useState(false);
  const [showAddMetricModal, setShowAddMetricModal] = useState(initialShowAddMetric);

  // Time period state management
  const [timePeriod, setTimePeriod] = useState<string>('last_13_weeks');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [periodGrouping, setPeriodGrouping] = useState<string>('weekly');
  
  // Owner filter state with stable hook
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('all');
  
  // Search filter state
  const [searchText, setSearchText] = useState<string>('');
  
  // Archived metrics state
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [archivedMetrics, setArchivedMetrics] = useState<WeeklyMetricWithOwner[]>([]);
  const [loadingArchived, setLoadingArchived] = useState<boolean>(false);

  // Clear transient state when selectedTeam actually changes (company/team switch)
  React.useEffect(() => {
    setSelectedMetrics([]);
    setEditingCell(null);
    setEditValue('');
    setConfigMetric(null);
    setShowConfigModal(false);
    setShowMetricManagementModal(false);
    setShowAddMetricModal(false);
    setSelectedOwnerId('all');
    setSearchText('');
    setShowArchived(false);
    setArchivedMetrics([]);
  }, [selectedTeam]);

  // Get metrics data with dynamic time period
  // ✅ SIMPLIFIED: No broadcast callback - Postgres Changes handles sync via useMetricsRealtime
  // isInMeeting → refetchOnMount:'always' in useSimplifiedMetrics, so section remounts always get fresh data
  const metricsResult = useWeeklyMetrics(selectedTeam, timePeriod, customDateRange || undefined, undefined, isInMeeting);
  const {
    metrics: rawMetrics = [],
    setMetrics,
    loading,
    error,
    updateMetric,
    updateMetricConfiguration,
    addMetric,
    removeMetric,
    bulkRemoveMetrics,
    reorderMetrics,
    deleteMetricFromAllTeams,
    getLast13WeeksStartDates,
    formatWeekDate,
    getValueColor,
    formatValue,
    weekStartDay,
    refetch
  } = metricsResult || {};

  // Create ref for refetch to avoid "used before declaration" error in useEffect
  const refetchRef = useRef<(() => Promise<void>) | undefined>(undefined);
  if (refetch) {
    refetchRef.current = refetch;
  }
  React.useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Stable toast ref — keeps toast out of all dependency arrays
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Fetch archived metrics when showArchived is true
  React.useEffect(() => {
    if (showArchived && selectedTeam && user?.id) {
      setLoadingArchived(true);
      
      if (!getLast13WeeksStartDates) {
        setLoadingArchived(false);
        return;
      }
      
      fetchArchivedMetricsData(
        user.id, 
        selectedTeam,
        timePeriod,
        customDateRange || undefined,
        getLast13WeeksStartDates
      )
        .then(setArchivedMetrics)
        .catch(error => {
          logger.error('Error fetching archived metrics:', error);
          toastRef.current({
            title: "Error",
            description: "Failed to load archived metrics.",
            variant: "destructive",
          });
        })
        .finally(() => setLoadingArchived(false));
    } else {
      setArchivedMetrics(prev => prev.length === 0 ? prev : []);
    }
  }, [showArchived, selectedTeam, user, timePeriod, customDateRange, getLast13WeeksStartDates]);

  // ✅ OPTIMIZATION: Removed duplicate real-time subscription
  // useMetricsRealtime hook (called via useWeeklyMetrics → useSimplifiedMetrics) already handles:
  // - INSERT/UPDATE/DELETE events on weekly_metrics table
  // - Soft-delete detection, archiving, ownership changes
  // - Configuration changes on parent metrics table
  // Having a duplicate subscription here caused WebSocket overhead and cascading re-renders

  // Add migration hook with proper refetch callback
  const { isMigrating, changeWeekStartDay } = useWeekStartMigration(async () => {
    if (refetch) {
      await refetch();
    }
  });

  // Time period change handlers
  const handlePeriodChange = useCallback((period: string) => {
    setTimePeriod(period);
  }, []);

  const handleDateRangeChange = useCallback((range: { start: Date; end: Date } | null) => {
    setCustomDateRange(range);
  }, []);

  const handlePeriodGroupingChange = useCallback((grouping: string) => {
    setPeriodGrouping(grouping);
  }, []);

  // Owner filter change handler
  const handleOwnerChange = useCallback((ownerId: string) => {
    setSelectedOwnerId(ownerId);
  }, []);

  // Enhanced issue creation handler with duplicate prevention
  const handleCreateIssue = useCallback(async (title: string, description: string, ownerId?: string) => {
    // If a custom onCreateIssue handler is provided (e.g., from meeting context), use it
    if (onCreateIssue) {
      logger.debug('ConsolidatedMetricsPageContent: Using custom issue creation handler (meeting context)');
      return await onCreateIssue(title, description, ownerId);
    }

    // Otherwise, use the default issue creation logic
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        logger.error('❌ ConsolidatedMetricsPageContent: Authentication error:', userError);
        toast({
          title: "Authentication required",
          description: "Please sign in to create issues.",
          variant: "destructive"
        });
        return;
      }

      // Create the new issue with correct owner
      if (!user?.id) {
        toast({
          title: "Error",
          description: "User not authenticated. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('issues')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          issue_type: 'short_term',
          team_id: selectedTeam,
          owner_id: ownerId || user.id, // Use metric owner if provided, otherwise current user
          created_by: user.id,
          status: 'open',
          archived: false
        });

      if (error) throw error;
      
      toastRef.current({
        title: "Issue Created",
        description: `Created issue: ${title.trim()}`,
      });
      
      logger.debug('ConsolidatedMetricsPageContent: Issue created successfully');
      
    } catch (error) {
      logger.error('❌ ConsolidatedMetricsPageContent: Failed to create issue:', error);
      toastRef.current({
        title: "Error",
        description: "Failed to create issue",
        variant: "destructive",
      });
    }
  }, [selectedTeam, onCreateIssue]);

  // Handle unarchive (refetchRef is already declared above)
  const handleUnarchive = useCallback(async (metricId: string) => {
    if (!user?.id) return; // Safety check
    
    try {
      await unarchiveMetric(metricId);
      toastRef.current({
        title: "Metric Unarchived",
        description: "The metric has been restored and is now visible.",
      });
      // Refresh both active and archived metrics using ref to avoid linter issues
      if (refetchRef.current) await refetchRef.current();
      if (showArchived && selectedTeam && user.id && getLast13WeeksStartDates) {
        // Get week start dates function
        const getWeekStartDates = () => {
          try {
            if (!getLast13WeeksStartDates) return [];
            return getLast13WeeksStartDates();
          } catch (err) {
            logger.error('Error getting week starts for archived metrics:', err);
            return [];
          }
        };
        
        const updated = await fetchArchivedMetricsData(
          user.id, 
          selectedTeam,
          timePeriod,
          customDateRange || undefined,
          getWeekStartDates
        );
        setArchivedMetrics(updated);
      }
    } catch (error) {
      logger.error('Failed to unarchive metric:', error);
      toastRef.current({
        title: "Error",
        description: "Failed to unarchive metric. Please try again.",
        variant: "destructive",
      });
    }
  }, [showArchived, selectedTeam, user, timePeriod, customDateRange, getLast13WeeksStartDates]); // Added dependencies
  
  const ownershipRefreshCallback = useCallback(async () => {
    if (refetchRef.current) {
      clearMetricsCache();
      await refetchRef.current();
    }
  }, []);

  // Optimistic patch for custom target / note — mirrors the cell value pattern
  const patchCellOptimistic = useCallback((
    metricId: string,
    weekStart: string,
    patch: { custom_target_value?: number | null; target_note?: string | null }
  ) => {
    setMetrics(prev => prev.map(m => {
      if (m.id !== metricId) return m;
      const existing = m.weeklyCustomTargets?.[weekStart] ?? { custom_target_value: null, target_note: null };
      return {
        ...m,
        weeklyCustomTargets: {
          ...(m.weeklyCustomTargets ?? {}),
          [weekStart]: {
            custom_target_value: 'custom_target_value' in patch ? (patch.custom_target_value ?? null) : existing.custom_target_value,
            target_note: 'target_note' in patch ? (patch.target_note ?? null) : existing.target_note,
          }
        }
      };
    }));
  }, [setMetrics]);

  // Initialize optimistic ownership management with refresh callback
  const { handleOwnershipChange, applyOwnershipChanges, isMetricSyncing } = useConsolidatedOwnership(
    updateMetricConfiguration,
    ownershipRefreshCallback
  );

  // Handle remote metric reorder broadcasts from other meeting participants
  const handleRemoteMetricReorder = useCallback((metricIds: string[], displayOrders: number[]) => {
    logger.debug('📡 Handling remote metric reorder:', { metricIds, displayOrders });
    
    setMetrics(prevMetrics => {
      const updatedMetrics = prevMetrics.map(metric => {
        const affectedIndex = metricIds.indexOf(metric.id);
        if (affectedIndex !== -1) {
          return { ...metric, display_order: displayOrders[affectedIndex] };
        }
        return metric;
      });
      return updatedMetrics;
    });
  }, [setMetrics]);

  // Setup real-time broadcast for metric reordering (same pattern as goals)
  const { publishReorder: publishMetricReorder } = useMetricReorderBroadcast(
    selectedTeam,
    handleRemoteMetricReorder
  );

  // ✅ SIMPLIFIED: All metric cell sync (value, custom_target, note) is now handled by
  // Postgres Changes via useMetricsRealtime. No broadcast layer needed.
  // This provides guaranteed consistency from the database as single source of truth.

  // Wrap reorderMetrics to also broadcast to other participants (reorder still uses broadcast)
  const reorderMetricsWithBroadcast = useCallback(async (metricIds: string[], displayOrders: number[]) => {
    // Call original reorder (handles optimistic update + DB persist)
    await reorderMetrics(metricIds, displayOrders);
    
    // Broadcast to other meeting participants
    publishMetricReorder(metricIds, displayOrders);
  }, [reorderMetrics, publishMetricReorder]);

  // Apply optimistic changes to metrics before rendering - stabilized to prevent infinite loops
  const displayMetrics = useMemo(() => {
    const result = applyOwnershipChanges(rawMetrics);
    logger.debug('displayMetrics calculation:', {
      rawMetricsCount: rawMetrics.length,
      displayMetricsCount: result.length,
      sampleRawMetric: rawMetrics[0],
      sampleDisplayMetric: result[0]
    });
    return result;
  }, [rawMetrics, applyOwnershipChanges]);

  // Debug displayMetrics changes
  React.useEffect(() => {
    logger.debug('DisplayMetrics updated:', {
      count: displayMetrics.length,
      sampleMetrics: displayMetrics.slice(0, 2).map(m => ({ name: m.metric_name, id: m.id })),
      timestamp: Date.now()
    });
  }, [displayMetrics]);

  // Enhanced filtering with defensive logic and logging  
  const filteredMetrics = useMemo(() => {
    let filtered = displayMetrics.filter(metric => !metric.archived);
    
    // Apply owner filter if a specific owner is selected
    if (selectedOwnerId !== 'all') {
      const beforeCount = filtered.length;
      filtered = filtered.filter(metric => metric.owner_id === selectedOwnerId);
      
      // Log filtering results for debugging
      logger.debug('OwnerFilter applied:', {
        selectedOwnerId,
        beforeFilter: beforeCount,
        afterFilter: filtered.length,
        totalMetrics: displayMetrics.length,
        ownerExists: displayMetrics.some(m => m.owner_id === selectedOwnerId)
      });
      
      // If no metrics match the selected owner, log a warning
      if (filtered.length === 0 && beforeCount > 0) {
        logger.warn('⚠️ OwnerFilter: No metrics found for selected owner', {
          selectedOwnerId,
          availableOwnerIds: [...new Set(displayMetrics.map(m => m.owner_id).filter(Boolean))]
        });
      }
    }
    
    // Apply search filter (metric name only)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(metric => 
        metric.metric_name.toLowerCase().includes(searchLower)
      );
      
      logger.debug('SearchFilter applied:', {
        searchText,
        filteredCount: filtered.length
      });
    }
    
    return filtered;
  }, [displayMetrics, selectedOwnerId, searchText]);

  // Debug filteredMetrics changes
  React.useEffect(() => {
    logger.debug('FilteredMetrics updated:', {
      count: filteredMetrics.length,
      selectedOwnerId,
      sampleMetrics: filteredMetrics.slice(0, 2).map(m => ({ name: m.metric_name, id: m.id })),
      timestamp: Date.now()
    });
  }, [filteredMetrics, selectedOwnerId]);

  // Get all weeks for data fetching (always includes current week)
  const allWeeksForFetch = useMemo(() => {
    try {
      if (!getLast13WeeksStartDates) return [];
      return getLast13WeeksStartDates();
    } catch (err) {
      logger.error('Error getting all week starts:', err);
      return [];
    }
  }, [getLast13WeeksStartDates]);

  // Get weeks for display (may exclude current week based on user setting)
  const weekStarts = useMemo(() => {
    try {
      const showCurrentWeek = userSettings?.show_current_week;
      
      // If showing current week, use all weeks; otherwise remove the first (newest) week
      const displayWeeks = showCurrentWeek ? allWeeksForFetch : allWeeksForFetch.slice(1);
      
      logger.debug('📅 Week filtering:', {
        totalWeeks: allWeeksForFetch.length,
        displayWeeks: displayWeeks.length,
        showCurrentWeek,
        currentWeekHidden: !showCurrentWeek && allWeeksForFetch.length > displayWeeks.length
      });
      
      return displayWeeks;
    } catch (err) {
      logger.error('Error filtering week starts:', err);
      return allWeeksForFetch;
    }
  }, [allWeeksForFetch, userSettings?.show_current_week])

  // Process period grouping for aggregated columns
  const { processedWeekStarts, processedMetrics, highlightedPeriod, periodMapping } = useMemo(() => {
    if (periodGrouping === 'weekly') {
      return { 
        processedWeekStarts: weekStarts, 
        processedMetrics: displayMetrics,
        highlightedPeriod: undefined,
        periodMapping: undefined
      };
    }

    const periodSize = periodGrouping === '4-week' ? 4 : 13;
    const groupedWeeks: string[][] = [];
    const periodLabels: string[] = [];

    // Rolling period grouping from newest weeks

    // For rolling 4-week periods, start with newest weeks and go back
    // weekStarts is already in newest-first order, so use it directly
    for (let i = 0; i < weekStarts.length; i += periodSize) {
      const periodWeeks = weekStarts.slice(i, i + periodSize);
      
      // For 4-week grouping, only include complete 4-week periods
      if (periodGrouping === '4-week' && periodWeeks.length < periodSize) {
        break; // Skip incomplete periods at the end (oldest weeks)
      }
      
      if (periodWeeks.length > 0) {
        // Validate that we have valid week start dates
        const newestWeekStart = periodWeeks[0];
        const oldestWeekStart = periodWeeks[periodWeeks.length - 1];
        
        if (!newestWeekStart || !oldestWeekStart) {
          logger.warn('Invalid period weeks detected:', { newestWeekStart, oldestWeekStart, periodWeeks });
          continue; // Skip this period
        }
        
        groupedWeeks.push(periodWeeks);
        
        // Create period label - formatDateRange will handle adding 6 days for the full week
        try {
          const periodLabel = formatDateRange(oldestWeekStart, newestWeekStart);
          periodLabels.push(periodLabel);
        } catch (error) {
          logger.error('Error creating period label:', error, { newestWeekStart, oldestWeekStart });
          periodLabels.push('Error');
        }
      }
    }

    // No need to reverse since we're already working in newest-first order

    // Validate that we have data to aggregate
    if (displayMetrics.length === 0) {
      logger.warn('⚠️ No displayMetrics available for aggregation');
      return {
        processedWeekStarts: periodLabels,
        processedMetrics: [],
        highlightedPeriod: undefined,
        periodMapping: {}
      };
    }

    const hasAnyWeeklyData = displayMetrics.some(m => Object.keys(m.weeklyValues || {}).length > 0);
    if (!hasAnyWeeklyData) {
      logger.warn('⚠️ displayMetrics have NO weekly data - cannot aggregate', {
        metricsCount: displayMetrics.length,
        sampleMetric: displayMetrics[0]
      });
    }

    // Process metrics to aggregate values for each period
    const aggregatedMetrics = displayMetrics.map(metric => {
      const newWeeklyValues: { [key: string]: number | null } = {};
      const aggregatedCustomTargets: { [key: string]: number | null } = {};
      
      groupedWeeks.forEach((periodWeeks, periodIndex) => {
        const periodLabel = periodLabels[periodIndex];
        // ✅ SAFETY: Use optional chaining to handle undefined weeklyValues (newly created metrics)
        const periodValues = periodWeeks.map(week => metric.weeklyValues?.[week] ?? null).filter(v => v != null);
        
        // Aggregate values
        if (periodValues.length > 0) {
          const aggregationType = metric.aggregation_type || 'total';
          let aggregatedValue: number;
          
          if (aggregationType === 'average') {
            aggregatedValue = periodValues.reduce((sum, val) => sum + (val || 0), 0) / periodValues.length;
          } else {
            aggregatedValue = periodValues.reduce((sum, val) => sum + (val || 0), 0);
          }
          
          newWeeklyValues[periodLabel] = aggregatedValue;
        } else {
          newWeeklyValues[periodLabel] = null;
        }

        // Aggregate targets (CRITICAL FIX: Use custom weekly targets if they exist)
        const aggregationType = metric.aggregation_type || 'total';
        let periodTargetSum = 0;
        let targetWeeksCount = 0;

        periodWeeks.forEach(week => {
          let weekTarget = metric.target_value; // Start with global target
          
          // Check if this week has a custom target value
          if (metric.weeklyCustomTargets?.[week]?.custom_target_value !== null && 
              metric.weeklyCustomTargets?.[week]?.custom_target_value !== undefined) {
            weekTarget = metric.weeklyCustomTargets[week].custom_target_value;
          }
          
          // Only count weeks that have a target set
          if (weekTarget !== null && weekTarget !== undefined) {
            periodTargetSum += weekTarget;
            targetWeeksCount++;
          }
        });

        // Calculate aggregated target based on aggregation type
        if (targetWeeksCount > 0) {
          if (aggregationType === 'average') {
            aggregatedCustomTargets[periodLabel] = periodTargetSum / targetWeeksCount;
          } else {
            aggregatedCustomTargets[periodLabel] = periodTargetSum;
          }
        } else {
          aggregatedCustomTargets[periodLabel] = null;
        }
      });

      // For grouped views, use aggregated custom targets instead of adjusted target
      return {
        ...metric,
        weeklyValues: newWeeklyValues,
        originalWeeklyValues: metric.weeklyValues,
        aggregatedCustomTargets, // Store aggregated targets for grouped periods
        // Keep adjusted_target_value for backward compatibility, but prioritize aggregatedCustomTargets
        adjusted_target_value: metric.target_value ? 
          (metric.aggregation_type === 'total' ? metric.target_value * periodSize : metric.target_value) : 
          null
      };
    });

    logger.debug('🎯 AFTER AGGREGATION - aggregatedMetrics check:', {
      periodGrouping,
      periodSize,
      originalWeeksCount: weekStarts.length,
      groupedPeriodsCount: groupedWeeks.length,
      periodLabels,
      groupedWeeks: groupedWeeks.map((weeks, i) => ({ period: i, weeks: weeks.length })),
      aggregatedMetricsCount: aggregatedMetrics.length,
      sampleMetric: aggregatedMetrics[0]?.metric_name,
      sampleWeeklyValues: aggregatedMetrics[0]?.weeklyValues,
      sampleWeeklyValuesKeys: Object.keys(aggregatedMetrics[0]?.weeklyValues || {}),
      sampleAggregatedCustomTargets: aggregatedMetrics[0]?.aggregatedCustomTargets,
      hasAggregatedData: Object.keys(aggregatedMetrics[0]?.weeklyValues || {}).length > 0
    });

    // Calculate highlighted period for grouped views
    let highlightedPeriod: string | undefined;
    if (periodGrouping !== 'weekly' && userSettings?.highlight_current_week) {
      const currentWeekStart = getCurrentWeekStart(weekStartDay);
      
      // Find which period contains the current week
      const periodIndex = groupedWeeks.findIndex(periodWeeks => 
        periodWeeks.includes(currentWeekStart)
      );
      
      if (periodIndex !== -1) {
        highlightedPeriod = periodLabels[periodIndex];
        logger.debug('Found current week period:', {
          currentWeekStart,
          periodIndex,
          highlightedPeriod,
          periodWeeks: groupedWeeks[periodIndex]
        });
      } else {
        // If current week not found, highlight the most recent period
        highlightedPeriod = periodLabels[0];
        logger.debug('Current week not in periods, highlighting most recent:', {
          currentWeekStart,
          highlightedPeriod
        });
      }
    }

    // Create period mapping for chart components
    const periodMapping: { [periodLabel: string]: string[] } = {};
    periodLabels.forEach((label, index) => {
      periodMapping[label] = groupedWeeks[index];
    });

    return { 
      processedWeekStarts: periodLabels, 
      processedMetrics: aggregatedMetrics,
      highlightedPeriod,
      periodMapping 
    };
  }, [weekStarts, displayMetrics, periodGrouping]); // Removed formatWeekDate dependency

  // Apply the same filtering logic to processed metrics for grouped views
  const filteredProcessedMetrics = useMemo(() => {
    let filtered = processedMetrics.filter(metric => !metric.archived);
    
    // Apply owner filter if a specific owner is selected
    if (selectedOwnerId !== 'all') {
      filtered = filtered.filter(metric => metric.owner_id === selectedOwnerId);
    }
    
    // Apply search filter (metric name only)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(metric => 
        metric.metric_name.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [processedMetrics, selectedOwnerId, searchText]);

  // Choose the appropriate metrics dataset for the table
  const metricsForTable = useMemo(() => {
    const selected = periodGrouping === 'weekly' ? filteredMetrics : filteredProcessedMetrics;
    
    logger.debug('📊 METRICS FOR TABLE:', {
      periodGrouping,
      selectedSource: periodGrouping === 'weekly' ? 'filteredMetrics' : 'filteredProcessedMetrics',
      metricsCount: selected.length,
      sampleMetric: selected[0]?.metric_name,
      sampleWeeklyValues: selected[0]?.weeklyValues,
      sampleWeeklyValuesKeys: Object.keys(selected[0]?.weeklyValues || {}),
      hasData: selected.some(m => Object.keys(m.weeklyValues || {}).length > 0)
    });
    
    return selected;
  }, [periodGrouping, filteredMetrics, filteredProcessedMetrics]);

  // Safe wrapper for formatWeekDate that handles both ISO dates and pre-formatted period labels
  const safeFormatWeekDate = useCallback((weekStart: string) => {
    // If it's already a formatted period label (contains " - " with month names), return as-is
    if (weekStart.includes(' - ') && /[A-Za-z]/.test(weekStart)) {
      return weekStart;
    }
    // Otherwise, it's an ISO date string, format it normally
    return formatWeekDate(weekStart);
  }, [formatWeekDate]);

  // Cell editing hook - no broadcast needed, Postgres Changes handles sync via useMetricsRealtime
  const cellEditingHandlers = useMetricsCellEditing(
    editingCell,
    editValue,
    setEditingCell,
    setEditValue,
    updateMetric
  );

  // Wrapper to prevent editing in grouped views
  const wrappedCellEdit = useCallback((metricId: string, weekStart: string, currentValue: number | null) => {
    const isGroupedView = periodGrouping !== 'weekly';
    
    if (isGroupedView) {
      toastRef.current({
        title: "Editing disabled in aggregated views",
        description: "Switch to Weekly view to edit metric values",
      });
      return;
    }
    
    cellEditingHandlers.handleCellEdit(metricId, weekStart, currentValue);
  }, [periodGrouping, cellEditingHandlers.handleCellEdit]);

  const openMetricConfigModal = useCallback((metric: WeeklyMetricWithOwner) => {
    setConfigMetric(metric);
    setShowConfigModal(true);
  }, []);

  const pageHandlers = useMetricsPageHandlers(
    updateMetric,
    removeMetric,
    bulkRemoveMetrics,
    updateMetricConfiguration,
    editingCell,
    editValue,
    setEditingCell,
    setEditValue,
    selectedMetrics,
    setSelectedMetrics,
    displayMetrics,
    setMetrics,
    openMetricConfigModal,
    refetch
  );

  const handleCloseConfigModal = useCallback(() => {
    setShowConfigModal(false);
    setConfigMetric(null);
  }, []);

  // Enhanced save handler with NON-BLOCKING save pattern
  // Modal closes immediately, save happens in background, Postgres Changes handles sync
  const handleSaveConfigModal = useCallback(async (config: any) => {
    if (!configMetric) return;

    // Handle archive action - optimistically remove from local state immediately
    if (config.action === 'archive') {
      const archivedMetricId = configMetric.id;
      // ✅ FIX: Mark as pending to prevent duplicate removal from realtime listener
      markMetricArchiving(archivedMetricId);
      // Optimistically remove from local state for instant UI feedback
      setMetrics((prev: WeeklyMetricWithOwner[]) => 
        prev.filter(m => m.id !== archivedMetricId)
      );
      handleCloseConfigModal();
      return;
    }
    
    // Handle delete actions - close modal, delete in background
    if (config.action === 'delete_from_team') {
      handleCloseConfigModal();
      removeMetric(configMetric.id).catch(err => {
        logger.error('Delete from team failed:', err);
        toastRef.current({ title: "Error", description: "Failed to delete metric", variant: "destructive" });
      });
      return;
    }
    
    if (config.action === 'delete_from_all_teams') {
      handleCloseConfigModal();
      deleteMetricFromAllTeams(configMetric.metric_name, configMetric.owner_id).catch(err => {
        logger.error('Delete from all teams failed:', err);
        toastRef.current({ title: "Error", description: "Failed to delete metric from all teams", variant: "destructive" });
      });
      return;
    }
    
    const metricId = configMetric.id;
    const metricName = config.metric_name;
    handleCloseConfigModal();
    
    updateMetricConfiguration(metricId, config)
      .then(() => {
        toastRef.current({ title: "Metric Updated", description: `${metricName} has been updated.` });
      })
      .catch(err => {
        logger.error('❌ Failed to save metric config:', err);
        toastRef.current({ title: "Error", description: "Failed to update metric. Please try again.", variant: "destructive" });
      });
  }, [configMetric?.id, configMetric?.metric_name, configMetric?.owner_id, updateMetricConfiguration, removeMetric, deleteMetricFromAllTeams, handleCloseConfigModal]);

  // Handler for adding a single metric via AddMetricModal
  const handleAddMetric = useCallback(async (metricData: {
    metric_name: string;
    unit: string;
    target_value: number;
    target_logic?: string;
    owner_id: string;
    assistant_id?: string | null;
    team_id?: string;
    is_formula?: boolean;
    formula_components?: any[];
    aggregation_type?: string;
  }) => {
    logger.debug('ConsolidatedMetricsPageContent: Adding single metric via AddMetricModal', metricData);

    try {
      await addMetric({
        ...metricData,
        team_id: selectedTeam // Ensure we use the current selected team
      });

      // The addMetric function already handles the UI update optimistically
      // and performs the refetch, so no need to duplicate here
      logger.debug('ConsolidatedMetricsPageContent: Metric creation completed');

      toastRef.current({
        title: "Success",
        description: `Added metric: ${metricData.metric_name}`,
      });

      setShowAddMetricModal(false);
      logger.debug('ConsolidatedMetricsPageContent: Single metric added successfully');
    } catch (error) {
      logger.error('❌ ConsolidatedMetricsPageContent: Failed to add single metric:', error);
      toastRef.current({
        title: "Error",
        description: "Failed to add metric",
        variant: "destructive",
      });
      throw error;
    }
  }, [addMetric, selectedTeam]);

  const handleMetricsChanged = useCallback((targetTeamIds: string[]) => {
    // The modal already wrote to the DB via bulk helpers; refetch if the currently
    // viewed team was affected so the grid picks up new assignments / copies.
    if (targetTeamIds.includes(selectedTeam)) {
      refetch();
    }
  }, [selectedTeam, refetch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Error loading metrics: {error}</p>
          <button
            onClick={() => refetch?.()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-[5px] hover:bg-primary/90 transition-colors duration-150"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 sm:space-y-6">
      <div className="w-full">
        <MetricsFiltersRow
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamSelect={setSelectedTeam}
          timePeriod={timePeriod}
          onTimePeriodChange={handlePeriodChange}
          customDateRange={customDateRange}
          onDateRangeChange={handleDateRangeChange}
          periodGrouping={periodGrouping}
          onPeriodGroupingChange={handlePeriodGroupingChange}
          userSettings={userSettings}
          onSettingsUpdate={updateMetricsSettings}
          onWeekStartDayChange={changeWeekStartDay}
          settingsLoading={settingsLoading}
          onOpenMetricManagement={() => setShowMetricManagementModal(true)}
          metrics={metricsForTable}
          selectedOwnerId={selectedOwnerId}
          onOwnerChange={handleOwnerChange}
          teamName={teams.find(t => t.id === selectedTeam)?.name || 'Team'}
          weekStarts={processedWeekStarts}
          formatWeekDate={safeFormatWeekDate}
          formatValue={formatValue}
          getValueColor={getValueColor}
          searchText={searchText}
          onSearchChange={setSearchText}
          showArchived={showArchived}
          onShowArchivedChange={setShowArchived}
          archivedCount={archivedMetrics.length}
        />
      </div>

      {/* Mobile-responsive table wrapper */}
      <div className="w-full overflow-x-auto flex-1 min-h-0 flex flex-col">
        <div className="-mx-4 sm:mx-0 px-4 sm:px-0 flex-1 min-h-0 flex flex-col">
          <div className="min-w-full flex-1 min-h-0 flex flex-col [&>div]:!max-h-none [&>div]:flex-1 [&>div]:min-h-0">
            <WeeklyMetricsTable
              filteredMetrics={metricsForTable}
              weekStarts={processedWeekStarts}
              weeklyWeekStarts={weekStarts}
              editingCell={editingCell}
              editValue={editValue}
              onCellEdit={wrappedCellEdit}
              onCellSave={cellEditingHandlers.handleCellSave}
              onCellCancel={cellEditingHandlers.handleCellCancel}
              onEditValueChange={cellEditingHandlers.handleEditValueChange}
              onMetricConfiguration={pageHandlers.handleMetricConfiguration}
              formatValue={formatValue}
              formatWeekDate={safeFormatWeekDate}
              getValueColor={getValueColor}
              getOwnerInitials={getOwnerInitials}
              selectedTeam={selectedTeam}
              showCurrentWeek={userSettings?.show_current_week || false}
              highlightCurrentWeek={userSettings?.highlight_current_week || false}
              overrideHighlightedWeek={periodGrouping !== 'weekly' ? highlightedPeriod : undefined}
              weekStartDay={weekStartDay}
              managementMode={false}
              selectedMetrics={selectedMetrics}
              onMetricSelect={pageHandlers.handleMetricSelect}
              onSelectAll={pageHandlers.handleSelectAll}
              onDeleteMetric={pageHandlers.handleDeleteMetric}
              optimisticOwnershipHandler={handleOwnershipChange}
              isMetricSyncing={isMetricSyncing}
              onCreateIssue={handleCreateIssue}
              onReorderMetrics={reorderMetricsWithBroadcast}
              periodMapping={periodMapping}
              onAddMetric={() => setShowAddMetricModal(true)}
              updateMetricDirect={updateMetric}
              onOptimisticCellUpdate={patchCellOptimistic}
              archivedMetrics={showArchived ? archivedMetrics : []}
              onUnarchiveMetric={handleUnarchive}
            />
          </div>
        </div>
      </div>

      {showConfigModal && configMetric && (
        <MetricConfigurationModal
          metric={configMetric}
          open={showConfigModal}
          onOpenChange={handleCloseConfigModal}
          onSave={handleSaveConfigModal}
          teamId={selectedTeam}
        />
      )}

      {showAddMetricModal && (
        <AddMetricModal
          open={showAddMetricModal}
          onOpenChange={setShowAddMetricModal}
          onAdd={handleAddMetric}
          defaultTeamId={selectedTeam}
        />
      )}

      {showMetricManagementModal && (
        <MetricManagementModal
          open={showMetricManagementModal}
          onOpenChange={setShowMetricManagementModal}
          onMetricsChanged={handleMetricsChanged}
          teams={teams}
        />
      )}
    </div>
  );
});
