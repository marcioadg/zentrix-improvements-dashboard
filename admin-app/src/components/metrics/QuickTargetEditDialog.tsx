import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { updateCustomTarget } from '@/services/metricOperations';
import { markCellPending, clearCellPending } from '@/hooks/useMetricsRealtime';
import { WeeklyMetricWithOwner } from '@/types/weeklyMetrics';

interface QuickTargetEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: string;
  metricName: string;
  ownerId: string;
  teamId: string;
  weekStart: string;
  currentCustomTarget?: number | null;
  currentTargetNote?: string | null;
  defaultTarget?: number | null;
  defaultLogic?: string | null;
  formatWeekDate: (weekStart: string) => string;
  unit: string;
  description?: string;
  displayOrder?: number | null;
  isFormula?: boolean;
  formulaComponents?: any;
  aggregationType?: string;
  onOptimisticCellUpdate?: (metricId: string, weekStart: string, patch: { custom_target_value?: number | null; target_note?: string | null }) => void;
}

export const QuickTargetEditDialog: React.FC<QuickTargetEditDialogProps> = ({
  open,
  onOpenChange,
  metricId,
  metricName,
  ownerId,
  teamId,
  weekStart,
  currentCustomTarget,
  currentTargetNote = null,
  defaultTarget,
  defaultLogic,
  formatWeekDate,
  unit,
  description,
  displayOrder,
  isFormula,
  formulaComponents,
  aggregationType,
  onOptimisticCellUpdate,
}) => {
  const [targetValue, setTargetValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setTargetValue(currentCustomTarget?.toString() || '');
      supabase.auth.getSession().then(({ data: sessionData }) => {
        setUserId(sessionData?.session?.user?.id || null);
      }).catch((err) => {
        logger.error('Failed to load session for target edit:', err);
      });
    }
  }, [open, currentCustomTarget]);

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const value = targetValue.trim() === '' ? null : parseFloat(targetValue);

    // Optimistic update — author sees the star fill instantly
    if (onOptimisticCellUpdate) {
      markCellPending(metricId, weekStart);
      onOptimisticCellUpdate(metricId, weekStart, { custom_target_value: value });
    }

    try {
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

      await updateCustomTarget(metricId, weekStart, value, currentTargetNote, metricData, userId);

      if (onOptimisticCellUpdate) {
        setTimeout(() => clearCellPending(metricId, weekStart), 500);
      }

      toast({
        title: 'Target updated',
        description: value === null ? 'Custom target removed' : `Custom target set to ${value}`,
      });

      onOpenChange(false);
    } catch (error) {
      // Rollback optimistic update
      if (onOptimisticCellUpdate) {
        clearCellPending(metricId, weekStart);
        onOptimisticCellUpdate(metricId, weekStart, { custom_target_value: currentCustomTarget ?? null });
      }
      const detail = (error as any)?.message || 'An unexpected error occurred';
      toast({
        title: 'Failed to save custom target',
        description: `${detail}. Please check your connection and try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setTargetValue('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Custom Target for {formatWeekDate(weekStart)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Target Value
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Enter target value"
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  } else if (e.key === 'Escape') {
                    onOpenChange(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={!targetValue}
                className="px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
            <div className="font-medium mb-1">Default Target</div>
            <div>
              {defaultTarget !== null && defaultTarget !== undefined 
                ? `${defaultLogic || '≥'} ${defaultTarget}` 
                : 'None set'}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
