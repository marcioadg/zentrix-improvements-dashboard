import * as React from "react";
import { Calendar, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { updateCustomTarget } from "@/services/metricOperations";
import { WeeklyMetricWithOwner } from "@/types/weeklyMetrics";
import { logger } from '@/utils/logger';

interface WeekTarget {
  weekStart: string;
  customValue: string;
  hasExisting: boolean;
  existingTargetNote?: string | null; // ✅ Store existing note to preserve it
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: string;
  teamId: string;
  metricName: string;
  weekStarts: string[];
  defaultTarget?: number | null;
  defaultLogic?: string | null;
  formatWeekDate: (weekStart: string) => string;
  unit: string;
  description?: string;
  displayOrder?: number | null;
  isFormula?: boolean;
  formulaComponents?: any;
  aggregationType?: string;
}

export const BulkTargetEditModal: React.FC<Props> = ({
  open,
  onOpenChange,
  metricId,
  teamId,
  metricName,
  weekStarts,
  defaultTarget,
  defaultLogic,
  formatWeekDate,
  unit,
  description,
  displayOrder,
  isFormula,
  formulaComponents,
  aggregationType,
}) => {
  const [weekTargets, setWeekTargets] = React.useState<Map<string, WeekTarget>>(new Map());
  const [isSaving, setIsSaving] = React.useState(false);
  const [ownerId, setOwnerId] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing custom targets and metric details when modal opens
  React.useEffect(() => {
    if (!open) return;

    const loadExistingTargets = async () => {
      try {
        // Get user session
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUserId = sessionData?.session?.user?.id || null;
        setUserId(currentUserId);

        // Get metric details (owner_id) from the base metric for save operations
        const { data: metricData, error: metricError } = await supabase
          .from('metrics')
          .select('owner_id')
          .eq('id', metricId)
          .single();

        if (metricError) throw metricError;
        setOwnerId(metricData.owner_id);

        // ✅ FIX: Load existing custom targets AND target_note to preserve notes when saving
        // This prevents notes from being set to null when user only edits custom target values
        const { data, error } = await supabase
          .from('weekly_metrics')
          .select('week_start_date, custom_target_value, target_note')
          .eq('metric_id', metricId)
          .in('week_start_date', weekStarts)
          .is('deleted_at', null);

        if (error) throw error;

        const newMap = new Map<string, WeekTarget>();
        weekStarts.forEach(week => {
          const existing = data?.find(d => d.week_start_date === week);
          newMap.set(week, {
            weekStart: week,
            customValue: existing?.custom_target_value?.toString() || "",
            hasExisting: !!existing && existing.custom_target_value !== null,
            existingTargetNote: existing?.target_note || null, // ✅ Store existing note
          });
        });
        setWeekTargets(newMap);
      } catch (error) {
        logger.error('Error loading custom targets:', error);
      }
    };

    loadExistingTargets();
  }, [open, metricId, teamId, metricName, weekStarts]);

  const updateWeekTarget = (weekStart: string, field: keyof WeekTarget, value: string | boolean) => {
    setWeekTargets(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(weekStart) || {
        weekStart,
        customValue: "",
        hasExisting: false,
        existingTargetNote: null,
      };
      newMap.set(weekStart, { ...existing, [field]: value });
      return newMap;
    });
  };

  const clearWeekTarget = (weekStart: string) => {
    setWeekTargets(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(weekStart);
      newMap.set(weekStart, {
        weekStart,
        customValue: "",
        hasExisting: existing?.hasExisting || false, // Preserve original hasExisting flag
        existingTargetNote: existing?.existingTargetNote || null, // Preserve existing note
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Array<{
        weekStart: string;
        value: number | null;
      }> = [];

      weekTargets.forEach((target, weekStart) => {
        if (target.customValue) {
          updates.push({
            weekStart,
            value: parseFloat(target.customValue),
          });
        } else if (target.hasExisting) {
          // Clear existing custom target
          updates.push({
            weekStart,
            value: null,
          });
        }
      });

      if (updates.length === 0) {
        toast({
          title: "No changes",
          description: "No custom targets were set",
        });
        onOpenChange(false);
        return;
      }

      // ✅ FIX: Use RPC function (same pattern as useMetricCustomTarget)
      // This eliminates race conditions and 409 Conflict errors
      // RPC uses INSERT ... ON CONFLICT DO UPDATE (atomic operation)
      if (!ownerId || !userId) {
        throw new Error("Missing required identifiers (ownerId or userId)");
      }

      const metricData: WeeklyMetricWithOwner = {
        id: metricId,
        metric_name: metricName,
        owner_id: ownerId,
        team_id: teamId,
        unit: unit,
        target_value: defaultTarget,
        target_logic: defaultLogic,
        is_formula: isFormula || false,
        formula_components: formulaComponents || null,
        aggregation_type: aggregationType || 'total',
        weeklyValues: {},
        weeklyCustomTargets: {},
      } as WeeklyMetricWithOwner;

      // Process updates using RPC (atomic, no race conditions)
      for (const update of updates) {
        // ✅ FIX: Preserve existing target_note for each week when saving custom target
        // This prevents notes from being set to null when user only edits custom target values
        const weekTarget = weekTargets.get(update.weekStart);
        const existingNote = weekTarget?.existingTargetNote ?? null;
        
        await updateCustomTarget(
          metricId,
          update.weekStart,
          update.value,
          existingNote, // Preserve existing note
          metricData,
          userId
        );
      }

      toast({
        title: "Custom targets saved",
        description: `Updated ${updates.length} week(s)`,
      });

      // Invalidate metrics query to refresh UI
      queryClient.invalidateQueries({ 
        queryKey: ['simplified-metrics'],
        refetchType: 'active'
      });

      onOpenChange(false);
    } catch (error) {
      const detail = (error as any)?.message || 'An unexpected error occurred';
      toast({
        title: "Failed to save custom targets",
        description: `${detail}. Please check your connection and try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const changedCount = Array.from(weekTargets.values()).filter(
    t => t.customValue || t.hasExisting
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Weekly Targets: {metricName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Default target: {defaultTarget !== null && defaultTarget !== undefined ? `${defaultLogic || '≥'} ${defaultTarget}` : 'None'}
          </div>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr,3fr,auto] gap-4 px-4 py-2 bg-muted/50 border-b text-sm font-medium">
            <div>Week</div>
            <div>Target Value</div>
            <div className="w-8"></div>
          </div>
          
          <ScrollArea className="h-[50vh]">
            <div className="divide-y">
              {weekStarts.map((weekStart) => {
                const target = weekTargets.get(weekStart) || {
                  weekStart,
                  customValue: "",
                  hasExisting: false,
                };

                return (
                  <div key={weekStart} className="grid grid-cols-[2fr,3fr,auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors">
                    <div className="text-sm font-medium">
                      {formatWeekDate(weekStart)}
                    </div>
                    
                    <Input
                      type="number"
                      value={target.customValue}
                      onChange={(e) => updateWeekTarget(weekStart, "customValue", e.target.value)}
                      placeholder="Enter target"
                      className="h-9"
                    />
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => clearWeekTarget(weekStart)}
                      className="h-8 w-8 p-0"
                      disabled={!target.customValue && !target.hasExisting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {changedCount > 0 ? `${changedCount} week(s) with custom targets` : 'No custom targets set'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
