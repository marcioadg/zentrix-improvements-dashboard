
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { logRefreshTrigger } from '@/utils/refreshTelemetry';
import { clearMetricsCache } from '@/services/metricDataService';

const SUBSCRIBE_GRACE_PERIOD_MS = 5000;
const POLLING_INTERVAL_MS = 30000; // 30s fallback — realtime handles normal sync

// ✅ FIX: Track pending local updates to skip realtime events for cells being edited
// This prevents the "self-update not reflected" bug where realtime overwrites optimistic state
const pendingUpdatesRef = { current: new Set<string>() };

export const markCellPending = (metricId: string, weekStart: string) => {
  pendingUpdatesRef.current.add(`${metricId}-${weekStart}`);
};

export const clearCellPending = (metricId: string, weekStart: string) => {
  pendingUpdatesRef.current.delete(`${metricId}-${weekStart}`);
};

// ✅ FIX: Track metrics being archived to prevent duplicate state updates
// This prevents "jumping" when a metric is archived (optimistic update + realtime update)
const pendingArchivesRef = { current: new Set<string>() };

export const markMetricArchiving = (metricId: string) => {
  pendingArchivesRef.current.add(metricId);
  // Auto-clear after 2 seconds (realtime should have fired by then)
  setTimeout(() => pendingArchivesRef.current.delete(metricId), 2000);
};

// ✅ FIX: Track pending config updates to prevent realtime from overwriting optimistic state
// This prevents "self-update" issues where our own realtime event overwrites our optimistic update
const pendingConfigUpdatesRef = { current: new Set<string>() };

export const markConfigPending = (metricId: string) => {
  pendingConfigUpdatesRef.current.add(metricId);
};

export const clearConfigPending = (metricId: string) => {
  // Delay clearing to allow realtime event to be skipped
  setTimeout(() => pendingConfigUpdatesRef.current.delete(metricId), 1000);
};

// ✅ FIX: Track pending reorder to prevent polling/realtime from overwriting optimistic display_order
// When reorder is in flight, polling refetch would fetch stale DB data and revert the optimistic state
const pendingReorderRef = { current: false };

export const markReorderPending = () => {
  pendingReorderRef.current = true;
};

export const clearReorderPending = () => {
  // Delay clearing to allow realtime events from the RPC to settle
  setTimeout(() => { pendingReorderRef.current = false; }, 2000);
};

