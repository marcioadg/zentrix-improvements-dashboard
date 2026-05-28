import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Loader2, Plus, Calendar, GripVertical, ChevronDown, ChevronRight, Edit2, Trash2, MoreVertical, Star, BarChart3, TrendingUp, Users, User, CheckCircle2, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { DragEndEvent, DndContext, PointerSensor, KeyboardSensor, useSensors, useSensor, closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardGoals } from '@/hooks/useDashboardGoals';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditGoalModal } from '@/components/modals/EditGoalModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { celebrate } from '@/lib/celebration';
import { toast as toastSonner } from 'sonner';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { GoalsCardSkeleton } from '@/components/skeletons/GoalsCardSkeleton';
import { logger } from '@/utils/logger';

// Timezone-safe date parsing utility function
const parseTargetDateSafe = (dateString: string): Date | null => {
  if (!dateString) return null;
  try {
    const dateStr = dateString.split('T')[0]; // Remove time component if present
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateValue = new Date(year, month - 1, day); // month is 0-indexed
    return !isNaN(dateValue.getTime()) ? dateValue : null;
  } catch (error) {
    logger.error('Error parsing date:', error);
    return null;
  }
};

// Timezone-safe date formatting utility function  
const formatDateSafe = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Sortable Goal Item Component
interface SortableGoalItemProps {
  goal: any;
  goalType: string;
  onStatusUpdate: (goalId: string, newStatus: string, goalType: string) => void;
  onProgressUpdate: (goalId: string, progress: number, goalType: string) => Promise<boolean>;
  onGoalClick: (goal: any) => void;
  onGoalDateUpdate: (goalId: string, newDate: Date, goalType: string) => void;
  getStatusColor: (status: string) => string;
  formatStatus: (status: string) => string;
  statusOptions: Array<{
    value: string;
    label: string;
  }>;
  refetch: () => void;
}
const SortableGoalItem: React.FC<SortableGoalItemProps> = ({
  goal,
  goalType,
  onStatusUpdate,
  onProgressUpdate,
  onGoalClick,
  onGoalDateUpdate,
  getStatusColor,
  formatStatus,
  statusOptions,
  refetch
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: goal.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // Milestone management state
  const [showMilestones, setShowMilestones] = useState(false);
  const [milestoneProgress, setMilestoneProgress] = useState<{[key: string]: number}>({});
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);

  // Check if goal has milestones
  const {
    milestones = [],
    progress: calculatedMilestoneProgress = 0,
    deleteMilestone,
    updateMilestone,
    refetch: refetchMilestones
  } = useGoalMilestones(goal.id, {}, true) || {};
  const hasMilestones = milestones.length > 0;

  // Initialize milestone progress state when milestones change
  React.useEffect(() => {
    const newProgress: {[key: string]: number} = {};
    milestones.forEach(milestone => {
      newProgress[milestone.id] = milestone.progress || 0;
    });
    setMilestoneProgress(newProgress);
  }, [milestones]);

  // Use milestone progress if available, otherwise use goal progress
  const effectiveProgress = hasMilestones ? calculatedMilestoneProgress : goal.progress || 0;
  const [localProgress, setLocalProgress] = useState(effectiveProgress);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // Update local progress when milestone progress changes (but not while dragging)
  React.useEffect(() => {
    if (!isSliderDragging) {
      setLocalProgress(effectiveProgress);
    }
  }, [effectiveProgress, isSliderDragging]);

  // Listen for milestone cache invalidation events
  React.useEffect(() => {
    const handleCacheInvalidate = (event: CustomEvent) => {
      if (event.detail.goalId === goal.id && refetchMilestones) {
        refetchMilestones();
      }
    };

    window.addEventListener('milestone-cache-invalidate', handleCacheInvalidate as EventListener);
    return () => {
      window.removeEventListener('milestone-cache-invalidate', handleCacheInvalidate as EventListener);
    };
  }, [goal.id, refetchMilestones]);
  const handleProgressChange = useCallback(async (value: number[]) => {
    const newProgress = value[0];
    setLocalProgress(newProgress);
    await onProgressUpdate(goal.id, newProgress, goalType);
    setIsSliderDragging(false);
  }, [goal.id, goalType, onProgressUpdate]);
  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId);
      toastSonner.success('Milestone deleted');
    } catch (error) {
      logger.error('Error deleting milestone:', error);
      toastSonner.error('Failed to delete milestone');
    }
  };

  const handleMilestoneProgressUpdate = async (milestoneId: string, newProgress: number) => {
    try {
      setMilestoneProgress(prev => ({ ...prev, [milestoneId]: newProgress }));
      await updateMilestone(milestoneId, { progress: newProgress });
      toastSonner.success('Milestone progress updated');
    } catch (error) {
      logger.error('Error updating milestone progress:', error);
      toastSonner.error('Failed to update milestone progress');
    }
  };

  const handleMilestoneCompletionUpdate = async () => {
    if (milestones.length > 0) {
      try {
        await Promise.all(
          milestones.map(milestone => 
            updateMilestone(milestone.id, { progress: 100 })
          )
        );
        
        // Update local milestone progress state
        const updatedMilestoneProgress: {[key: string]: number} = {};
        milestones.forEach(milestone => {
          updatedMilestoneProgress[milestone.id] = 100;
        });
        setMilestoneProgress(prev => ({ ...prev, ...updatedMilestoneProgress }));
        
      } catch (milestoneError) {
        logger.error('Error updating milestone progress:', milestoneError);
        // Don't fail the whole operation if milestone updates fail
      }
    }
  };

  const handleMilestoneDateUpdate = async (milestoneId: string, newDate: Date) => {
    try {
      await updateMilestone(milestoneId, { due_date: newDate.toISOString().split('T')[0] });
      toastSonner.success('Milestone date updated');
    } catch (error) {
      logger.error('Error updating milestone date:', error);
      toastSonner.error('Failed to update milestone date');
    }
  };
  return <div ref={setNodeRef} style={style} className="group relative">
      {/* Compact Goal Card */}
      <div className="bg-card border border-border rounded-[6px] p-3 mb-2 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors duration-150 cursor-pointer" role="button" tabIndex={0} onClick={() => onGoalClick(goal)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoalClick(goal); } }}>
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>

        {/* Main Content */}
        <div className="pl-1 group-hover:pl-5 transition-[padding] duration-150">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            <h5 className="font-medium text-[13px] text-foreground leading-tight truncate flex-1 min-w-0">
              {goal.title}
            </h5>
            {/* Milestone Toggle */}
            {hasMilestones && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground flex-shrink-0"
                onClick={e => {
                  e.stopPropagation();
                  setShowMilestones(!showMilestones);
                }} 
                title={`${milestones.length} milestone${milestones.length !== 1 ? 's' : ''}`}
              >
                {showMilestones ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>

          {/* Second Row: Date + Status + Progress */}
          <div className="flex items-center gap-3 mt-1">
            {/* Date */}
            {goal.target_date && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-1 text-[11px] text-muted-foreground/60 hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <Calendar className="h-3 w-3" />
                    {parseTargetDateSafe(goal.target_date) ? format(parseTargetDateSafe(goal.target_date)!, "MMM d") : ""}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={parseTargetDateSafe(goal.target_date)}
                    onSelect={(date, selectedDay, activeModifiers, e) => {
                      if (date) {
                        e?.stopPropagation();
                        onGoalDateUpdate(goal.id, date, goalType);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}

            {/* Status Badge */}
            <div onClick={e => e.stopPropagation()}>
              <Select value={goal.status} onValueChange={async (value) => {
                if ((value === 'complete' || value === 'completed') && milestones.length > 0) {
                  await handleMilestoneCompletionUpdate();
                }
                onStatusUpdate(goal.id, value, goalType);
              }}>
                <SelectTrigger className="w-fit h-7 text-[10px] border-0 px-0.5 bg-transparent [&>svg]:hidden">
                  <SelectValue>
                    <Badge className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(goal.status)}`}>
                      {formatStatus(goal.status)}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => 
                    <SelectItem key={option.value} value={option.value}>
                      <Badge className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusColor(option.value)}`}>
                        {option.label}
                      </Badge>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Progress Section */}
            <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
              {hasMilestones ? (
                <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300 rounded-full bg-primary" style={{ width: `${localProgress}%` }} />
                </div>
              ) : (
                <ElasticSlider 
                  value={[localProgress]} 
                  onValueChange={value => {
                    setIsSliderDragging(true);
                    setLocalProgress(value[0]);
                  }} 
                  onValueCommit={handleProgressChange}
                  max={100} 
                  step={5} 
                  className="flex-1" 
                  showLabel={false} 
                />
              )}
              <span className="text-[10px] font-medium text-muted-foreground w-6 text-right">
                {Math.round(localProgress)}%
              </span>
            </div>
          </div>
        </div>

        {/* Expanded Milestones Section - Compact */}
        {showMilestones && hasMilestones && (
          <div className="mt-2 pt-2 border-t border-border/20 pl-1 group-hover:pl-5 transition-[padding] duration-150" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              {milestones.map(milestone => {
                const currentProgress = milestoneProgress[milestone.id] ?? (milestone.progress || 0);
                
                return (
                  <div key={milestone.id} className="flex items-center gap-2 py-0.5 group/milestone">
                    {/* Milestone Title */}
                    <span className="text-[11px] text-muted-foreground truncate flex-1 min-w-0" title={milestone.title}>
                      {milestone.title}
                    </span>
                    
                    {/* Due Date */}
                    {milestone.due_date && (
                      <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                        {parseTargetDateSafe(milestone.due_date)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    
                    {/* Progress */}
                    <div className="flex items-center gap-1 flex-shrink-0 w-16">
                      <div className="w-10 h-1 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${currentProgress}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 w-5 text-right">{currentProgress}%</span>
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMilestone(milestone.id);
                      }}
                      className="opacity-0 group-hover/milestone:opacity-100 transition-opacity p-1 hover:text-destructive text-muted-foreground/40 rounded"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>;
  };

interface UserGoalsSectionProps {
  updateGoalCompletionOptimistically?: (goalId: string, newStatus: string) => void;
  selectedTeamId?: string | null;
}

export const UserGoalsSection: React.FC<UserGoalsSectionProps> = ({ updateGoalCompletionOptimistically, selectedTeamId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    personalGoals = [], 
    companyGoals = [], 
    teamGoals = [], 
    allGoals = [], 
    loading, 
    updateGoalStatus: updateDashboardGoalStatus, 
    deleteGoal,
    refetch 
  } = useDashboardGoals();
  const { toast } = useToast();
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [globalGoalsOrder, setGlobalGoalsOrder] = useState<any[]>([]);
  
  // Set up drag and drop sensors
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  

  // Load saved order from localStorage and initialize global order
  React.useEffect(() => {
    if (allGoals.length > 0 && user?.id) {
      try {
        const storageKey = `dashboard-goals-order-${user.id}`;
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          const orderedGoals = [...allGoals].sort((a, b) => {
            const aIndex = orderIds.indexOf(a.id);
            const bIndex = orderIds.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
          setGlobalGoalsOrder(orderedGoals);
        } else {
          setGlobalGoalsOrder([...allGoals]);
        }
      } catch (error) {
        logger.error('Failed to load goals order', { error });
        setGlobalGoalsOrder([...allGoals]);
      }
    }
  }, [allGoals, user?.id]);

  // Filter goals by selected team (derived from global order)
  // Check both primary team_id AND goal_team_assignments for multi-team goals
  const sortedGoals = React.useMemo(() => {
    if (!selectedTeamId) return globalGoalsOrder;
    return globalGoalsOrder.filter(goal => 
      goal.team_id === selectedTeamId || 
      (goal.assigned_team_ids && goal.assigned_team_ids.includes(selectedTeamId))
    );
  }, [globalGoalsOrder, selectedTeamId]);

  // Handle drag end - swap positions globally when team filter is active
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setGlobalGoalsOrder(currentGlobalOrder => {
      let newGlobalOrder: any[];

      if (selectedTeamId) {
        // When team filter is active: SWAP global positions
        const draggedGoalId = active.id as string;
        const targetGoalId = over.id as string;
        
        const draggedIndex = currentGlobalOrder.findIndex(g => g.id === draggedGoalId);
        const targetIndex = currentGlobalOrder.findIndex(g => g.id === targetGoalId);
        
        if (draggedIndex === -1 || targetIndex === -1) return currentGlobalOrder;
        
        // Swap positions in global array
        newGlobalOrder = [...currentGlobalOrder];
        [newGlobalOrder[draggedIndex], newGlobalOrder[targetIndex]] = 
          [newGlobalOrder[targetIndex], newGlobalOrder[draggedIndex]];
      } else {
        // When no filter (All Teams): use arrayMove as before
        const oldIndex = currentGlobalOrder.findIndex(item => item.id === active.id);
        const newIndex = currentGlobalOrder.findIndex(item => item.id === over.id);
        newGlobalOrder = arrayMove(currentGlobalOrder, oldIndex, newIndex);
      }

      // Persist the new order to localStorage
      try {
        const storageKey = `dashboard-goals-order-${user?.id}`;
        localStorage.setItem(storageKey, JSON.stringify(newGlobalOrder.map(g => g.id)));
      } catch (error) {
        logger.error('Failed to save goals order', { error });
      }

      return newGlobalOrder;
    });
  }, [user, selectedTeamId]);
  if (loading) {
    return <GoalsCardSkeleton />;
  }
  const statusColors = {
    on_track: 'bg-status-success/10 text-status-success',
    off_track: 'bg-status-error/10 text-status-error',
    complete: 'bg-primary/10 text-primary',
    completed: 'bg-primary/10 text-primary',
    canceled: 'bg-secondary text-muted-foreground'
  };
  const statusLabels = {
    on_track: 'On-Track',
    off_track: 'Off-Track',
    complete: 'Completed',
    completed: 'Completed',
    canceled: 'Canceled'
  };
  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'bg-secondary text-muted-foreground';
  };
  const formatStatus = (status: string) => {
    return statusLabels[status as keyof typeof statusLabels] || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const handleStatusUpdate = async (goalId: string, newStatus: string, goalType: string) => {
    // Find the current goal data for rollback
    const currentGoal = allGoals.find(g => g.id === goalId);
    if (!currentGoal) return;
    
    try {
      // Celebrate when goal is completed (before optimistic update)
      if (newStatus === 'complete' || newStatus === 'completed') {
        logger.debug('Goal completion celebration triggered');
        celebrate();
      }

      // Optimistically update using the dashboard hook
      updateDashboardGoalStatus(goalId, newStatus, goalType as 'personal' | 'team' | 'company');
      
      // Also update the dashboard KPI optimistically if provided
      if (updateGoalCompletionOptimistically) {
        updateGoalCompletionOptimistically(goalId, newStatus);
      }

      // Perform actual database update
      const tableName = 'team_goals';
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // If goal is being marked as complete, set progress to 100%
      if (newStatus === 'complete' || newStatus === 'completed') {
        updateData.progress = 100;
      }
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', goalId);
        
      if (error) throw error;
      
      // If goal is marked as complete and has milestones, set all milestones to 100%
      if (newStatus === 'complete') {
        const { data: milestones } = await supabase
          .from('goal_milestones')
          .select('id')
          .eq('goal_id', goalId);
        
        if (milestones && milestones.length > 0) {
          await supabase
            .from('goal_milestones')
            .update({ progress: 100 })
            .eq('goal_id', goalId);
        }
      }
      
    } catch (error) {
      logger.error('Error updating goal status', { error });
      
      // Rollback optimistic update on error by refetching
      refetch();
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive",
      });
    }
  };
  const handleProgressUpdate = async (goalId: string, progress: number, goalType: string): Promise<boolean> => {
    try {
      // Get current goal to check its status
      const currentGoal = allGoals.find(goal => goal.id === goalId) || sortedGoals.find(goal => goal.id === goalId);
      if (!currentGoal) {
        logger.error('Goal not found for progress update', { goalId });
        return false;
      }

      // Determine if status should change based on progress
      let newStatus = currentGoal.status;
      let statusChanged = false;

      if (progress >= 100 && currentGoal.status !== 'complete') {
        // Set to complete when progress reaches 100%
        newStatus = 'complete';
        statusChanged = true;
      } else if (progress < 100 && currentGoal.status === 'complete') {
        // Revert from complete to on_track when progress goes below 100%
        newStatus = 'on_track';
        statusChanged = true;
      }

      // Update the goal progress (and status if needed) in the database
      const tableName = 'team_goals';
      const updateData: any = {
        progress: progress,
        updated_at: new Date().toISOString()
      };

      // Add status update if it changed
      if (statusChanged) {
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', goalId);
        
      if (error) throw error;

      // Update local state to reflect the changes
      setGlobalGoalsOrder(prev => prev.map(goal => 
        goal.id === goalId ? {
          ...goal,
          progress,
          ...(statusChanged ? { status: newStatus } : {})
        } : goal
      ));

      // Update dashboard state optimistically if status changed
      if (statusChanged && updateDashboardGoalStatus) {
        updateDashboardGoalStatus(goalId, newStatus, goalType as 'personal' | 'team' | 'company');
      }

      // Update dashboard KPI optimistically if status changed
      if (statusChanged && updateGoalCompletionOptimistically) {
        updateGoalCompletionOptimistically(goalId, newStatus);
      }

      // Show appropriate celebration
      if (statusChanged) {
        if (newStatus === 'complete') {
          // Confetti and sound for completion instead of toast
          celebrate();
          // Handle milestone completion if goal has milestones
          if (currentGoal.id) {
            const goalComponent = document.querySelector(`[data-goal-id="${currentGoal.id}"]`);
            if (goalComponent) {
              // Trigger milestone completion for this specific goal
              const milestoneEvent = new CustomEvent('goalCompleted', { 
                detail: { goalId: currentGoal.id } 
              });
              goalComponent.dispatchEvent(milestoneEvent);
            }
          }
        }
      }

      return true;

    } catch (error) {
      logger.error('Error updating goal progress', { error });
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleGoalDateUpdate = async (goalId: string, newDate: Date, goalType: string) => {
    try {
      const tableName = 'team_goals';
      const formattedDate = formatDateSafe(newDate);
      const { error } = await supabase
        .from(tableName)
        .update({ 
          target_date: formattedDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId);
        
      if (error) throw error;

      // Update local state
      setGlobalGoalsOrder(prev => prev.map(goal => 
        goal.id === goalId ? {
          ...goal,
          target_date: formattedDate
        } : goal
      ));

      toast({
        title: "Success",
        description: "Goal target date updated",
      });
    } catch (error) {
      logger.error('Error updating goal date', { error });
      toast({
        title: "Error", 
        description: "Failed to update goal date",
        variant: "destructive",
      });
    }
  };
  const statusOptions = [{
    value: 'on_track',
    label: 'On Track'
  }, {
    value: 'off_track',
    label: 'Off Track'
  }, {
    value: 'complete',
    label: 'Complete'
  }, {
    value: 'canceled',
    label: 'Canceled'
  }];
  const handleGoalClick = (goal: any) => {
    logger.debug('Goal clicked for editing', { goalId: goal?.id });
    setEditingGoal(goal);
  };
  const handleGoalUpdate = async (goalId: string, updates: any): Promise<boolean> => {
    logger.debug('Goal update initiated', { goalId, hasUpdates: !!updates });
    if (!goalId || !updates) {
      logger.error('Invalid parameters for goal update');
      return false;
    }
    try {
      // Find the goal to verify it exists
      const targetGoal = allGoals.find(g => g.id === goalId);
      if (!targetGoal) {
        logger.error('Goal not found', { goalId });
        return false;
      }

      // Separate team_assignments from other updates (handled separately via junction table)
      const { team_assignments, ...restUpdates } = updates;

      // All goals are now in team_goals table
      const validColumns = ['title', 'description', 'status', 'target_date', 'team_id', 'owner_id', 'is_company_goal', 'progress', 'display_order', 'archived'];

      // Filter updates to only include valid columns
      const filteredUpdates: any = {};
      Object.keys(restUpdates).forEach(key => {
        if (validColumns.includes(key)) {
          let value = restUpdates[key];

          // Fix description field if it has the serialization issue
          if (key === 'description' && value && typeof value === 'object' && value._type === 'undefined') {
            value = null; // Convert undefined serialization back to null
          }
          filteredUpdates[key] = value;
        }
      });

      // Always add updated_at
      filteredUpdates.updated_at = new Date().toISOString();
      logger.debug('Updating goal in database', { goalId });

      // Perform the database update - always use team_goals now
      const { error } = await supabase
        .from('team_goals')
        .update(filteredUpdates)
        .eq('id', goalId);
        
      if (error) {
        logger.error('Database update error', { error: error.message });
        toast({
          title: "Error",
          description: `Failed to update goal: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }
      logger.debug('Goal database update successful');

      // Handle team assignments via junction table (same pattern as useTeamGoals.ts)
      if (team_assignments !== undefined) {
        logger.debug('Updating team assignments', { goalId, newAssignments: team_assignments });

        // Get current assignments
        const { data: currentAssignments } = await supabase
          .from('goal_team_assignments')
          .select('team_id')
          .eq('goal_id', goalId);

        const currentTeamIds = (currentAssignments || []).map(a => a.team_id);
        const newTeamIds = team_assignments.map((a: { team_id: string }) => a.team_id);

        // Find teams to add and remove
        const toInsert = newTeamIds.filter((id: string) => !currentTeamIds.includes(id));
        const toDelete = currentTeamIds.filter(id => !newTeamIds.includes(id));

        // Insert new assignments
        if (toInsert.length > 0) {
          const assignmentsToInsert = toInsert.map((teamId: string) => ({
            goal_id: goalId,
            team_id: teamId
          }));

          const { error: insertError } = await supabase
            .from('goal_team_assignments')
            .insert(assignmentsToInsert);

          if (insertError) {
            logger.error('Error inserting team assignments', { error: insertError.message });
          }
        }

        // Delete removed assignments
        if (toDelete.length > 0) {
          for (const teamId of toDelete) {
            const { error: deleteError } = await supabase
              .from('goal_team_assignments')
              .delete()
              .eq('goal_id', goalId)
              .eq('team_id', teamId);

            if (deleteError) {
              logger.warn('Could not remove team assignment', { teamId, error: deleteError.message });
            }
          }
        }

        // Update primary team_id if we have new team assignments
        if (newTeamIds.length > 0 && !filteredUpdates.team_id) {
          await supabase
            .from('team_goals')
            .update({ team_id: newTeamIds[0] })
            .eq('id', goalId);
        }

        logger.debug('Team assignments updated', { inserted: toInsert.length, deleted: toDelete.length });
      }

      // Refresh the goals data to show the changes
      await refetch();

      // Close the modal
      setEditingGoal(null);
      toast({
        title: "Success",
        description: "Goal updated successfully",
      });
      return true;
    } catch (error) {
      logger.error('Goal update failed', { error });
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
      return false;
    }
  };
  return <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-medium text-foreground">
          Goals
        </h2>
        <Button variant="ghost" size="sm" onClick={() => navigate('/goals')} className="text-[13px] text-muted-foreground hover:text-foreground font-normal h-9 px-3 transition-colors duration-150">
          View all
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        {sortedGoals.length === 0 ? <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <Target className="h-8 w-8 text-muted-foreground" />
            <p className="text-[14px] font-medium text-foreground">No goals yet</p>
            <p className="text-[13px] text-muted-foreground">Set goals to track your progress and stay focused</p>
            <Button onClick={() => navigate('/goals', { state: { openAddGoal: true } })} size="sm">
              Add your first goal
            </Button>
          </div> : <ScrollArea className="h-full">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedGoals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 pr-3">
                  {sortedGoals.map(goal => {
                // Determine goal type
                const goalType = personalGoals.some(pg => pg.id === goal.id) ? 'personal' : companyGoals.some(cg => cg.id === goal.id) ? 'company' : 'team';
                return <SortableGoalItem key={goal.id} goal={goal} goalType={goalType} onStatusUpdate={handleStatusUpdate} onProgressUpdate={handleProgressUpdate} onGoalClick={handleGoalClick} onGoalDateUpdate={handleGoalDateUpdate} getStatusColor={getStatusColor} formatStatus={formatStatus} statusOptions={statusOptions} refetch={refetch} />;
              })}
                </div>
              </SortableContext>
            </DndContext>
           </ScrollArea>}

        {editingGoal && <EditGoalModal open={!!editingGoal} onOpenChange={open => !open && setEditingGoal(null)} goal={editingGoal} onUpdate={handleGoalUpdate} onDelete={deleteGoal} teamId={editingGoal.team_id || ''} />}
      </div>
    </div>;
};