import React, { useState, useEffect, useCallback, memo } from 'react';
import { updateMilestoneProgress } from '@/hooks/useMilestoneProgress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { UserAvatar } from '@/components/UserAvatar';
import { Calendar, Archive, Trash2, Edit, AlertTriangle, ChevronDown, ChevronRight, Plus, CheckCircle2, Circle, MoreHorizontal, GripVertical } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { useSimpleIssues } from '@/hooks/useSimpleIssues';
import { useToast } from '@/hooks/use-toast';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { useGoalsPermissions } from '@/hooks/useGoalsPermissions';
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

interface GoalItemProps {
  goal: TeamGoal;
  onStatusUpdate: (goalId: string, status: TeamGoal['status']) => void;
  onArchive: (goalId: string) => void;
  onUnarchive?: (goalId: string) => void;
  onDelete?: (goalId: string) => void;
  onEdit: (goal: TeamGoal) => void;
  onProgressUpdate?: (goalId: string, progress: number) => Promise<boolean>;
  onDateUpdate?: (goalId: string, date: Date) => void;
  onOwnerChange?: (goalId: string, newOwnerId: string) => Promise<boolean>;
  onMilestoneChanged?: (goalId: string, action: 'created' | 'updated' | 'deleted', milestoneId?: string) => void;
  getProfileName: (userId: string) => string;
  getProfile: (userId: string) => any;
  teamId: string;
  showArchived?: boolean;
}

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
    <div ref={setNodeRef} style={style} className="relative group pl-6 md:pl-8">
      {/* Drag Handle - Hidden on mobile */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 opacity-30 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hidden md:block"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Milestone content with responsive padding */}
      <div className="md:pl-8">
        {editingMilestoneId === milestone.id ? (
          /* Edit Form */
          <div className="rounded-[6px] p-4 space-y-3 bg-muted/50 border border-border">
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Title</label>
                  <Input
                    value={editMilestoneTitle}
                    onChange={(e) => setEditMilestoneTitle(e.target.value)}
                    className="mt-1 text-sm"
                    placeholder="Milestone title..."
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                  <DatePicker
                    date={editMilestoneDueDate ? new Date(editMilestoneDueDate + 'T00:00:00') : undefined}
                    onSelect={(d) => setEditMilestoneDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                    placeholder="Pick a target date"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSaveEditMilestone}
                    size="sm"
                    className="h-7 px-3 text-xs"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelEditMilestone}
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={editMilestoneDescription}
                  onChange={(e) => setEditMilestoneDescription(e.target.value)}
                  className="mt-1 text-sm resize-none"
                  placeholder="Milestone description (optional)..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Normal Display */
          <div
            className="group flex items-start justify-between gap-4 p-3 rounded-[6px] border bg-card transition-colors duration-150 hover:shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => handleEditMilestone(milestone)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditMilestone(milestone); } }}
            tabIndex={0}
            role="button"
          >
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground">
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
                        ? '[color:var(--warning)] font-medium'
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
                className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive opacity-60"
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

export const GoalItem: React.FC<GoalItemProps> = memo(({
  goal,
  onStatusUpdate,
  onArchive,
  onUnarchive,
  onDelete,
  onEdit,
  onProgressUpdate,
  onDateUpdate,
  onOwnerChange,
  onMilestoneChanged,
  getProfileName,
  getProfile,
  teamId,
  showArchived = false,
}) => {
  const { addIssue } = useSimpleIssues(teamId, undefined, undefined, undefined, { silent: true });
  const { toast } = useToast();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [progressValues, setProgressValues] = useState<{[key: string]: number}>({});
  const [editMilestoneTitle, setEditMilestoneTitle] = useState('');
  const [editMilestoneDescription, setEditMilestoneDescription] = useState('');
  const [editMilestoneDueDate, setEditMilestoneDueDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Always load milestones for progress calculation, regardless of expansion state
  const milestonesData = useGoalMilestones(goal?.id, progressValues, true);
  const { milestones = [], addMilestone, updateMilestone, deleteMilestone, reorderMilestones, progress = 0 } = milestonesData || {};
  
  // Get permissions for goal and milestone editing
  const { canEditGoal, canEditMilestone } = useGoalsPermissions(teamId);

  // Calculate goal progress - use milestones average if they exist, otherwise use direct progress
  const getGoalProgress = () => {
    if (milestones.length > 0) {
      return Math.round(progress); // Use calculated average from milestones
    }
    // Use local progress value if available, otherwise use database value
    return goalProgressValue ?? goal.progress ?? 0;
  };

  const [goalProgressValue, setGoalProgressValue] = useState<number | null>(null);

  // Reset local progress state when goal.progress changes from database
  useEffect(() => {
    setGoalProgressValue(null);
  }, [goal.progress]);

  const handleGoalProgressChange = useCallback((progressValue: number[]) => {
    const newProgress = progressValue[0];
    setGoalProgressValue(newProgress);
  }, []);

  const handleGoalProgressCommit = useCallback(async (progressValue: number[]) => {
    const newProgress = progressValue[0];
    
    // Don't allow progress updates for temporary goals
    if (goal.id.startsWith('temp-')) {
      toast({
        title: "Goal is being saved",
        description: "Please wait for the goal to be saved before updating progress",
        variant: "default",
      });
      setGoalProgressValue(null); // Reset to original value
      return;
    }
    
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
    if (progressValues[milestone.id] !== undefined) {
      return progressValues[milestone.id];
    }
    
    // Use saved progress from database if available
    if (milestone.progress !== undefined && milestone.progress !== null) {
      return milestone.progress;
    }
    
    // Default to 0 if no progress is set
    return 0;
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
      logger.log('❌ Failed to save progress, reverting...');
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

  const handleStatusChange = (newStatus: string) => {
    // If completing goal with milestones, update progress state immediately
    if (newStatus === 'complete' && milestones.length > 0) {
      const optimisticProgress: {[key: string]: number} = {};
      milestones.forEach(milestone => {
        optimisticProgress[milestone.id] = 100;
      });
      setProgressValues(prev => ({ ...prev, ...optimisticProgress }));
    }
    onStatusUpdate(goal.id, newStatus as TeamGoal['status']);
  };

  const handleCreateIssue = async () => {
    const { generateGoalIssueTitle, generateGoalIssueDescription } = await import('@/utils/goalIssueUtils');
    
    const goalData = { ...goal, is_company_goal: false };
    const issueTitle = generateGoalIssueTitle(goalData);
    const issueDescription = generateGoalIssueDescription(goalData, getProfileName);

    logger.log('GoalItem: Creating issue for goal:', {
      goalId: goal.id,
      goalTitle: goal.title,
      ownerId: goal.owner_id,
      ownerName: getProfileName(goal.owner_id),
      teamId: teamId,
      issueTitle: issueTitle
    });
    
    const success = await addIssue(issueTitle, issueDescription, 'short_term', goal.owner_id);
    
    if (success) {
      logger.log('GoalItem: Issue created successfully for goal:', goal.title);
      toast({
        title: "Issue Created",
        description: `Issue created for goal: ${goal.title}`,
      });
    } else {
      logger.error('GoalItem: Issue creation not completed (likely duplicate handled upstream):', goal.title);
      // Suppress generic error toast; useSimpleIssues shows detailed duplicate/error toasts
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
      const success = await addMilestone(titleToAdd, descToAdd, dateToAdd);
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


  const handleDeleteMilestone = async (milestoneId: string, milestoneTitle: string) => {
    if (confirm(`Are you sure you want to delete "${milestoneTitle}"?`)) {
      const success = await deleteMilestone(milestoneId);
      if (success) {
        onMilestoneChanged?.(goal.id, 'deleted', milestoneId);
        toast({
          title: "Milestone Deleted",
          description: `Deleted milestone: ${milestoneTitle}`,
        });
      }
    }
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestoneId(milestone.id);
    setEditMilestoneTitle(milestone.title);
    setEditMilestoneDescription(milestone.description || '');
    setEditMilestoneDueDate(milestone.due_date || '');
  };

  const handleSaveEditMilestone = async () => {
    if (!editingMilestoneId || !editMilestoneTitle.trim()) {
      toast({
        title: "Error", 
        description: "Milestone title is required",
        variant: "destructive",
      });
      return;
    }

    const success = await updateMilestone(editingMilestoneId, {
      title: editMilestoneTitle.trim(),
      description: editMilestoneDescription.trim() || undefined,
      due_date: editMilestoneDueDate || undefined
    });

    if (success) {
      onMilestoneChanged?.(goal.id, 'updated', editingMilestoneId);
      setEditingMilestoneId(null);
      setEditMilestoneTitle('');
      setEditMilestoneDescription('');
      setEditMilestoneDueDate('');
      toast({
        title: "Milestone Updated",
        description: "Milestone updated successfully",
      });
    }
  };

  const handleCancelEditMilestone = () => {
    setEditingMilestoneId(null);
    setEditMilestoneTitle('');
    setEditMilestoneDescription('');
    setEditMilestoneDueDate('');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = milestones.findIndex((milestone) => milestone.id === active.id);
      const newIndex = milestones.findIndex((milestone) => milestone.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder the milestones array
        const reorderedMilestones = arrayMove(milestones, oldIndex, newIndex);
        const reorderedIds = reorderedMilestones.map(milestone => milestone.id);
        
        // Call the reorder function
        await reorderMilestones(reorderedIds);
      }
    }
  };

  return (
    <>
      <Card className="border-0 shadow-none bg-transparent transition-all duration-200">
        <CardContent className="p-0">
         {/* Mobile Layout */}
         <div className="md:hidden space-y-3">
           <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-2 min-w-0 flex-1">
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   toggleExpanded();
                 }}
                  className="h-7 w-7 p-0 flex-shrink-0"
               >
                 {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
               </Button>
               
               <Select key={`goal-status-${goal.id}-${goal.status}`} value={goal.status} onValueChange={handleStatusChange}>
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
               
                <h4 
                  className={`font-semibold text-sm leading-tight flex-1 min-w-0 truncate ${showArchived ? 'text-muted-foreground' : ''}`}
                  onClick={() => onEdit(goal)}
                  title={goal.title}
                >
                  {goal.title}
                </h4>
             </div>
           </div>
          
           {/* Progress bar - Only show if milestones exist */}
           {milestones.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-8 flex items-center gap-2 cursor-help">
                      <div className="flex-1 bg-muted rounded-full h-1.5 w-24">
                        <div
                          className="h-1.5 rounded-full transition-all duration-300"
                          style={{ background: "var(--btn-bg, hsl(var(--primary)))", width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground opacity-70">{progress}%</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Update milestones to change progress</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
           )}
          
          {/* Bottom row: Date and Actions */}
          <div className="flex items-center justify-between">
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
            
            <div className="flex items-center gap-1">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(goal);
                }}
                className="h-9 w-9 p-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (showArchived && onUnarchive) {
                    onUnarchive(goal.id);
                  } else {
                    onArchive(goal.id);
                  }
                }}
                className="h-9 w-9 p-0 opacity-60 hover:opacity-100 transition-opacity"
                title={showArchived ? "Unarchive goal" : "Archive goal"}
              >
                <Archive className="h-4 w-4" />
              </Button>

              {/* Delete Button - Only show when archived */}
              {showArchived && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="h-9 w-9 p-0 opacity-60 hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Delete goal permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between gap-4">
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
            
            <Select key={`goal-status-desktop-${goal.id}-${goal.status}`} value={goal.status} onValueChange={handleStatusChange}>
              <SelectTrigger 
                className="w-fit border-0 p-1 h-fit bg-transparent [&>svg]:hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue asChild>
                  <Badge className={`${statusColors[goal.status]} text-xs flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80`}>
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
            
            <h4
              role="button"
              tabIndex={0}
              className="font-semibold text-base flex-1 min-w-0 truncate cursor-pointer leading-tight hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm"
              onClick={() => onEdit(goal)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(goal); } }}
              title={goal.title}
            >
              {goal.title}
            </h4>
            
            {/* Progress section for desktop */}
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
                 // Always show slider for goals without milestones
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
          
          {/* Right side: Due date and actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
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

             <Button
               variant="ghost"
               size="sm"
               onClick={(e) => {
                 e.stopPropagation();
                 if (showArchived && onUnarchive) {
                   onUnarchive(goal.id);
                 } else {
                   onArchive(goal.id);
                 }
               }}
               className="h-9 w-9 p-0 opacity-30 hover:opacity-100 transition-opacity"
               title={showArchived ? "Unarchive goal" : "Archive goal"}
             >
               <Archive className="h-4 w-4" />
             </Button>

             {/* Delete Button - Only show when archived */}
             {showArchived && onDelete && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={(e) => {
                   e.stopPropagation();
                   setShowDeleteConfirm(true);
                 }}
                 className="h-9 w-9 p-0 opacity-30 hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
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
                        isOverdue={isOverdue}
                        isDueSoon={isDueSoon}
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
              
              {/* Add new task form */}
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
                    className="border-none shadow-none bg-transparent px-0 py-0 h-7 text-sm focus-visible:ring-0 flex-1"
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
});

GoalItem.displayName = 'GoalItem';
