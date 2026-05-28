import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { updateCustomTarget, updateCustomTargetOnly } from '@/services/metricOperations';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';
import { markCellPending, clearCellPending } from '@/hooks/useMetricsRealtime';
import { logger } from '@/utils/logger';

interface CustomTarget {
  custom_target_value: number | null;
  target_note: string | null;
}

export const useMetricCustomTarget = (
  metricId: string,
  teamId: string,
  weekStart: string,
  enabled: boolean = true,
  onCustomTargetChanged?: (metricId: string, weekStart: string, customTargetValue: number | null, targetNote: string | null) => void,
  metric?: WeeklyMetricWithOwner
) => {
  const [customTarget, setCustomTarget] = useState<CustomTarget | null>(null);
  const [hasCustomTarget, setHasCustomTarget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ✅ FIX: Short-circuit fetch if metric object already has this cell's data
  // This eliminates fetch/sync ping-pong that caused flickering
  useEffect(() => {
    if (!enabled || !metricId || !teamId || !weekStart) {
      setIsLoading(false);
      return;
    }

    // ✅ SHORT-CIRCUIT: If metric prop has data for this cell, use it directly
    const cellData = metric?.weeklyCustomTargets?.[weekStart];
    if (cellData !== undefined) {
      const hasValue = cellData.custom_target_value != null;
      const hasNote = !!cellData.target_note;
      
      if (hasValue || hasNote) {
        setCustomTarget({
          custom_target_value: cellData.custom_target_value ?? null,
          target_note: cellData.target_note ?? null
        });
        setHasCustomTarget(hasValue);
      } else {
        setCustomTarget(null);
        setHasCustomTarget(false);
      }
      setIsLoading(false);
      return;
    }

    const fetchCustomTarget = async () => {
      try {
        const { data, error } = await supabase
          .from('weekly_metrics')
          .select('custom_target_value, target_note')
          .eq('metric_id', metricId)
          .eq('team_id', teamId)
          .eq('week_start_date', weekStart)
          .is('deleted_at', null)
          .maybeSingle();

        if (error) throw error;

        // ✅ FIX: Accept notes-only cells (previously dropped if custom_target_value was null)
        if (data && (data.custom_target_value != null || data.target_note)) {
          setCustomTarget({
            custom_target_value: data.custom_target_value ?? null,
            target_note: data.target_note ?? null
          });
          // hasCustomTarget only true when custom_target_value exists
          setHasCustomTarget(data.custom_target_value != null);
        } else {
          setCustomTarget(null);
          setHasCustomTarget(false);
        }
      } catch (error) {
        logger.error('Error fetching custom target:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomTarget();
  }, [metricId, teamId, weekStart, enabled, metric?.weeklyCustomTargets]);

  // ✅ NEW: Synchronize with weeklyCustomTargets from useMetricsRealtime (same pattern as useMetricValueNote)
  // This ensures state local always reflects state global, preventing desynchronization
  // ✅ OPTIMIZATION: Only depend on the specific cell's custom_target_value and target_note, not the entire weeklyCustomTargets object
  // This prevents unnecessary re-executions when other cells of the same metric change
  // ✅ FIX: Removed customTarget from dependencies to prevent infinite loop - we only react to metric prop changes
  useEffect(() => {
    if (!metric || !weekStart) return;
    
    const cellData = metric.weeklyCustomTargets?.[weekStart];
    if (cellData?.custom_target_value !== undefined || cellData?.target_note !== undefined) {
      const newCustomTarget = {
        custom_target_value: cellData?.custom_target_value ?? null,
        target_note: cellData?.target_note ?? null
      };
      
      // Update local state to match metric prop (metric prop is source of truth)
      setCustomTarget(prev => {
        // Only update if actually different to prevent unnecessary re-renders
        if (prev?.custom_target_value !== newCustomTarget.custom_target_value ||
            prev?.target_note !== newCustomTarget.target_note) {
          return newCustomTarget;
        }
        return prev;
      });
      setHasCustomTarget(cellData?.custom_target_value != null);
    }
  }, [metric?.weeklyCustomTargets?.[weekStart]?.custom_target_value, metric?.weeklyCustomTargets?.[weekStart]?.target_note, weekStart]);

  const save = async (
    customTargetValue: number | null,
    targetNote: string | null
  ) => {
    setIsSaving(true);
    
    const originalCustomTarget = customTarget;
    const originalHasCustomTarget = hasCustomTarget;
    
    markCellPending(metricId, weekStart);

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

      await updateCustomTarget(
        metricId,
        weekStart,
        customTargetValue,
        targetNote,
        metricData,
        userId
      );

      setCustomTarget({
        custom_target_value: customTargetValue,
        target_note: targetNote
      });
      setHasCustomTarget(customTargetValue !== null);

      setTimeout(() => clearCellPending(metricId, weekStart), 2000);

      toast({
        title: "Custom target saved",
        description: "Weekly target has been updated"
      });

      if (onCustomTargetChanged) {
        onCustomTargetChanged(metricId, weekStart, customTargetValue, targetNote);
      }
    } catch (error) {
      clearCellPending(metricId, weekStart);
      setCustomTarget(originalCustomTarget);
      setHasCustomTarget(originalHasCustomTarget);
      
      const detail = (error as any)?.message || 'An unexpected error occurred';
      toast({
        title: "Failed to save custom target",
        description: `${detail}. Please check your connection and try again.`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const saveTargetOnly = async (customTargetValue: number | null) => {
    setIsSaving(true);
    
    const originalCustomTarget = customTarget;
    const originalHasCustomTarget = hasCustomTarget;
    
    markCellPending(metricId, weekStart);

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

      await updateCustomTargetOnly(
        metricId,
        weekStart,
        customTargetValue,
        metricData,
        userId
      );

      setCustomTarget(prev => ({
        custom_target_value: customTargetValue,
        target_note: prev?.target_note ?? null
      }));
      setHasCustomTarget(customTargetValue !== null);

      setTimeout(() => clearCellPending(metricId, weekStart), 2000);

      toast({
        title: "Custom target saved",
        description: "Weekly target has been updated"
      });

      if (onCustomTargetChanged) {
        onCustomTargetChanged(metricId, weekStart, customTargetValue, customTarget?.target_note ?? null);
      }
    } catch (error) {
      clearCellPending(metricId, weekStart);
      setCustomTarget(originalCustomTarget);
      setHasCustomTarget(originalHasCustomTarget);
      
      const detail = (error as any)?.message || 'An unexpected error occurred';
      toast({
        title: "Failed to save custom target",
        description: `${detail}. Please check your connection and try again.`,
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Clear custom target (using RPC, same pattern as save)
  const clear = async () => {
    // Use save with null values (same pattern as metric value deletion)
    await save(null, null);
  };

  return {
    customTarget,
    hasCustomTarget,
    isLoading,
    isSaving,
    save,
    saveTargetOnly,
    clear
  };
};
