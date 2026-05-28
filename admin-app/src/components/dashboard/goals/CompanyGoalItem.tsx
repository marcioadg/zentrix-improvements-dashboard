import React, { useState, useEffect, useCallback, memo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { updateMilestoneProgress } from '@/hooks/useMilestoneProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { Progress } from '@/components/ui/progress';
import { UserAvatar } from '@/components/UserAvatar';
import { Calendar, Archive, Trash2, Edit, AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { logger } from '@/utils/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CompanyGoalItemProps {
  goal: TeamGoal;
  onEdit?: (goal: TeamGoal) => void;
  onArchive?: (goalId: string) => void;
  onUnarchive?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  onStatusUpdate?: (goalId: string, status: TeamGoal['status']) => void;
  onProgressUpdate?: (goalId: string, progress: number) => Promise<boolean>;
  onDateUpdate?: (goalId: string, date: Date) => void;
  onMilestoneChanged?: (goalId: string, action: 'created' | 'updated' | 'deleted', milestoneId?: string) => void;
  onOwnerChange?: (goalId: string, previousOwnerId: string, newOwnerId: string) => void;
  getProfileName: (userId: string) => string;
  getProfile: (userId: string) => any;
  showArchived?: boolean;
}

const statusColors = {
  on_track: 'bg-[var(--active)]/10 text-foreground',
  off_track: 'bg-destructive/10 text-destructive',
  complete: 'bg-muted text-muted-foreground',
  canceled: 'bg-muted text-muted-foreground'
};

const statusLabels = {
  on_track: 'On-Track',
  off_track: 'Off-Track',
  complete: 'Completed',
  canceled: 'Canceled'
};

// SortableMilestone component (same as in GoalItem)
interface SortableMilestoneProps {
  milestone: any;
  isOverdue: boolean;
  isDueSoon: boolean;
  editingMilestoneId: string | null;
  editMilestoneTitle: string;
  setEditMilestoneTitle: (value: string) => void;
  editMilestoneDueDate: string;
  setEditMilestoneDueDate: (value: string) => void;
  editMilestoneDescription: string;
  setEditMilestoneDescription: (value: string) => void;
  handleSaveEditMilestone: () => void;
  handleCancelEditMilestone: () => void;
  handleEditMilestone: (milestone: any) => void;
  handleDeleteMilestone: (milestoneId: string, milestoneTitle: string) => void;
  getProgressValue: (milestone: any) => number;
  handleProgressChangeUI: (milestone: any, progressValue: number[]) => void;
  handleProgressChangeCommit: (milestone: any, progressValue: number[]) => void;
}

const SortableMilestone: React.FC<SortableMilestoneProps> = ({
  milestone,
  isOverdue,
  isDueSoon,
  editingMilestoneId,
  editMilestoneTitle,
  setEditMilestoneTitle,
  editMilestoneDueDate,
  setEditMilestoneDueDate,
  editMilestoneDescription,
  setEditMilestoneDescription,
  handleSaveEditMilestone,
  handleCancelEditMilestone,
  handleEditMilestone,
  handleDeleteMilestone,
  getProgressValue,
  handleProgressChangeUI,
  handleProgressChangeCommit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };


  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1">
          <div className="w-1 h-4 bg-border rounded-full"></div>
        </div>
        
        {editingMilestoneId === milestone.id ? (
          <div className="flex-1 space-y-2">
            <Input
              value={editMilestoneTitle}
              onChange={(e) => setEditMilestoneTitle(e.target.value)}
              placeholder="Milestone title..."
              className="text-sm"
            />
            <Textarea
              value={editMilestoneDescription}
              onChange={(e) => setEditMilestoneDescription(e.target.value)}
              placeholder="Description..."
              className="text-xs min-h-[60px] resize-none"
            />
            <div className="flex items-center gap-2">
              <DatePicker
                date={editMilestoneDueDate ? new Date(editMilestoneDueDate + 'T00:00:00') : undefined}
                onSelect={(d) => setEditMilestoneDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                placeholder="Pick a target date"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEditMilestone} className="text-xs">Save</Button>
              <Button size="sm" variant="outline" onClick={handleCancelEditMilestone} className="text-xs">Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 flex-1">
            <div className="flex-1 min-w-0" onClick={(e) => {
              e.stopPropagation();
              handleEditMilestone(milestone);
            }}>
              <h4 className="font-medium text-sm cursor-pointer text-foreground">
                {milestone.title}
              </h4>
              
              {milestone.description && (
                <p className="text-xs mt-1 text-muted-foreground">
                  {milestone.description}
                </p>
              )}
              
              {milestone.due_date && (
                <div className="flex items-center gap-1 mt-2">
                  <Calendar className="h-3 w-3" />
                  <span className={`text-xs ${
                    isOverdue
                      ? 'text-destructive font-medium'
                      : isDueSoon
                        ? 'text-warning font-medium'
                        : 'text-muted-foreground'
                  }`}>
                    {new Date(milestone.due_date + 'T12:00:00').toLocaleDateString()}
                    {isOverdue && ' (Overdue)'}
                    {isDueSoon && !isOverdue && ' (Due Soon)'}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 flex-shrink-0">
               {/* Progress Slider */}
               <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8 opacity-70">
                    {getProgressValue(milestone)}%
                  </span>
                 <div onClick={(e) => e.stopPropagation()}>
                   <ElasticSlider
                     value={[getProgressValue(milestone)]}
                     onValueChange={(value) => handleProgressChangeUI(milestone, value)}
                     onValueCommit={(value) => handleProgressChangeCommit(milestone, value)}
                     max={100}
                     step={5}
                     className="w-24"
                     showLabel={false}
                   />
                 </div>
              </div>
              
              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMilestone(milestone.id, milestone.title);
                }}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive opacity-60"
                title="Delete milestone"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CompanyGoalItem: React.FC<CompanyGoalItemProps> = memo(({
  goal,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onStatusUpdate,
  onProgressUpdate,
  onDateUpdate,
  onMilestoneChanged,
  onOwnerChange,
  getProfileName,
  getProfile,
  showArchived = false,
}) => {
  const { addIssue } = useSimpleIssues(goal.team_id, undefined, undefined, undefined, { silent: true });
  const { toast } = useToast();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDescription, setEditMilestoneDescription] = useState('');
  const [editMilestoneDueDate, setEditMilestoneDueDate] = useState('');
  const [progressValues, setProgressValues] = useState<{[key: string]: number}>({});
  const [goalProgressValue, setGoalProgressValue] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Milestone management - always load milestones for progress calculation
  const milestonesData = useGoalMilestones(goal?.id, progressValues, true);
  const { milestones = [], addMilestone, updateMilestone, deleteMilestone, reorderMilestones, progress = 0, loading: isLoading } = milestonesData || {};

  // Calculate goal progress - use milestones average if they exist, otherwise use direct progress
  const getGoalProgress = () => {
    if (milestones.length > 0) {
      return Math.round(progress); // Use calculated average from milestones
    }
    // Use local progress value if available, otherwise use database value
    return goalProgressValue ?? goal.progress ?? 0;
  };

  // Reset local progress state when goal.progress changes from database
  React.useEffect(() => {
    setGoalProgressValue(null);
  }, [goal.progress]);

  const handleGoalProgressChange = React.useCallback((progressValue: number[]) => {
    const newProgress = progressValue[0];
    setGoalProgressValue(newProgress);
  }, []);

  const handleGoalProgressCommit = React.useCallback(async (progressValue: number[]) => {
    const newProgress = progressValue[0];
    if (onProgressUpdate) {
      const success = await onProgressUpdate(goal.id, newProgress);
      if (!success) {
        setGoalProgressValue(null);
        toast({
          title: "Error",
          description: "Failed to update goal progress",
          variant: "destructive",
        });
      }
    }
  }, [goal.id, onProgressUpdate, toast]);


  const getProgressValue = (milestone: any) => {
    // Check if there's a temporary value being edited
    if (progressValues[milestone.id] !== undefined) {
      return progressValues[milestone.id];
    }
    
    // Use saved progress from database, default to 0
    return milestone.progress ?? 0;
  };

  // UI-only update for instant feedback during drag
  const handleProgressChangeUI = (milestone: any, progressValue: number[]) => {
    const newProgress = progressValue[0];
    setProgressValues(prev => ({
      ...prev,
      [milestone.id]: newProgress
    }));
  };

  // Database commit when drag is complete
  const handleProgressChangeCommit = async (milestone: any, progressValue: number[]) => {
    const newProgress = progressValue[0];
    const oldProgress = milestone.progress ?? 0;
    
    // Use the hook's updateMilestone function
    const success = await updateMilestone(milestone.id, { progress: newProgress });
    if (!success) {
      // Revert local state if database update failed
      setProgressValues(prev => ({
        ...prev,
        [milestone.id]: oldProgress
      }));
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    } else {
      // Clear local state on success so it falls back to database value
      setProgressValues(prev => {
        const newValues = { ...prev };
        delete newValues[milestone.id];
        return newValues;
      });
      
      // Broadcast the milestone progress change to other meeting participants
      onMilestoneChanged?.(goal.id, 'updated', milestone.id);
    }
    // No success toast - visual feedback from slider is enough
  };

  const handleStatusChange = async (newStatus: string) => {
    // If completing goal with milestones, update progress state immediately
    if (newStatus === 'complete' && milestones.length > 0) {
      const optimisticProgress: {[key: string]: number} = {};
      milestones.forEach(milestone => {
        optimisticProgress[milestone.id] = 100;
      });
      setProgressValues(prev => ({ ...prev, ...optimisticProgress }));
    }
    if (onStatusUpdate) {
      onStatusUpdate(goal.id, newStatus as TeamGoal['status']);
    }
  };

  // Debug logging for milestone loading
  useEffect(() => {
    if (isExpanded) {
      logger.log('🎯 CompanyGoalItem expanded:', {
        goalId: goal.id,
        goalTitle: goal.title,
        milestonesCount: milestones.length,
        milestoneIds: milestones.map(m => m.id),
        isLoading,
        timestamp: new Date().toISOString()
      });
    }
  }, [isExpanded, goal.id, goal.title, milestones, isLoading]);

  const handleCreateIssue = async () => {
    const { generateGoalIssueTitle, generateGoalIssueDescription } = await import('@/utils/goalIssueUtils');
    
    const goalData = { ...goal, is_company_goal: true };
    const issueTitle = generateGoalIssueTitle(goalData);
    const issueDescription = generateGoalIssueDescription(goalData, getProfileName);

    logger.log('CompanyGoalItem: Creating issue for company goal:', {
      goalId: goal.id,
      goalTitle: goal.title,
      ownerId: goal.owner_id,
      ownerName: getProfileName(goal.owner_id),
      teamId: goal.team_id,
      issueTitle: issueTitle
    });
    
    const success = await addIssue(issueTitle, issueDescription, 'short_term', goal.owner_id);
    
    if (success) {
      logger.log('CompanyGoalItem: Issue created successfully for company goal:', goal.title);
      toast({
        title: "Issue Created",
        description: `Issue created in Short-term tab for: ${goal.title}`,
      });
    } else {
      logger.error('CompanyGoalItem: Issue creation not completed (likely duplicate handled upstream):', goal.title);
      // Suppress generic error toast to avoid duplicates; useSimpleIssues shows specific duplicate/error toasts
    }
  };

  // Check if target date has passed - only show red if goal is not complete
  const isDatePassed = goal.target_date && new Date(goal.target_date) < new Date();
  const isOverdue = isDatePassed && goal.status !== 'complete';
  const dateClasses = isOverdue ? 'text-destructive' : 'text-muted-foreground';

  // Determine icon color - standardize all icons
  const getIconColor = () => {
    return 'text-muted-foreground hover:text-foreground';
  };

  // Milestone handlers
  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim() || isAddingMilestone) return;
    
    // Store values and clear form immediately (optimistic)
    const titleToAdd = newMilestoneTitle.trim();
    const descToAdd = newMilestoneDescription.trim() || undefined;
    const dateToAdd = newMilestoneDueDate || undefined;
    
    setNewMilestoneTitle('');
    setNewMilestoneDescription('');
    setNewMilestoneDueDate('');
    setIsAddingMilestone(true);
    
    try {
      const success = await addMilestone(titleToAdd, descToAdd, dateToAdd || null);
      
      if (success) {
        onMilestoneChanged?.(goal.id, 'created');
        toast({
          title: "Milestone Added",
          description: `Added milestone: ${titleToAdd}`,
        });
      } else {
        // Restore form on failure
        setNewMilestoneTitle(titleToAdd);
        setNewMilestoneDescription(descToAdd || '');
        setNewMilestoneDueDate(dateToAdd || '');
      }
    } finally {
      setIsAddingMilestone(false);
    }
  };


  const handleEditMilestone = (milestone: any) => {
    setEditingMilestoneId(milestone.id);
    setEditMilestoneTitle(milestone.title);
    setEditMilestoneDescription(milestone.description || '');
    setEditMilestoneDueDate(milestone.due_date || '');
  };

  const handleSaveEditMilestone = async () => {
    if (!editMilestoneTitle.trim() || !editingMilestoneId) return;
    
    const success = await updateMilestone(editingMilestoneId, {
      title: editMilestoneTitle,
      description: editMilestoneDescription,
      due_date: editMilestoneDueDate || null
    });
    
    if (success) {
      onMilestoneChanged?.(goal.id, 'updated', editingMilestoneId);
    }
    
    handleCancelEditMilestone();
  };

  const handleCancelEditMilestone = () => {
    setEditingMilestoneId(null);
    setEditMilestoneTitle('');
    setEditMilestoneDescription('');
    setEditMilestoneDueDate('');
  };

  const handleDeleteMilestone = async (milestoneId: string, milestoneTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${milestoneTitle}"?`)) {
      const success = await deleteMilestone(milestoneId);
      if (success) {
        onMilestoneChanged?.(goal.id, 'deleted', milestoneId);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = milestones.findIndex(milestone => milestone.id === active.id);
      const newIndex = milestones.findIndex(milestone => milestone.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newMilestones = arrayMove(milestones, oldIndex, newIndex);
        const newOrder = newMilestones.map(milestone => milestone.id);
        reorderMilestones(newOrder);
      }
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const profile = getProfile(goal.owner_id);

  return (
    <>
    <Card className="border-0 shadow-none bg-transparent transition-all duration-200">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Expand button, status selector and goal title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
              }}
              className="h-7 w-7 p-0 flex-shrink-0 opacity-30 hover:opacity-100 transition-opacity"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            {onStatusUpdate ? (
              <Select key={`company-goal-status-${goal.id}-${goal.status}`} value={goal.status} onValueChange={handleStatusChange}>
                <SelectTrigger 
                  className="w-fit border-0 p-1 h-fit bg-transparent [&>svg]:hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue asChild>
                    <Badge className={`${statusColors[goal.status]} text-xs flex-shrink-0 ${showArchived ? 'opacity-70 saturate-50' : ''}`}>
                      {statusLabels[goal.status]}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On-Track</SelectItem>
                  <SelectItem value="off_track">Off-Track</SelectItem>
                  <SelectItem value="complete">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={`${statusColors[goal.status]} text-xs flex-shrink-0 ${showArchived ? 'opacity-70 saturate-50' : ''}`}>
                {statusLabels[goal.status]}
              </Badge>
            )}
            
            <h4
              role="button"
              tabIndex={0}
              className={`font-semibold text-base flex-1 min-w-0 truncate cursor-pointer leading-tight hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm ${showArchived ? 'text-muted-foreground' : ''}`}
              onClick={() => onEdit && onEdit(goal)}
              onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onEdit) { e.preventDefault(); onEdit(goal); } }}
              title={goal.title}
            >
              {goal.title}
            </h4>
            
            {/* Goal Progress Section */}
            <div className="flex items-center gap-2 min-w-[120px]">
              {milestones.length > 0 ? (
                 // Read-only progress bar for goals with milestones (calculated from milestones)
                 <TooltipProvider>
                   <Tooltip>
                     <TooltipTrigger asChild>
                       <div className="flex items-center gap-2 cursor-help">
                         <div className="flex-1 bg-muted rounded-full h-1.5 w-24">
                           <div
                             className="h-1.5 rounded-full transition-all duration-300"
                             style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${getGoalProgress()}%` }}
                           />
                         </div>
                         <span className="text-xs text-muted-foreground w-8 opacity-70">{getGoalProgress()}%</span>
                       </div>
                     </TooltipTrigger>
                     <TooltipContent>
                       <p>Update milestones to change progress</p>
                     </TooltipContent>
                   </Tooltip>
                 </TooltipProvider>
               ) : (
                // Interactive slider for goals without milestones
                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ElasticSlider
                     value={[getGoalProgress()]}
                     onValueChange={handleGoalProgressChange}
                     onValueCommit={handleGoalProgressCommit}
                     max={100}
                     step={5}
                     className="w-24"
                      showLabel={false}
                   />
                 </div>
                 <span className="text-xs text-muted-foreground w-8 opacity-70">{getGoalProgress()}%</span>
               </div>
              )}
            </div>
          </div>
          
          {/* Right side: Due date, avatar, and actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <UserAvatar
              key={goal.owner_id}
              userId={goal.owner_id}
              fullName={profile?.full_name}
              email={profile?.email}
              avatarUrl={profile?.avatar_url}
              size="sm"
              enableAssigneeSelect={true}
              assigneeTeamId={goal.team_id}
              selectedAssigneeId={goal.owner_id}
              showChevron={false}
              disableHoverScale={true}
              onAssigneeChange={async (newOwnerId) => {
                if (newOwnerId && newOwnerId !== goal.owner_id) {
                  const previousOwnerId = goal.owner_id;
                  const newOwnerName = getProfileName(newOwnerId);
                  
                  try {
                    const { supabase } = await import('@/integrations/supabase/client');
                    const { error } = await supabase
                      .from('team_goals')
                      .update({ 
                        owner_id: newOwnerId,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', goal.id);

                    if (error) throw error;

                    // Call the callback to update local state and broadcast to other users
                    onOwnerChange?.(goal.id, previousOwnerId, newOwnerId);

                    toast({
                      title: "Goal Owner Updated",
                      description: `Goal owner changed to ${newOwnerName}`,
                    });
                  } catch (error) {
                    logger.error('Error updating goal owner:', error);
                    toast({
                      title: "Error",
                      description: "Failed to update goal owner",
                      variant: "destructive",
                    });
                  }
                }
              }}
            />
            
            {goal.target_date && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`flex items-center gap-1 text-xs cursor-pointer hover:underline ${dateClasses}`}
                    onClick={e => e.stopPropagation()}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(goal.target_date + 'T12:00:00').toLocaleDateString()}</span>
                  </button>
                </PopoverTrigger>
                {onDateUpdate && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={new Date(goal.target_date + 'T12:00:00')}
                      onSelect={(date) => {
                        if (date) onDateUpdate(goal.id, date);
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                )}
              </Popover>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateIssue();
              }}
               className="h-9 w-9 p-0 opacity-30 hover:opacity-100 transition-opacity"
               title={`Create Issue for ${getProfileName(goal.owner_id)}`}
             >
               <AlertTriangle className="h-4 w-4" />
             </Button>

             {onEdit && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   onEdit(goal);
                 }}
                 className="h-9 w-9 p-0 opacity-30 hover:opacity-100 transition-opacity"
               >
                 <Edit className="h-4 w-4" />
               </Button>
             )}

             {onArchive && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   if (showArchived && onUnarchive) {
                     onUnarchive(goal.id);
                   } else if (onArchive) {
                     onArchive(goal.id);
                   }
                 }}
                 className="h-9 w-9 p-0 opacity-30 hover:opacity-100 transition-opacity"
                 title={showArchived ? "Unarchive goal" : "Archive goal"}
               >
                 <Archive className="h-4 w-4" />
               </Button>
             )}

             {/* Delete Button - Only show when archived */}
             {showArchived && onDelete && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   setShowDeleteConfirm(true);
                 }}
                 className="h-9 w-9 p-0 opacity-60 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete goal permanently"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Milestones/Tasks Section - Shows when expanded */}
        {isExpanded && (
          <div className="mt-4 border-t pt-4">
            <div className="space-y-3">
              {/* Loading state */}
              {isLoading && (
                <div className="text-sm text-muted-foreground py-2 pl-6 md:pl-8">
                  Loading milestones...
                </div>
              )}

              {/* Existing milestones */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={milestones.map(milestone => milestone.id)} strategy={verticalListSortingStrategy}>
                  {milestones.map((milestone) => {
                    const dueDate = milestone.due_date ? new Date(milestone.due_date + 'T12:00:00') : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
                    const isOverdue = dueDate && dueDate < today;
                    const isDueSoon = dueDate && dueDate >= today && dueDate <= threeDaysFromNow;

                    return (
                      <SortableMilestone
                        key={milestone.id}
                        milestone={milestone}
                        isOverdue={!!isOverdue}
                        isDueSoon={!!isDueSoon}
                        editingMilestoneId={editingMilestoneId}
                        editMilestoneTitle={editMilestoneTitle}
                        setEditMilestoneTitle={setEditMilestoneTitle}
                        editMilestoneDueDate={editMilestoneDueDate}
                        setEditMilestoneDueDate={setEditMilestoneDueDate}
                        editMilestoneDescription={editMilestoneDescription}
                        setEditMilestoneDescription={setEditMilestoneDescription}
                        handleSaveEditMilestone={handleSaveEditMilestone}
                        handleCancelEditMilestone={handleCancelEditMilestone}
                        handleEditMilestone={handleEditMilestone}
                        handleDeleteMilestone={handleDeleteMilestone}
                        getProgressValue={getProgressValue}
                        handleProgressChangeUI={handleProgressChangeUI}
                        handleProgressChangeCommit={handleProgressChangeCommit}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* Add new milestone */}
              <div className="space-y-2 pl-4 md:pl-6 pr-4 pt-1">
                <div className="flex items-center gap-3 py-1.5 px-2 rounded-[6px] bg-muted/30 hover:bg-muted/50 transition-colors">
                  <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isAddingMilestone) {
                        e.preventDefault();
                        handleAddMilestone();
                      }
                    }}
                    placeholder="Add a milestone..."
                    className="border-none shadow-none p-0 h-auto text-sm focus-visible:ring-0 bg-transparent"
                  />
                </div>
                
                {/* Show additional fields when user starts typing */}
                {newMilestoneTitle.trim() && (
                  <div className="ml-7 space-y-2">
                    <Textarea
                      value={newMilestoneDescription}
                      onChange={(e) => setNewMilestoneDescription(e.target.value)}
                      placeholder="Milestone description (optional)..."
                      className="border-none shadow-none p-0 h-auto text-sm focus-visible:ring-0 resize-none min-h-[60px]"
                    />
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <DatePicker
                          date={newMilestoneDueDate ? new Date(newMilestoneDueDate + 'T00:00:00') : undefined}
                          onSelect={(d) => setNewMilestoneDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                          placeholder="Pick a target date"
                        />
                      </div>
                      <Button
                        onClick={handleAddMilestone}
                        disabled={isAddingMilestone}
                        size="sm"
                        className="h-6 px-3 text-xs"
                      >
                        {isAddingMilestone ? 'Adding...' : 'Add Milestone'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete "{goal.title}" and all its milestones. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (onDelete) {
                logger.log('🗑️ DELETE COMPANY GOAL:', goal.id, goal.title);
                onDelete(goal.id);
              }
              setShowDeleteConfirm(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if goal data actually changed
  return (
    prevProps.goal.id === nextProps.goal.id &&
    prevProps.goal.title === nextProps.goal.title &&
    prevProps.goal.status === nextProps.goal.status &&
    prevProps.goal.progress === nextProps.goal.progress &&
    prevProps.goal.owner_id === nextProps.goal.owner_id &&
    prevProps.goal.target_date === nextProps.goal.target_date &&
    prevProps.goal.updated_at === nextProps.goal.updated_at
  );
});
