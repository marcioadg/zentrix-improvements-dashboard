import React, { useState, useEffect } from 'react';
import { MobileBaseModal } from './MobileBaseModal';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CheckCircle2, XCircle, Minus, Plus, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Goal } from '@/hooks/useMobileGoals';
import { useMobileGoalUpdate } from '@/hooks/useMobileGoalUpdate';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface Milestone {
  id: string;
  title: string;
  progress: number | null;
  due_date: string | null;
}

interface MobileGoalStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onSuccess?: () => void;
}

const statusOptions = [
  {
    value: 'on_track',
    label: 'On Track',
    icon: CheckCircle2,
    color: 'text-[var(--success)] dark:text-[var(--success)]',
    bgColor: 'bg-[var(--success)]/10'
  },
  {
    value: 'off_track',
    label: 'Off Track',
    icon: XCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10'
  },
  {
    value: 'complete',
    label: 'Complete',
    icon: CheckCircle2,
    color: 'text-[var(--active)]',
    bgColor: 'bg-[var(--active)]/10'
  },
  {
    value: 'canceled',
    label: 'Canceled',
    icon: XCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  }
];

export const MobileGoalStatusModal: React.FC<MobileGoalStatusModalProps> = ({
  open,
  onOpenChange,
  goal,
  onSuccess
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneProgress, setMilestoneProgress] = useState<Record<string, number>>({});
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [showMilestones, setShowMilestones] = useState(true);
  const { updateGoalStatus, isUpdating } = useMobileGoalUpdate();

  const hasMilestones = milestones.length > 0;

  const calculatedProgress = hasMilestones
    ? Math.round(
        Object.values(milestoneProgress).reduce((sum, val) => sum + val, 0) / milestones.length
      )
    : progress;

  useEffect(() => {
    if (goal && open) {
      setProgress(goal.progress || 0);
      setSelectedStatus(null);
      fetchMilestones(goal.id);
    }
  }, [goal, open]);

  const fetchMilestones = async (goalId: string) => {
    setLoadingMilestones(true);
    try {
      const { data, error } = await supabase
        .from('goal_milestones')
        .select('id, title, progress, due_date')
        .eq('goal_id', goalId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const fetchedMilestones = data || [];
      setMilestones(fetchedMilestones);
      
      const initialProgress: Record<string, number> = {};
      fetchedMilestones.forEach(m => {
        initialProgress[m.id] = m.progress ?? 0;
      });
      setMilestoneProgress(initialProgress);
    } catch (err) {
      logger.error('Failed to fetch milestones:', err);
    } finally {
      setLoadingMilestones(false);
    }
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus(status);
    if (status === 'complete') {
      setProgress(100);
      const updated: Record<string, number> = {};
      milestones.forEach(m => {
        updated[m.id] = 100;
      });
      setMilestoneProgress(updated);
    }
  };

  const handleProgressChange = (value: number[]) => {
    setProgress(value[0]);
  };

  const adjustProgress = (delta: number) => {
    setProgress(prev => Math.max(0, Math.min(100, prev + delta)));
  };

  const handleMilestoneProgressChange = (milestoneId: string, value: number[]) => {
    setMilestoneProgress(prev => ({ ...prev, [milestoneId]: value[0] }));
  };

  const adjustMilestoneProgress = (milestoneId: string, delta: number) => {
    setMilestoneProgress(prev => ({
      ...prev,
      [milestoneId]: Math.max(0, Math.min(100, (prev[milestoneId] || 0) + delta))
    }));
  };

  const handleSave = async () => {
    if (!goal) return;

    const statusToUpdate = selectedStatus || goal.status;
    const progressToUpdate = hasMilestones ? calculatedProgress : progress;
    
    const success = await updateGoalStatus(
      goal.id,
      statusToUpdate,
      progressToUpdate
    );

    if (!success) return;

    const milestoneUpdates = milestones.filter(m => {
      const original = m.progress ?? 0;
      const updated = milestoneProgress[m.id] ?? 0;
      return original !== updated;
    });

    if (milestoneUpdates.length > 0) {
      try {
        for (const m of milestoneUpdates) {
          const { error } = await supabase
            .from('goal_milestones')
            .update({ progress: milestoneProgress[m.id], updated_at: new Date().toISOString() })
            .eq('id', m.id);
          
          if (error) throw error;
        }
        toast.success('Milestones updated');
      } catch (err) {
        logger.error('Failed to update milestones:', err);
        toast.error('Failed to update some milestones');
      }
    }

    onOpenChange(false);
    setSelectedStatus(null);
    onSuccess?.();
  };

  const handleCancel = () => {
    setSelectedStatus(null);
    onOpenChange(false);
  };

  if (!goal) return null;

  const currentStatusOption = statusOptions.find(opt => opt.value === goal.status);
  
  const goalProgressChanged = hasMilestones 
    ? calculatedProgress !== (goal.progress || 0)
    : progress !== (goal.progress || 0);
  const statusChanged = selectedStatus !== null;
  const milestonesChanged = milestones.some(m => {
    const original = m.progress ?? 0;
    const updated = milestoneProgress[m.id] ?? 0;
    return original !== updated;
  });
  const hasChanges = goalProgressChanged || statusChanged || milestonesChanged;

  return (
    <MobileBaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={goal.title}
      description="Update progress and status of this goal"
      onSubmit={handleSave}
      onCancel={handleCancel}
      submitText="Save Changes"
      submitDisabled={!hasChanges}
      loading={isUpdating}
    >
      <div className="space-y-6">
        {/* Progress Display/Editor */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progress</span>
              {hasMilestones && (
                <span className="text-xs text-muted-foreground">(from milestones)</span>
              )}
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums">
              {hasMilestones ? calculatedProgress : progress}%
            </span>
          </div>
          
          {hasMilestones ? (
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-300"
                style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${calculatedProgress}%` }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Decrease progress"
                className="h-10 w-10 shrink-0"
                onClick={() => adjustProgress(-10)}
                disabled={progress <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Slider
                value={[progress]}
                onValueChange={handleProgressChange}
                max={100}
                step={5}
                className="flex-1"
              />
              
              <Button
                variant="outline"
                size="icon"
                aria-label="Increase progress"
                className="h-10 w-10 shrink-0"
                onClick={() => adjustProgress(10)}
                disabled={progress >= 100}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Milestones Section */}
        {milestones.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setShowMilestones(!showMilestones)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Milestones ({milestones.length})</span>
              </div>
              {showMilestones ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {showMilestones && (
              <div className="space-y-4 pl-1">
                {loadingMilestones ? (
                  <div className="text-sm text-muted-foreground">Loading milestones...</div>
                ) : (
                  milestones.map(milestone => (
                    <div key={milestone.id} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium line-clamp-1">{milestone.title}</span>
                        <span className="text-sm font-bold text-primary tabular-nums">
                          {milestoneProgress[milestone.id] ?? 0}%
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => adjustMilestoneProgress(milestone.id, -10)}
                          disabled={(milestoneProgress[milestone.id] ?? 0) <= 0}
                          aria-label="Decrease milestone progress"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <Slider
                          value={[milestoneProgress[milestone.id] ?? 0]}
                          onValueChange={(v) => handleMilestoneProgressChange(milestone.id, v)}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => adjustMilestoneProgress(milestone.id, 10)}
                          disabled={(milestoneProgress[milestone.id] ?? 0) >= 100}
                          aria-label="Increase milestone progress"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {milestone.due_date && (
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(milestone.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Current Status */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Status</label>
          <div className={`flex items-center gap-2 p-3 rounded-lg ${currentStatusOption?.bgColor}`}>
            {currentStatusOption?.icon && (
              <currentStatusOption.icon className={`h-5 w-5 ${currentStatusOption.color}`} />
            )}
            <span className="font-medium">{currentStatusOption?.label}</span>
          </div>
        </div>

        {/* Status Options */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Change Status (optional)</label>
          <div className="grid gap-2">
            {statusOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedStatus === option.value;
              const isCurrent = goal.status === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  disabled={isCurrent}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left
                    ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'}
                    ${isCurrent ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'}
                  `}
                >
                  <Icon className={`h-5 w-5 ${option.color}`} />
                  <span className="font-medium flex-1">{option.label}</span>
                  {isCurrent && (
                    <span className="text-xs text-muted-foreground">(Current)</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </MobileBaseModal>
  );
};
