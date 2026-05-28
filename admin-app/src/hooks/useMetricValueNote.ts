import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getDayBefore, getDayAfter } from "@/utils/localeDateUtils";
import { updateNote } from "@/services/metricOperations";
import { markCellPending, clearCellPending } from "@/hooks/useMetricsRealtime";
import { WeeklyMetricWithOwner } from "@/types/weeklyMetrics";
import { logger } from '@/utils/logger';

interface NoteRow {
  id: string;
  target_note: string | null;
  updated_at?: string;
  week_start_date?: string;
}

export function useMetricValueNote(
  metricId: string | undefined,
  teamId: string | undefined,
  weekStart: string | undefined,
  enabled: boolean = true,
  onNoteChanged?: (metricId: string, weekStart: string, note: string | null) => void,
  metric?: WeeklyMetricWithOwner,
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void
) {
  const [note, setNote] = useState<string | null>(null);
  const [hasNote, setHasNote] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing note (same pattern as useMetricCustomTarget)
  useEffect(() => {
    // ✅ CRITICAL FIX: Check enabled and required params inside useEffect (same pattern as useMetricCustomTarget)
    // This prevents unnecessary re-execution when isEnabled is recalculated with same boolean value
    if (!enabled || !metricId || !teamId || !weekStart) {
      setIsLoading(false);
      return;
    }

    // ✅ NEW: If metric prop is provided and has the note, use it instead of fetching
    // This prevents unnecessary database queries and state resets when metric object is available
    if (metric?.weeklyCustomTargets?.[weekStart]?.target_note !== undefined) {
      const noteFromMetric = metric.weeklyCustomTargets[weekStart].target_note;
      setNote(noteFromMetric);
      setHasNote(!!noteFromMetric);
      setIsLoading(false);
      return;
    }

    const fetchNote = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use flexible date matching (±1 day) to handle timezone differences
        const dayBefore = getDayBefore(weekStart!);
        const dayAfter = getDayAfter(weekStart!);
        
        const { data, error: fetchError } = await supabase
          .from("weekly_metrics")
          .select("id, target_note, updated_at, week_start_date")
          .eq("metric_id", metricId!)
          .eq("team_id", teamId!)
          .gte("week_start_date", dayBefore)
          .lte("week_start_date", dayAfter)
          .is("deleted_at", null)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (data && data.target_note) {
          setNote(data.target_note);
          setHasNote(true);
        } else {
          setNote(null);
          setHasNote(false);
        }
      } catch (err) {
        logger.error('Error fetching note:', err);
        setError(err as Error);
        setNote(null);
        setHasNote(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [metricId, teamId, weekStart, enabled, metric?.weeklyCustomTargets?.[weekStart]?.target_note]);

  // ✅ NEW: Synchronize with weeklyCustomTargets from useMetricsRealtime (same pattern as useMetricCustomTarget)
  // This removes the need for a separate Postgres Changes listener, standardizing with Custom Target behavior
  // ✅ OPTIMIZATION: Only depend on the specific cell's target_note, not the entire weeklyCustomTargets object
  // This prevents unnecessary re-executions when other cells of the same metric change
  // ✅ CRITICAL FIX: Removed 'note' from dependencies to prevent infinite loop
  // The useEffect should only react to changes in metric.weeklyCustomTargets, not to local state changes
  useEffect(() => {
    // Only sync if metric object exists and has weeklyCustomTargets
    if (!metric || !weekStart) return;
    
    const noteFromMetric = metric.weeklyCustomTargets?.[weekStart]?.target_note;
    
    // ✅ KEY FIX: Only update if:
    // 1. metric has a note value (not undefined) AND it's different from current state
    // 2. OR if metric has no note (null/undefined) but local state has a note (should clear)
    // This prevents unnecessary updates when metric object is recreated but value hasn't changed
    if (noteFromMetric !== undefined) {
      // metric has a value (could be null or string)
      // Only update if different to avoid unnecessary re-renders and state resets
      if (noteFromMetric !== note) {
        setNote(noteFromMetric);
        setHasNote(!!noteFromMetric);
      }
    } else if (note !== null) {
      // metric doesn't have this cell in weeklyCustomTargets, but local state has a note
      // This shouldn't happen normally, but if it does, preserve local state
      // Don't reset to null unless we're sure it should be null
      // (This case is handled by fetchNote useEffect above)
    }
  }, [metric?.weeklyCustomTargets?.[weekStart]?.target_note, weekStart]); // ✅ REMOVED 'note' from dependencies to prevent loop

  const save = async (newNote: string) => {
    if (!metricId || !teamId || !weekStart) {
      throw new Error("Missing required identifiers");
    }

    setIsSaving(true);

    const originalNote = note;
    const originalHasNote = hasNote;
    const trimmed = newNote.trim();

    // Optimistic update — author sees note icon fill instantly
    if (onOptimisticCellUpdate && metricId && weekStart) {
      markCellPending(metricId, weekStart);
      onOptimisticCellUpdate(metricId, weekStart, { target_note: trimmed || null });
    }
    // Also update local state immediately for the popover content
    setNote(trimmed || null);
    setHasNote(!!trimmed);

    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      let metricData: WeeklyMetricWithOwner;
      
      if (metric) {
        metricData = metric;
      } else {
        const { data: fetchedMetricData, error: metricError } = await supabase
          .from("metrics")
          .select("metric_name, owner_id, unit, target_value, target_logic, is_formula, formula_components, aggregation_type")
          .eq("id", metricId)
          .eq("team_id", teamId)
          .maybeSingle();

        if (metricError) throw metricError;
        if (!fetchedMetricData) throw new Error("Metric not found");

        metricData = {
          metric_name: fetchedMetricData.metric_name,
          owner_id: fetchedMetricData.owner_id,
          team_id: teamId,
          unit: fetchedMetricData.unit,
          target_value: fetchedMetricData.target_value,
          target_logic: fetchedMetricData.target_logic,
          is_formula: fetchedMetricData.is_formula || false,
          formula_components: fetchedMetricData.formula_components || null,
          aggregation_type: fetchedMetricData.aggregation_type || 'total'
        } as WeeklyMetricWithOwner;
      }

      await updateNote(
        metricId,
        weekStart,
        trimmed || null,
        metricData,
        userId
      );

      if (onOptimisticCellUpdate && metricId && weekStart) {
        setTimeout(() => clearCellPending(metricId, weekStart), 500);
      }

      toast({
        title: "Note saved",
        description: "Note has been updated"
      });

      if (onNoteChanged) {
        onNoteChanged(metricId, weekStart, trimmed || null);
      }
    } catch (err) {
      // Rollback both local state and shared state
      setNote(originalNote);
      setHasNote(originalHasNote);
      if (onOptimisticCellUpdate && metricId && weekStart) {
        clearCellPending(metricId, weekStart);
        onOptimisticCellUpdate(metricId, weekStart, { target_note: originalNote || null });
      }

      const detail = (err as any)?.message || 'An unexpected error occurred';
      toast({
        title: "Failed to save note",
        description: `${detail}. Please check your connection and try again.`,
        variant: "destructive"
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    note: note ?? "",
    hasNote,
    isLoading,
    isSaving,
    error,
    save,
  };
}
