import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useCompanyGoals } from '@/hooks/useCompanyGoals';
import { useOptimizedProfileLookup } from '@/hooks/useOptimizedProfileLookup';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { useGoalsPermissions } from '@/hooks/useGoalsPermissions';
import { UserAvatar } from '@/components/UserAvatar';
import { Target, Shield, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useMultiCompanyAccess } from '@/hooks/useMultiCompanyAccess';
import { useGoalReorderBroadcast } from '@/hooks/meeting/useGoalReorderBroadcast';
import { AddGoalModal } from '@/components/modals/AddGoalModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { syncStatusFromProgress, syncProgressFromStatus, triggerCelebrationSafely } from '@/lib/goalProgressStatusSync';

const statusColors = {
  on_track: 'bg-success/15 text-success dark:bg-success/20 dark:text-success',
  off_track: 'bg-destructive/15 text-destructive dark:bg-destructive/20 dark:text-destructive',
  complete: 'bg-info/15 text-info dark:bg-info/20 dark:text-info',
  canceled: 'bg-muted text-muted-foreground'
};

const statusLabels = {
  on_track: 'On-Track',
  off_track: 'Off-Track',
  complete: 'Completed',
  canceled: 'Canceled'
};

interface CompanyGoalItemProps {
  goal: any;
  profile: any;
  updateGoal: (goalId: string, updates: any) => Promise<boolean>;
}