export const useMetricsRealtime = (
  teamId: string | undefined,
  metrics: WeeklyMetricWithOwner[],
  setMetrics: (metrics: WeeklyMetricWithOwner[] | ((prev: WeeklyMetricWithOwner[]) => WeeklyMetricWithOwner[])) => void,
  refetch: () => Promise<void>,
  handleRealtimeOwnershipChange?: (metricId: string, newOwnerId: string | null, newOwnerName: string) => void,
  isInMeeting?: boolean,
  additionalTeamIds?: string[]
) => {
  const { toast } = useToast();

  // 🔧 FIX: Use refs to prevent subscription loop while keeping callbacks current
  const setMetricsRef = useRef(setMetrics);
  const refetchRef = useRef(refetch);
  const handleOwnershipChangeRef = useRef(handleRealtimeOwnershipChange);
  const toastRef = useRef(toast); // ✅ FIX: Stabilize toast reference to prevent subscription loop
  const meetingRefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Polling fallback refs
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubscribedRef = useRef(false);

  // Update refs on each render
  setMetricsRef.current = setMetrics;
  refetchRef.current = refetch;
  handleOwnershipChangeRef.current = handleRealtimeOwnershipChange;
  toastRef.current = toast; // ✅ Keep toast ref updated

  const scheduleMeetingRefetch = useCallback((reason: string) => {
    if (!isInMeeting) return;

    clearMetricsCache();

    if (meetingRefetchTimeoutRef.current) {
      clearTimeout(meetingRefetchTimeoutRef.current);
    }

    meetingRefetchTimeoutRef.current = setTimeout(async () => {
      meetingRefetchTimeoutRef.current = null;
      logRefreshTrigger('meeting-metrics-realtime-refetch', { teamId, reason });

      try {
        clearMetricsCache();
        await refetchRef.current();
      } catch (error) {
        logger.error('⚠️ Meeting metrics realtime refetch failed:', error);
      }
    }, 350);
  }, [isInMeeting, teamId]);

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    // 🔍 TELEMETRY: Log when polling fallback starts (indicates realtime failure)
    logRefreshTrigger('metrics-polling-fallback-started', {
      reason: 'realtime_subscription_failed',
      teamId,
    });

    pollingIntervalRef.current = setInterval(async () => {
      // ✅ FIX: Skip polling refetch during pending reorder to prevent stale DB data from overwriting optimistic state
      if (pendingReorderRef.current) {
        return;
      }

      // 🔍 TELEMETRY: Log each polling refetch
      logRefreshTrigger('metrics-polling-refetch', {
        teamId,
        interval: POLLING_INTERVAL_MS,
      });

      // CRITICAL FIX: Add error handling to polling refetch
      // Without this, polling silently fails and user sees stale data
      try {
        await refetchRef.current();
      } catch (error) {
        logger.error('⚠️ Metrics polling refetch failed:', error);
        // Continue polling - transient failures shouldn't stop the interval
        // User will see stale data but polling will retry on next interval
      }
    }, POLLING_INTERVAL_MS);
  }, [teamId]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const handleMetricUpdate = useCallback(async (payload: any) => {

    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case 'UPDATE':
        // Handle soft-deleted metrics - remove from state immediately
        if (newRecord?.deleted_at !== null && newRecord?.deleted_at !== undefined) {
          logger.debug('Metric soft-deleted, removing from state');
          setMetricsRef.current(prev => prev.filter(metric => metric.id !== newRecord.id));
          break;
        }

        // Handle ownership changes with optimistic updates
        if (oldRecord?.owner_id !== newRecord?.owner_id && handleOwnershipChangeRef.current) {
          logger.debug('Ownership change detected, notifying optimistic handler');
          handleOwnershipChangeRef.current(
            newRecord.id,
            newRecord.owner_id,
            newRecord.owner || 'Unassigned'
          );
        }

        // Check if the metric's team changed
        if (oldRecord?.team_id !== newRecord?.team_id) {
          logger.debug('Metric team changed, triggering refetch');
          await refetchRef.current();
        } else {
          // ✅ FIX: Allow both Broadcast and Postgres Changes to work in parallel
          // Broadcast provides fast updates for subscribed clients, Postgres Changes ensures
          // reliable synchronization even if Broadcast fails. State updates are idempotent,
          // so processing the same update twice is safe.

          // ✅ Detect which field actually changed (for complete visual isolation)
          const oldCustomTarget = oldRecord?.custom_target_value;
          const newCustomTarget = newRecord?.custom_target_value;
          const oldTargetNote = oldRecord?.target_note;
          const newTargetNote = newRecord?.target_note;

          // ✅ FIX: Only consider it a "change" if at least one side has a meaningful value
          // This prevents null/undefined comparisons from triggering unnecessary updates
          // A "real change" means: the value went from something to something different (including to/from null)
          // BUT NOT: both undefined, or one undefined and one null (which are semantically equivalent)
          const normalizeValue = (v: any) => (v === undefined ? null : v);
          const customTargetChanged = normalizeValue(oldCustomTarget) !== normalizeValue(newCustomTarget);
          const targetNoteChanged = normalizeValue(oldTargetNote) !== normalizeValue(newTargetNote);
          const hasCustomTargetChange = customTargetChanged || targetNoteChanged;

          // For metric value updates, merge carefully to avoid duplicates
          setMetricsRef.current(prev => {
            // ✅ FIX: Skip realtime update if there's a pending local update for this cell
            // This prevents the "self-update not reflected" bug
            const cellKey = `${newRecord.metric_id}-${newRecord.week_start_date}`;
            if (pendingUpdatesRef.current.has(cellKey)) {
              return prev;
            }

            const existingIndex = prev.findIndex(m =>
              m.metric_name === newRecord.metric_name &&
              m.owner_id === newRecord.owner_id &&
              m.team_id === newRecord.team_id
            );



            if (existingIndex !== -1) {
              // Update existing metric
              const updated = [...prev];
              const existingMetric = updated[existingIndex];

              // ✅ CRITICAL FIX: DO NOT spread ...newRecord as it overwrites id with weekly_metrics row ID
              // The newRecord.id is the weekly_metrics table row ID, but existingMetric.id is the metrics table ID
              // React keys use metric.id, so overwriting it causes component unmount/remount, resetting all hooks
              // This is the root cause of notes disappearing when editing metric values
              const updatedMetric = {
                ...existingMetric,
                // Only update specific fields from newRecord, preserving existingMetric.id
                metric_value: newRecord.metric_value,
                updated_at: newRecord.updated_at,
                // ✅ FIX: Accept DB display_order during pending reorder to prevent stale state
                // Without this, polling refetch + stale local value = permanent revert
                display_order: pendingReorderRef.current
                  ? (newRecord.display_order ?? existingMetric.display_order)
                  : existingMetric.display_order,
                weeklyValues: {
                  ...existingMetric.weeklyValues,
                  ...(newRecord.week_start_date && newRecord.metric_value !== undefined ? {
                    [newRecord.week_start_date]: newRecord.metric_value
                  } : {})
                },
                // ✅ CRITICAL: Preserve weeklyCustomTargets - DO NOT TOUCH when metric_value changes
                // This ensures complete visual isolation - editing metric_value has ZERO visual effect on custom_target_value or target_note
                weeklyCustomTargets: { ...(existingMetric.weeklyCustomTargets || {}) }
              };

              // ✅ FIX: Repair local entries when local has null values but DB has real data
              // This fixes the bug where notes disappear when adding values to empty cells
              // The initialization layer creates { custom_target_value: null, target_note: null } for all weeks
              // So we need to check if local values are null, not just if the key exists
              const existingEntry = existingMetric.weeklyCustomTargets?.[newRecord.week_start_date];
              const localHasNoData = !existingEntry || (existingEntry.custom_target_value === null && existingEntry.target_note === null);
              const dbHasData = newRecord.custom_target_value != null || newRecord.target_note;

              if (newRecord.week_start_date && localHasNoData && dbHasData) {
                updatedMetric.weeklyCustomTargets[newRecord.week_start_date] = {
                  custom_target_value: newRecord.custom_target_value ?? null,
                  target_note: newRecord.target_note ?? null
                };
              }

              // ✅ REMOVED: No longer update weeklyCustomTargets when metric_value changes
              // When metric_value changes, we ONLY update metric_value and leave weeklyCustomTargets untouched
              // This ensures complete visual isolation - editing metric_value has ZERO visual effect on custom_target_value or target_note

              // ✅ FIX: Only update weeklyCustomTargets[weekStart] when custom_target_value or target_note actually changed
              // AND update ONLY the field that actually changed (complete visual isolation)
              if (hasCustomTargetChange && newRecord.week_start_date) {
                const existingCustomTarget = existingMetric.weeklyCustomTargets?.[newRecord.week_start_date];

                // ✅ KEY FIX: Update ONLY the field that actually changed
                // If only custom_target_value changed, preserve target_note from local state
                // If only target_note changed, preserve custom_target_value from local state
                // This ensures complete visual isolation - editing one field doesn't affect the other visually
                updatedMetric.weeklyCustomTargets = {
                  ...existingMetric.weeklyCustomTargets,
                  [newRecord.week_start_date]: {
                    // Update only if it actually changed, otherwise preserve local
                    // ✅ FIX: If local state doesn't exist, use value from database (newCustomTarget)
                    // This fixes desync issues where local state is missing but database has the value
                    custom_target_value: customTargetChanged
                      ? newCustomTarget
                      : (existingCustomTarget?.custom_target_value ?? newCustomTarget ?? null),
                    // Update only if it actually changed, otherwise preserve local
                    // ✅ FIX: If local state doesn't exist, use value from database (newTargetNote)
                    // This fixes desync issues where local state is missing but database has the value
                    target_note: targetNoteChanged
                      ? newTargetNote
                      : (existingCustomTarget?.target_note ?? newTargetNote ?? null)
                  }
                };
              }
              // If no change in custom_target_value or target_note, preserve existing weeklyCustomTargets as-is

              updated[existingIndex] = updatedMetric;

              return updated;
            } else {
              // 📡 DIAGNOSTIC: Metric not found in local state - this is why sync fails
              logger.warn('⚠️ [METRICS REALTIME] Metric NOT FOUND in local state:', {
                lookingFor: {
                  metricName: newRecord.metric_name,
                  ownerId: newRecord.owner_id,
                  teamId: newRecord.team_id
                },
                localMetricsSample: prev.slice(0, 3).map(m => ({
                  name: m.metric_name,
                  ownerId: m.owner_id,
                  teamId: m.team_id
                }))
              });
              return prev;
            }
          });
        }
        scheduleMeetingRefetch('weekly_metrics_update');
        break;

      case 'INSERT':
        if (newRecord?.deleted_at) {
          logger.debug('Ignoring INSERT for soft-deleted metric');
          break;
        }

        setMetricsRef.current(prev => {
          const existingIndex = prev.findIndex(m =>
            m.metric_name === newRecord.metric_name &&
            m.owner_id === newRecord.owner_id &&
            m.team_id === newRecord.team_id
          );

          // Metric already in local state — update its weekly values.
          // No team gate needed: multi-team metrics have a different primary team_id
          // but still appear in local state via metric_team_assignments.
          if (existingIndex !== -1) {
            const cellKey = `${newRecord.metric_id}-${newRecord.week_start_date}`;
            if (pendingUpdatesRef.current.has(cellKey)) {
              return prev;
            }

            const updated = [...prev];
            const existingMetric = updated[existingIndex];

            const mergedMetric = {
              ...existingMetric,
              weeklyValues: {
                ...(existingMetric.weeklyValues || {}),
                ...(newRecord.week_start_date ? {
                  [newRecord.week_start_date]: newRecord.metric_value
                } : {})
              }
            };

            if (newRecord.week_start_date && (newRecord.custom_target_value != null || newRecord.target_note)) {
              mergedMetric.weeklyCustomTargets = {
                ...(existingMetric.weeklyCustomTargets || {}),
                [newRecord.week_start_date]: {
                  custom_target_value: newRecord.custom_target_value ?? null,
                  target_note: newRecord.target_note ?? null
                }
              };
            }

            updated[existingIndex] = mergedMetric;
            return updated;
          }

          // Metric NOT in local state — only add if it belongs to the viewing team.
          // Events from additional team IDs for metrics not in our view are noise; ignore them.
          if (teamId && newRecord?.team_id !== teamId) {
            return prev;
          }

          const optimisticIndex = prev.findIndex(m =>
            m.id.startsWith('temp-') &&
            m.metric_name === newRecord.metric_name &&
            m.owner_id === newRecord.owner_id
          );

          if (optimisticIndex !== -1) {
            logger.debug('Replacing optimistic metric with real one');
            const updated = [...prev];
            updated[optimisticIndex] = {
              ...newRecord,
              id: newRecord.metric_id || newRecord.id,
              weeklyValues: newRecord.week_start_date ? {
                [newRecord.week_start_date]: newRecord.metric_value ?? null
              } : (updated[optimisticIndex]?.weeklyValues || {}),
            };
            return updated;
          }

          logger.debug('New metric added by another user');
          toastRef.current({
            title: "Metric Added",
            description: "A new metric was added to the team.",
          });

          return [{
            ...newRecord,
            id: newRecord.metric_id || newRecord.id,
            weeklyValues: newRecord.week_start_date ? {
              [newRecord.week_start_date]: newRecord.metric_value ?? null
            } : {},
          }, ...prev];
        });
        scheduleMeetingRefetch('weekly_metrics_insert');
        break;

      case 'DELETE':
        // Handle weekly value deletion
        if (oldRecord?.week_start_date) {
          logger.debug('Weekly value deleted, updating metric weeklyValues');

          setMetricsRef.current(prev => {
            const metricIndex = prev.findIndex(m =>
              m.metric_name === oldRecord.metric_name &&
              m.owner_id === oldRecord.owner_id &&
              m.team_id === oldRecord.team_id
            );

            if (metricIndex !== -1) {
              const updated = [...prev];
              const existingMetric = updated[metricIndex];
              const updatedWeeklyValues = { ...existingMetric.weeklyValues };
              delete updatedWeeklyValues[oldRecord.week_start_date];
              updated[metricIndex] = {
                ...existingMetric,
                weeklyValues: updatedWeeklyValues
              };
              return updated;
            } else {
              logger.debug('Could not find metric locally after DELETE, triggering refetch');
              refetchRef.current();
            }

            return prev;
          });
        } else {
          // Hard delete of entire metric (rare case)
          logger.debug('Hard delete of entire metric');
          setMetricsRef.current(prev => prev.filter(metric => metric.id !== oldRecord.id));
        }
        scheduleMeetingRefetch('weekly_metrics_delete');
        break;
    }
  }, [teamId, scheduleMeetingRefetch]); // ✅ FIX: Removed toast from deps - using toastRef now to prevent subscription loop

  // Stable serialized key so the effect only re-runs when the actual set changes
  const additionalTeamIdsKey = (additionalTeamIds || []).sort().join(',');

  useEffect(() => {
    if (!teamId) return;

    isSubscribedRef.current = false;

    const extraTeamIds = additionalTeamIdsKey ? additionalTeamIdsKey.split(',') : [];

    let channel = supabase
      .channel(`metrics-realtime-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_metrics',
          filter: `team_id=eq.${teamId}`
        },
        handleMetricUpdate
      );

    // Subscribe to weekly_metrics for each additional team ID (multi-team assigned metrics).
    // Their primary team_id differs from the viewing team, so the main listener above misses them.
    for (const tid of extraTeamIds) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_metrics',
          filter: `team_id=eq.${tid}`
        },
        handleMetricUpdate
      );
    }

    channel = channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'metrics',
          filter: `team_id=eq.${teamId}`
        },
        (payload) => {
          // Handle soft-deleted parent metrics - remove from state immediately
          if (payload.new?.deleted_at !== null && payload.new?.deleted_at !== undefined) {
            setMetricsRef.current(prev => prev.filter(metric => metric.id !== payload.new.id));
            scheduleMeetingRefetch('metric_soft_delete');
            // ✅ FIX: No immediate refetch needed - we already removed it from state
            return;
          }

          // ✅ Handle archived metrics - remove from active list immediately
          // Simplified check: if archived_at has any value, metric is archived
          if (payload.new?.archived_at) {
            const metricId = payload.new.id;

            // ✅ Skip if already processed by optimistic update (prevents double render/jumping)
            if (pendingArchivesRef.current.has(metricId)) {
              pendingArchivesRef.current.delete(metricId);
              return;
            }

            setMetricsRef.current(prev => prev.filter(metric => metric.id !== metricId));
            scheduleMeetingRefetch('metric_archived');
            return;
          }

          // ✅ Handle unarchived metrics - refetch to add back to active list
          // If new has no archived_at but old did, it was just unarchived
          if (!payload.new?.archived_at && payload.old?.archived_at) {
            scheduleMeetingRefetch('metric_unarchived');
            refetchRef.current();
            return;
          }

          // Handle configuration changes (name, owner, unit, target, etc.)
          // With REPLICA IDENTITY FULL, we get both old and new records for comparison
          const oldRecord = payload.old as Record<string, unknown> | undefined;
          const newRecord = payload.new as Record<string, unknown>;

          const hasConfigChange =
            oldRecord?.metric_name !== newRecord?.metric_name ||
            oldRecord?.owner_id !== newRecord?.owner_id ||
            oldRecord?.unit !== newRecord?.unit ||
            oldRecord?.target_value !== newRecord?.target_value ||
            oldRecord?.target_logic !== newRecord?.target_logic ||
            oldRecord?.description !== newRecord?.description ||
            oldRecord?.assistant_id !== newRecord?.assistant_id ||
            oldRecord?.is_formula !== newRecord?.is_formula ||
            oldRecord?.formula_components !== newRecord?.formula_components ||
            oldRecord?.aggregation_type !== newRecord?.aggregation_type;

          if (hasConfigChange) {
            const metricId = newRecord?.id as string;

            // ✅ Skip if this is our own pending config update (prevents overwriting optimistic state)
            if (pendingConfigUpdatesRef.current.has(metricId)) {
              return;
            }

            // ✅ OPTIMIZATION: Direct state update instead of full refetch
            // This provides instant sync for other users (~50ms vs ~300ms refetch)
            setMetricsRef.current(prev => prev.map(metric => {
              if (metric.id === metricId) {
                return {
                  ...metric,
                  metric_name: newRecord.metric_name as string,
                  owner_id: newRecord.owner_id as string,
                  unit: newRecord.unit as string,
                  target_value: newRecord.target_value as number | null,
                  target_logic: newRecord.target_logic as string | null,
                  description: newRecord.description as string | null,
                  assistant_id: newRecord.assistant_id as string | null,
                  is_formula: newRecord.is_formula as boolean,
                  formula_components: newRecord.formula_components as any[] | null,
                  aggregation_type: newRecord.aggregation_type as string,
                  updated_at: newRecord.updated_at as string,
                  // If owner changed, update owner name (will be refined by profile lookup if needed)
                  ...(newRecord.owner_id !== metric.owner_id ? { owner: 'Loading...' } : {})
                };
              }
              return metric;
            }));

            // If owner changed, refetch to get the new owner's profile name
            if (oldRecord?.owner_id !== newRecord?.owner_id) {
              refetchRef.current();
            }

            scheduleMeetingRefetch('metric_config_update');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          stopPolling(); // Realtime is healthy, stop any polling

          // Clear grace period timeout if still pending
          if (graceTimeoutRef.current) {
            clearTimeout(graceTimeoutRef.current);
            graceTimeoutRef.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // ✅ FIX: Only treat actual errors as failures, not CLOSED (which is normal cleanup)
          logger.error('❌ [METRICS REALTIME] Subscription failed:', status, 'for team:', teamId);
          isSubscribedRef.current = false;
          startPolling(); // Fallback to polling
        } else if (status === 'CLOSED') {
          isSubscribedRef.current = false;
        }
      });

    // Grace period: if not subscribed within 3s, start polling
    graceTimeoutRef.current = setTimeout(() => {
      if (!isSubscribedRef.current) {
        startPolling();
      }
    }, SUBSCRIBE_GRACE_PERIOD_MS);

    return () => {
      // Cleanup on unmount
      stopPolling();

      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current);
        graceTimeoutRef.current = null;
      }

      if (meetingRefetchTimeoutRef.current) {
        clearTimeout(meetingRefetchTimeoutRef.current);
        meetingRefetchTimeoutRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [teamId, handleMetricUpdate, startPolling, stopPolling, additionalTeamIdsKey, scheduleMeetingRefetch]);
};
