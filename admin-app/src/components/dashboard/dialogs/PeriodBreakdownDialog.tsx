import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { QuickTargetEditDialog } from '@/components/metrics/QuickTargetEditDialog';
import { logger } from '@/utils/logger';

interface PeriodBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  metricName: string;
  unit: string;
  weeklyBreakdown: Array<{
    weekStart: string;
    value: number | null;
  }>;
  formatValue: (value: number | null, unit: string) => string;
  formatWeekDate: (weekStart: string) => string;
  getValueColor: (value: number | null, metric: any, weekStart?: string) => string;
  metric: any;
  // Editing functionality
  allowEditing?: boolean;
  onSaveWeekValue?: (metricId: string, weekStart: string, newValue: number | null) => Promise<void>;
  metricId?: string;
}

export const PeriodBreakdownDialog: React.FC<PeriodBreakdownDialogProps> = ({
  open,
  onOpenChange,
  periodLabel,
  metricName,
  unit,
  weeklyBreakdown,
  formatValue,
  formatWeekDate,
  getValueColor,
  metric,
  allowEditing = false,
  onSaveWeekValue,
  metricId,
}) => {
  const { toast } = useToast();
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [targetEditWeek, setTargetEditWeek] = useState<string | null>(null);
  
  // Handle dialog close with auto-save
  const handleDialogClose = async (newOpen: boolean) => {
    if (!newOpen && editingWeek && (allowEditing && onSaveWeekValue && metricId)) {
      // Auto-save if there's an ongoing edit
      try {
        const parsedValue = editValue.trim() === '' ? null : parseFloat(editValue);
        
        if (editValue.trim() !== '' && (isNaN(parsedValue!) || !isFinite(parsedValue!))) {
          toast({
            title: "Invalid Value",
            description: "Please enter a valid number",
            variant: "destructive"
          });
          return; // Don't close dialog if validation fails
        }
        
        await onSaveWeekValue(metricId, editingWeek, parsedValue);
        setEditingWeek(null);
        setEditValue('');
        onOpenChange(false);
      } catch (error) {
        logger.error('Failed to save week value:', error);
        toast({
          title: "Save Failed",
          description: "Failed to save the value. Please try again.",
          variant: "destructive"
        });
        return; // Don't close dialog if save fails
      }
    } else {
      onOpenChange(newOpen);
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-semibold">
            {metricName} - {periodLabel}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Weekly values that make up this period:
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {weeklyBreakdown.map((week, index) => {
              const displayValue = week.value !== null && week.value !== undefined 
                ? formatValue(week.value, unit) 
                : '-';
              const valueColor = week.value !== null && week.value !== undefined 
                ? getValueColor(week.value, metric, week.weekStart) 
                : '';
              
              // Check if this week has a custom target value
              const hasCustomTarget = metric.weeklyCustomTargets?.[week.weekStart]?.custom_target_value !== null && 
                                      metric.weeklyCustomTargets?.[week.weekStart]?.custom_target_value !== undefined;
              
              const isEditing = editingWeek === week.weekStart;
              
              const handleClick = () => {
                if (!allowEditing || !onSaveWeekValue || !metricId) return;
                setEditingWeek(week.weekStart);
                setEditValue(week.value !== null ? String(week.value) : '');
              };
              
              const handleSave = async () => {
                if (!onSaveWeekValue || !metricId) return;
                
                try {
                  const parsedValue = editValue.trim() === '' ? null : parseFloat(editValue);
                  
                  if (editValue.trim() !== '' && (isNaN(parsedValue!) || !isFinite(parsedValue!))) {
                    toast({
                      title: "Invalid Value",
                      description: "Please enter a valid number",
                      variant: "destructive"
                    });
                    return;
                  }
                  
                  await onSaveWeekValue(metricId, week.weekStart, parsedValue);
                  setEditingWeek(null);
                  setEditValue('');
                } catch (error) {
                  logger.error('Failed to save week value:', error);
                  toast({
                    title: "Save Failed",
                    description: "Failed to save the value. Please try again.",
                    variant: "destructive"
                  });
                }
              };
              
              const handleCancel = () => {
                setEditingWeek(null);
                setEditValue('');
              };
              
              const handleKeyDown = (e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancel();
                }
              };
              
              return (
                <div
                  key={week.weekStart}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                    {formatWeekDate(week.weekStart)}
                  </span>
                  
                  {isEditing ? (
                    <Input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSave}
                      className="min-w-[80px] max-w-[80px] text-center text-sm h-8"
                      placeholder="0"
                      autoFocus
                    />
                  ) : (
                    <div
                      className={cn(
                        "relative group/breakdown-cell px-3 py-2 rounded transition-colors min-w-[80px] text-center text-sm font-medium",
                        "border-2 border-transparent",
                        allowEditing && "cursor-pointer hover:border-primary/20",
                        valueColor
                      )}
                      style={{
                        boxShadow: 'inset 0 0 0 1px hsl(var(--border))'
                      }}
                      onClick={handleClick}
                      title={allowEditing ? "Click to edit" : undefined}
                    >
                      <div 
                        className={`absolute top-1 left-1 z-10 cursor-pointer hover:scale-110 transition-all ${
                          hasCustomTarget ? '' : 'opacity-0 group-hover/breakdown-cell:opacity-100'
                        }`}
                        title={hasCustomTarget ? "Custom target set - Click to edit" : "Click to set custom target"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetEditWeek(week.weekStart);
                        }}
                      >
                        <Star className={`h-3 w-3 transition-colors ${
                          hasCustomTarget
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-muted-foreground fill-none'
                        }`} />
                      </div>
                      {displayValue}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {weeklyBreakdown.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No weekly data available for this period.
            </p>
          )}
        </div>
      </DialogContent>

      {targetEditWeek && (
        <QuickTargetEditDialog
          open={!!targetEditWeek}
          onOpenChange={(open) => !open && setTargetEditWeek(null)}
          metricId={metricId || ''}
          metricName={metricName}
          ownerId={metric.owner_id}
          teamId={metric.team_id}
          weekStart={targetEditWeek}
          currentCustomTarget={metric.weeklyCustomTargets?.[targetEditWeek]?.custom_target_value}
          defaultTarget={metric.target_value}
          defaultLogic={metric.target_logic}
          formatWeekDate={formatWeekDate}
          unit={metric.unit}
          description={metric.description}
          displayOrder={metric.display_order}
          isFormula={metric.is_formula}
          formulaComponents={metric.formula_components}
          aggregationType={metric.aggregation_type}
        />
      )}
    </Dialog>
  );
};