const CompanyGoalItem: React.FC<CompanyGoalItemProps> = ({ goal, profile, updateGoal }) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [progressValues, setProgressValues] = useState<{[key: string]: number}>({});
  const [goalProgressValue, setGoalProgressValue] = useState<number | null>(null);

  // Always load milestones for progress calculation
  const milestonesData = useGoalMilestones(goal?.id, progressValues, true);
  const { milestones = [], addMilestone, updateMilestone, progress = 0 } = milestonesData || {};
  
  // Get permissions
  const { canEditMilestone } = useGoalsPermissions(goal.team_id);

  // Calculate goal progress
  const getGoalProgress = () => {
    if (milestones.length > 0) {
      return Math.round(progress);
    }
    return goalProgressValue ?? goal.progress ?? 0;
  };

  // Reset local progress when database value changes
  React.useEffect(() => {
    setGoalProgressValue(null);
  }, [goal.progress]);

  const handleGoalProgressChange = useCallback((progressValue: number[]) => {
    setGoalProgressValue(progressValue[0]);
  }, []);

  const handleGoalProgressCommit = useCallback(async (progressValue: number[]) => {
    const newProgress = progressValue[0];
    const currentProgress = goal.progress ?? 0;
    
    // Check if status should sync with progress
    const syncResult = syncStatusFromProgress(currentProgress, newProgress, goal.status);
    
    try {
      const updates: any = { progress: newProgress };
      if (syncResult.status) {
        updates.status = syncResult.status;
      }
      
      await updateGoal(goal.id, updates);
      
      // Trigger celebration if goal was completed
      if (syncResult.shouldCelebrate) {
        triggerCelebrationSafely();
      }
      
      toast({
        title: "Progress updated",
        description: syncResult.status 
          ? `Goal progress set to ${newProgress}% and marked as ${statusLabels[syncResult.status]}`
          : `Goal progress set to ${newProgress}%`,
      });
    } catch (error) {
      setGoalProgressValue(null);
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
    }
  }, [goal.id, goal.progress, goal.status, updateGoal, toast]);

  const getProgressValue = (milestone: any) => {
    return progressValues[milestone.id] ?? milestone.progress ?? 0;
  };

  // Helper to check if all milestones are at 100%
  const areAllMilestonesComplete = () => {
    if (milestones.length === 0) return false;
    return milestones.every(m => {
      const progress = progressValues[m.id] ?? m.progress ?? 0;
      return progress === 100;
    });
  };

  // UI-only update for instant feedback during drag
  const handleMilestoneProgressChangeUI = (milestone: any, progressValue: number[]) => {
    const newProgress = progressValue[0];
    
    if (!canEditMilestone(goal, milestone)) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to edit this milestone",
        variant: "destructive",
      });
      return;
    }
    
    // Optimistically update the progress value
    setProgressValues(prev => ({ ...prev, [milestone.id]: newProgress }));
  };

  // Database commit when drag is complete
  const handleMilestoneProgressChangeCommit = async (milestone: any, progressValue: number[]) => {
    const newProgress = progressValue[0];
    const oldProgress = milestone.progress ?? 0;
    
    if (!canEditMilestone(goal, milestone)) {
      return;
    }
    
    const success = await updateMilestone(milestone.id, { progress: newProgress });
    if (success) {
      toast({
        title: "Progress updated",
        description: `Milestone progress set to ${newProgress}%`,
      });
      
      // Check if all milestones are now at 100% → auto-complete goal
      if (newProgress === 100 && areAllMilestonesComplete()) {
        if (goal.status !== 'complete') {
          await updateGoal(goal.id, { status: 'complete' });
          triggerCelebrationSafely();
          toast({
            title: "Goal completed!",
            description: "All milestones reached 100%",
          });
        }
      }
      // Check if goal should revert from complete → on_track
      else if (newProgress < 100 && goal.status === 'complete') {
        await updateGoal(goal.id, { status: 'on_track' });
        toast({
          title: "Goal reopened",
          description: "Status reverted to On-Track",
        });
      }
    } else {
      setProgressValues(prev => ({ ...prev, [milestone.id]: oldProgress }));
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const currentProgress = goal.progress ?? 0;
    
    // Check if progress should sync with status
    const syncResult = syncProgressFromStatus(newStatus, currentProgress);
    
    try {
      const updates: any = { status: newStatus };
      if (syncResult.progress !== undefined) {
        updates.progress = syncResult.progress;
      }
      
      // If status → "complete" and goal has milestones, set all to 100%
      if (newStatus === 'complete' && milestones.length > 0) {
        const updatePromises = milestones.map(m => 
          updateMilestone(m.id, { progress: 100 })
        );
        await Promise.all(updatePromises);
        
        // Update progressValues state for immediate UI feedback
        const newProgressValues: {[key: string]: number} = {};
        milestones.forEach(m => newProgressValues[m.id] = 100);
        setProgressValues(newProgressValues);
      }
      
      await updateGoal(goal.id, updates);
      
      // Trigger celebration if goal was marked complete
      if (syncResult.shouldCelebrate) {
        triggerCelebrationSafely();
      }
      
      toast({
        title: "Status updated",
        description: syncResult.progress !== undefined
          ? `Goal marked as ${statusLabels[newStatus as keyof typeof statusLabels]} and progress set to ${syncResult.progress}%`
          : `Goal status changed to ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update goal status",
        variant: "destructive",
      });
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestoneTitle.trim()) return;
    
    const success = await addMilestone(
      newMilestoneTitle.trim(),
      newMilestoneDescription.trim() || undefined,
      newMilestoneDueDate || undefined
    );
    if (success) {
      setNewMilestoneTitle('');
      setNewMilestoneDescription('');
      setNewMilestoneDueDate('');
      toast({
        title: "Milestone Added",
        description: `Added milestone: ${newMilestoneTitle}`,
      });
    }
  };

  const isDatePassed = goal.target_date && new Date(goal.target_date) < new Date();
  const dateClasses = isDatePassed ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className="group border rounded-lg hover:bg-muted/5 transition-colors overflow-hidden">
      {/* Mobile Layout */}
      <div className="md:hidden p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          
          <Select value={goal.status} onValueChange={handleStatusChange}>
            <SelectTrigger 
              className="w-fit border-0 p-1 h-fit bg-transparent [&>svg]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue asChild>
                <Badge className={`${statusColors[goal.status]} text-xs flex-shrink-0 cursor-pointer`}>
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
          
          <h4 className="font-semibold text-sm leading-tight flex-1 min-w-0">{goal.title}</h4>
        </div>
       
        {/* Progress bar */}
        {milestones.length > 0 && (
          <div className="ml-8 flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-1.5">
              <div
                className="bg-muted-foreground/50 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        )}
       
        {/* Owner */}
        <div className="ml-8">
          {profile ? (
            <UserAvatar 
              userId={goal.owner_id} 
              fullName={profile.full_name} 
              email={profile.email} 
              avatarUrl={profile.avatar_url} 
              size="sm" 
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center gap-3 p-4 overflow-hidden">
        {/* Left: Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0 flex-shrink-0"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        
        {/* Status Badge with Dropdown */}
        <div className="flex-shrink-0">
          <Select value={goal.status} onValueChange={handleStatusChange}>
            <SelectTrigger 
              className="w-fit border-0 p-1 h-fit bg-transparent [&>svg]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue asChild>
                <Badge className={`${statusColors[goal.status]} text-xs cursor-pointer`}>
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
        </div>
        
        {/* Goal Title - takes remaining space */}
        <h4 className="font-semibold text-base flex-1 min-w-0 leading-tight">{goal.title}</h4>
        
        {/* Progress Section - fixed width */}
        <div className="flex items-center gap-2 w-[180px] flex-shrink-0 overflow-hidden">
          {milestones.length > 0 ? (
            <>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-muted-foreground/50 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getGoalProgress()}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                {getGoalProgress()}%
              </span>
            </>
          ) : (
            <>
              <div onClick={(e) => e.stopPropagation()} className="flex-1">
                <ElasticSlider
                  value={[getGoalProgress()]}
                  onValueChange={handleGoalProgressChange}
                  onValueCommit={handleGoalProgressCommit}
                  max={100}
                  step={5}
                  showLabel={false}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                {getGoalProgress()}%
              </span>
            </>
          )}
        </div>
        
        {/* Owner Avatar */}
        <div className="flex-shrink-0 overflow-hidden">
          {profile ? (
            <UserAvatar 
              userId={goal.owner_id} 
              fullName={profile.full_name} 
              email={profile.email} 
              avatarUrl={profile.avatar_url} 
              size="sm" 
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
          )}
        </div>
      </div>

      {/* Milestones Section */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="mt-4 space-y-3">
            {milestones.map((milestone) => {
              const dueDate = milestone.due_date ? new Date(milestone.due_date + 'T12:00:00') : null;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isOverdue = dueDate && dueDate < today;
              const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
              const isDueSoon = dueDate && dueDate >= today && dueDate <= threeDaysFromNow;
              
              return (
                <div key={milestone.id} className="group flex items-start justify-between gap-4 p-3 rounded-lg border bg-card transition-all hover:shadow-sm pl-6 md:pl-8">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground">{milestone.title}</h4>
                    
                    {milestone.description && (
                      <p className="text-xs mt-1 text-muted-foreground">{milestone.description}</p>
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        {getProgressValue(milestone)}%
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ElasticSlider
                          value={[getProgressValue(milestone)]}
                          onValueChange={(value) => handleMilestoneProgressChangeUI(milestone, value)}
                          onValueCommit={(value) => handleMilestoneProgressChangeCommit(milestone, value)}
                          max={100}
                          step={5}
                          className="w-24"
                          showLabel={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Add new milestone form */}
            <div className="space-y-2 pl-6 md:pl-8">
              <div className="flex items-center gap-3">
                <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddMilestone();
                    }
                  }}
                  placeholder="Add a milestone..."
                  className="border-none shadow-none p-0 h-auto text-sm focus-visible:ring-0"
                />
              </div>
              
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
                      <DatePicker
                        date={newMilestoneDueDate ? new Date(newMilestoneDueDate + 'T00:00:00') : undefined}
                        onSelect={(d) => setNewMilestoneDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                        placeholder="Pick a target date"
                      />
                    </div>
                    <Button
                      onClick={handleAddMilestone}
                      size="sm"
                      className="h-6 px-3 text-xs"
                    >
                      Add Milestone
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CompanyGoalsForStrategyProps {
  teamId?: string;
}

export const CompanyGoalsForStrategy: React.FC<CompanyGoalsForStrategyProps> = ({ teamId }) => {
  const { currentCompany } = useMultiCompanyAccess();
  const { allTeams } = useOptimizedUserTeams();
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  
  const currentCompanyTeams = React.useMemo(() => 
    allTeams.filter(team => team.company_id === currentCompany?.id),
    [allTeams, currentCompany?.id]
  );

  // Find leadership team for pre-selecting in Add Goal modal
  const leadershipTeam = React.useMemo(() => 
    currentCompanyTeams.find(team => team.is_leadership),
    [currentCompanyTeams]
  );
  
  const {
    goals,
    loading,
    isLeadershipMember,
    updateGoal: rawUpdateGoal,
    setGoals
  } = useCompanyGoals(currentCompanyTeams);
  
  // Handle remote goal updates from broadcast
  const handleRemoteGoalUpdated = React.useCallback((
    goalId: string,
    updates: any,
    wasCompanyGoal: boolean,
    isCompanyGoal: boolean
  ) => {
    // Only handle company goals (isCompanyGoal should be true)
    if (!isCompanyGoal) return;
    
    // Update goals state directly with broadcast data
    setGoals(prev => 
      prev.map(g => g.id === goalId 
        ? { ...g, ...updates, updated_at: new Date().toISOString() } 
        : g
      )
    );
  }, [setGoals]);
  
  // Setup broadcast channel for real-time sync (only if teamId is provided)
  const { publishGoalUpdated } = useGoalReorderBroadcast(
    teamId || null,
    () => {}, // onRemoteReorder - not needed for updates
    undefined, // onRemoteOwnerChange - not needed
    undefined, // onRemoteGoalCreated - not needed
    undefined, // onRemoteGoalArchived - not needed
    handleRemoteGoalUpdated, // onRemoteGoalUpdated - this is what we need
    undefined // onRemoteMilestoneChanged - not needed
  );
  
  // Wrapper for updateGoal that also broadcasts
  const updateGoal = React.useCallback(async (goalId: string, updates: any) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return false;
    
    // Call original updateGoal
    const success = await rawUpdateGoal(goalId, updates);
    
    if (success && teamId) {
      // Broadcast the update to other participants
      publishGoalUpdated(
        goalId,
        updates,
        goal.is_company_goal || false,
        updates.is_company_goal ?? goal.is_company_goal ?? false
      );
    }
    
    return success;
  }, [goals, rawUpdateGoal, teamId, publishGoalUpdated]);
  
  const ownerIds = React.useMemo(() => goals.map(goal => goal.owner_id), [goals]);
  const { profiles } = useOptimizedProfileLookup(ownerIds);
  const getProfile = (userId: string) => profiles[userId];
  if (loading) {
    return <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Company Goals
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Key company-wide objectives
          </p>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded"></div>
        </div>
      </div>;
  }

  // Show access restricted message for non-leadership members
  if (!isLeadershipMember) {
    return <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">
            Company Goals
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Key company-wide objectives driving execution
          </p>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p>Leadership Access Only</p>
          <p className="text-sm mt-1">
            Company goals are only visible to leadership team members
          </p>
        </div>
      </div>;
  }
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">
          Company Goals
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Key company-wide objectives driving execution
        </p>
      </div>

      <div className="space-y-3">
        {goals.map(goal => {
          const profile = getProfile(goal.owner_id);
          return (
            <CompanyGoalItem
              key={goal.id}
              goal={goal}
              profile={profile}
              updateGoal={updateGoal}
            />
          );
        })}

        {goals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm">No company goals yet.</p>
            {leadershipTeam && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAddGoalModal(true)}
              >
                Add your first company goal
              </Button>
            )}
          </div>
        )}
      </div>

      {leadershipTeam && (
        <AddGoalModal
          open={showAddGoalModal}
          onOpenChange={setShowAddGoalModal}
          teamId={leadershipTeam.id}
          defaultIsCompanyGoal={true}
        />
      )}
    </div>
  );
};