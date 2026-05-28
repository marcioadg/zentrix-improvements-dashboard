import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarIcon, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { TeamGoal } from '@/hooks/useTeamGoals';
import { useMultipleTeamMembers } from '@/hooks/useMultipleTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useUserTeams } from '@/hooks/useUserTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useLeadershipAccess } from '@/hooks/useLeadershipAccess';
import { useUserTeamMemberships } from '@/hooks/useUserTeamMemberships';
import { MultiTeamSelector } from '@/components/goals/MultiTeamSelector';
import { OwnerSelectorWithDisabled } from '@/components/goals/OwnerSelectorWithDisabled';
import { useGoalMilestones } from '@/hooks/useGoalMilestones';
import { ElasticSlider } from '@/components/ui/elastic-slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface EditGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: TeamGoal | null;
  onUpdate: (goalId: string, updates: Partial<TeamGoal>) => Promise<boolean>;
  onDelete?: (goalId: string) => Promise<boolean>;
  teamId: string;
}

export const EditGoalModal: React.FC<EditGoalModalProps> = ({
  open,
  onOpenChange,
  goal,
  onUpdate,
  onDelete,
  teamId
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>();
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isCompanyGoal, setIsCompanyGoal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMilestones, setShowMilestones] = useState(true);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    dueDate: '',
    progress: 0
  });

  const {
    teams
  } = useUserTeams(false); // Show all company teams, not just user's teams
  
  // Fetch members from all selected teams
  const {
    allUsers,
    usersInAllTeams,
    getUserTeams,
    loading: loadingTeamMembers
  } = useMultipleTeamMembers(selectedTeamIds);
  
  const {
    profiles
  } = useProfiles();
  const {
    user
  } = useAuth();
  const {
    isLeadershipMember
  } = useLeadershipAccess(teamId);

  // Fetch team memberships for the selected owner
  const { 
    teamIds: ownerTeamIds, 
    loading: loadingOwnerTeams 
  } = useUserTeamMemberships(ownerId);

  // Milestone management
  const { 
    milestones = [], 
    addMilestone,
    updateMilestone,
    deleteMilestone
  } = useGoalMilestones(goal?.id, {}, true) || {};

  // Check if user can manage company goals (only one team selected and it's a leadership team)
  const canManageCompanyGoals = useMemo(() => {
    return selectedTeamIds.length === 1 && 
           teams.some(t => t.id === selectedTeamIds[0] && t.is_leadership);
  }, [selectedTeamIds, teams]);

  // Calculate which teams should be disabled and why
  const { disabledTeamIds, disabledReasons } = useMemo(() => {
    const disabled: string[] = [];
    const reasons: Record<string, string> = {};

    logger.log('🔍 Calculating disabled teams:', {
      isCompanyGoal,
      ownerId,
      loadingOwnerTeams,
      ownerTeamIds,
      teamsCount: teams.length
    });

    teams.forEach(team => {
      // Rule 1: Disable non-leadership teams when isCompanyGoal is true
      if (isCompanyGoal && !team.is_leadership) {
        disabled.push(team.id);
        reasons[team.id] = "Company goals can only be assigned to leadership teams";
        logger.log(`  ❌ Team ${team.name} disabled: not leadership (company goal)`);
        return;
      }
      
      // Rule 2: Disable teams where owner is not a member
      if (ownerId && !loadingOwnerTeams && !ownerTeamIds.includes(team.id)) {
        disabled.push(team.id);
        reasons[team.id] = "Goal owner is not a member of this team";
        logger.log(`  ❌ Team ${team.name} disabled: owner not a member`);
        return;
      }
    });

    return { disabledTeamIds: disabled, disabledReasons: reasons };
  }, [teams, isCompanyGoal, ownerId, loadingOwnerTeams, ownerTeamIds]);

  // Calculate which users should be disabled and why
  const { disabledOwnerIds, disabledOwnerReasons } = useMemo(() => {
    const disabled: string[] = [];
    const reasons: Record<string, string> = {};

    if (selectedTeamIds.length === 0) {
      // No teams selected - no restrictions
      return { disabledOwnerIds: disabled, disabledOwnerReasons: reasons };
    }

    logger.log('🔍 Calculating disabled owners:', {
      selectedTeamIds,
      allUsersCount: allUsers.length,
      usersInAllTeamsCount: usersInAllTeams.length
    });

    allUsers.forEach(user => {
      // User must be in ALL selected teams
      if (!usersInAllTeams.includes(user.id)) {
        disabled.push(user.id);
        
        // Build reason: which teams are they missing from?
        const userTeams = getUserTeams(user.id);
        const missingTeams = selectedTeamIds
          .filter(teamId => !userTeams.includes(teamId))
          .map(teamId => {
            const team = teams.find(t => t.id === teamId);
            return team?.name || 'Unknown Team';
          });
        
        reasons[user.id] = `Not a member of: ${missingTeams.join(', ')}`;
        logger.log(`  ❌ User ${user.full_name} disabled: missing teams ${missingTeams.join(', ')}`);
      }
    });

    return { disabledOwnerIds: disabled, disabledOwnerReasons: reasons };
  }, [allUsers, usersInAllTeams, selectedTeamIds, getUserTeams, teams]);

  useEffect(() => {
    if (goal && open) {
      logger.log('EditGoalModal - Setting up goal:', goal);
      setTitle(goal.title);
      setDescription(goal.description || '');
      setOwnerId(goal.owner_id);

      // Fix date handling - ensure proper date parsing without timezone issues
      if (goal.target_date) {
        try {
          // Parse date string in YYYY-MM-DD format avoiding timezone conversion
          const dateStr = goal.target_date.split('T')[0]; // Remove time component if present
          const [year, month, day] = dateStr.split('-').map(Number);
          const dateValue = new Date(year, month - 1, day); // month is 0-indexed

          // Check if the date is valid
          if (!isNaN(dateValue.getTime())) {
            setTargetDate(dateValue);
          } else {
            logger.warn('Invalid date found in goal:', goal.target_date);
            setTargetDate(undefined);
          }
        } catch (error) {
          logger.error('Error parsing date:', error);
          setTargetDate(undefined);
        }
      } else {
        setTargetDate(undefined);
      }

      // Set company goal status first
      setIsCompanyGoal(goal.is_company_goal || false);

      // Set selected teams - if goal has team assignments, use those, otherwise use current team
      if (goal.team_assignments && goal.team_assignments.length > 0) {
        const teamIds = goal.team_assignments.map(assignment => assignment.team_id);
        logger.log('Setting team IDs from assignments:', teamIds);
        setSelectedTeamIds(teamIds);
      } else if (goal.team_id) {
        const defaultTeamIds = [goal.team_id];
        logger.log('Setting default team IDs:', defaultTeamIds);
        setSelectedTeamIds(defaultTeamIds);
      } else if (teamId) {
        const defaultTeamIds = [teamId];
        logger.log('Setting fallback team IDs:', defaultTeamIds);
        setSelectedTeamIds(defaultTeamIds);
      } else {
        logger.log('No team ID available, setting empty array');
        setSelectedTeamIds([]);
      }
    } else if (!open) {
      // Reset form when modal closes
      setSelectedTeamIds([]);
      setAddingMilestone(false);
      setEditingMilestone(null);
      setNewMilestone({ title: '', description: '', dueDate: '', progress: 0 });
      
      // Trigger a refetch of milestones in parent components after modal closes
      if (goal?.id) {
        // Clear the milestone cache for this goal to force refresh
        const event = new CustomEvent('milestone-cache-invalidate', { 
          detail: { goalId: goal.id } 
        });
        window.dispatchEvent(event);
      }
    }
  }, [goal, open, teamId]);

  const getProfileName = (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    return profile ? profile.full_name : 'Unknown User';
  };

  const formatDateForDatabase = (date: Date): string => {
    // Use ISO format but only the date part to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    // Team and owner are now mandatory
    if (!goal || !title.trim() || selectedTeamIds.length === 0 || !ownerId) {
      logger.log('Validation failed:', {
        goal: !!goal,
        title: title.trim(),
        selectedTeamIds,
        ownerId,
        hasTeam: selectedTeamIds.length > 0,
        hasOwner: !!ownerId
      });
      return;
    }

    logger.log('Submitting goal update:', {
      goalId: goal.id,
      title: title.trim(),
      selectedTeamIds,
      team_assignments: selectedTeamIds.map(teamId => ({
        team_id: teamId
      })),
      targetDate,
      isCompanyGoal,
      canManageCompanyGoals
    });

    setLoading(true);
    const updates: Partial<TeamGoal> = {
      title: title.trim(),
      description: description.trim() || undefined,
      owner_id: ownerId,
      target_date: targetDate ? formatDateForDatabase(targetDate) : undefined
    };

    // Only add team-related fields if there are selected teams
    if (selectedTeamIds.length > 0) {
      updates.team_id = selectedTeamIds[0]; // Primary team
      updates.team_assignments = selectedTeamIds.map(teamId => ({
        team_id: teamId
      }));
    }

    // Only update company goal status if user has permission
    if (canManageCompanyGoals) {
      updates.is_company_goal = isCompanyGoal;
    }

    const success = await onUpdate(goal.id, updates);
    if (success) {
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    logger.log('Date selected:', date);
    setTargetDate(date);
  };

  const handleTeamSelectionChange = (teamIds: string[]) => {
    logger.log('EditGoalModal - Team selection changed:', teamIds);
    setSelectedTeamIds(teamIds);
  };

  // Milestone handlers
  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    
    try {
      const success = await addMilestone(
        newMilestone.title.trim(),
        newMilestone.description.trim() || undefined,
        newMilestone.dueDate || undefined,
        newMilestone.progress
      );
      
      if (success) {
        setNewMilestone({ title: '', description: '', dueDate: '', progress: 0 });
        setAddingMilestone(false);
        toast.success('Milestone added');
        
        // Notify other components to refresh milestones immediately
        if (goal?.id) {
          window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { detail: { goalId: goal.id } }));
        }
      }
    } catch (error) {
      logger.error('Error adding milestone:', error);
      toast.error('Failed to add milestone');
    }
  };

  const handleUpdateMilestone = async (milestoneId: string, updates: any) => {
    try {
      await updateMilestone(milestoneId, updates);
      setEditingMilestone(null);
      toast.success('Milestone updated');
      if (goal?.id) {
        window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { detail: { goalId: goal.id } }));
      }
    } catch (error) {
      logger.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    try {
      await deleteMilestone(milestoneId);
      toast.success('Milestone deleted');
      if (goal?.id) {
        window.dispatchEvent(new CustomEvent('milestone-cache-invalidate', { detail: { goalId: goal.id } }));
      }
    } catch (error) {
      logger.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const handleDeleteGoal = async () => {
    if (!goal || !onDelete) return;
    
    const confirmed = window.confirm('Archive this goal? You can restore it later from archived goals.');
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const success = await onDelete(goal.id);
      if (success) {
        toast.success('Goal archived successfully');
        onOpenChange(false);
      } else {
        toast.error('Failed to archive goal');
      }
    } catch (error) {
      logger.error('Error archiving goal:', error);
      toast.error('Failed to archive goal');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl overflow-y-auto flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <div className="space-y-4 py-4 overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              onKeyDown={handleKeyDown}
              placeholder="Goal title" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Goal description (optional)" 
              rows={3} 
            />
          </div>

          <div className="space-y-2">
            <Label>Teams</Label>
            <MultiTeamSelector 
              teams={teams} 
              selectedTeamIds={selectedTeamIds} 
              onSelectionChange={handleTeamSelectionChange} 
              placeholder="Select teams for this goal"
              disabledTeamIds={disabledTeamIds}
              disabledReasons={disabledReasons}
              disabled={isCompanyGoal}
            />
          </div>

          <div className="space-y-2">
            <Label>Owner</Label>
            <OwnerSelectorWithDisabled
              users={allUsers}
              selectedUserId={ownerId}
              onUserChange={setOwnerId}
              disabledUserIds={disabledOwnerIds}
              disabledReasons={disabledOwnerReasons}
              loading={loadingTeamMembers}
            />
          </div>

          {canManageCompanyGoals && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="company-goal" 
                checked={isCompanyGoal} 
                onCheckedChange={checked => setIsCompanyGoal(checked as boolean)} 
              />
              <Label htmlFor="company-goal" className="text-sm font-normal cursor-pointer">
                Make this a company goal (visible in strategy execution tab)
              </Label>
            </div>
          )}

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal", 
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={targetDate} 
                  onSelect={handleDateSelect} 
                  initialFocus 
                  className="p-3 pointer-events-auto" 
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Milestones Section */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Label>Milestones ({milestones.length})</Label>
            </div>

            <div className="border rounded-md p-3 space-y-3 bg-muted/20">
              {/* Existing Milestones */}
              {milestones.map((milestone) => (
                <div key={milestone.id} className="border rounded p-2 bg-background">
                  {editingMilestone?.id === milestone.id ? (
                    /* Edit Form */
                    <div className="space-y-2">
                      <Input
                        value={editingMilestone.title}
                        onChange={(e) => setEditingMilestone({...editingMilestone, title: e.target.value})}
                        placeholder="Milestone title"
                      />
                      <Textarea
                        value={editingMilestone.description || ''}
                        onChange={(e) => setEditingMilestone({...editingMilestone, description: e.target.value})}
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <DatePicker
                        date={editingMilestone.due_date ? new Date(editingMilestone.due_date + 'T00:00:00') : undefined}
                        onSelect={(d) => setEditingMilestone({...editingMilestone, due_date: d ? format(d, 'yyyy-MM-dd') : ''})}
                        placeholder="Pick a target date"
                      />
                      <div className="space-y-1">
                        <Label className="text-xs">Progress: {editingMilestone.progress || 0}%</Label>
                        <ElasticSlider
                          value={[editingMilestone.progress || 0]}
                          onValueChange={(value) => setEditingMilestone({...editingMilestone, progress: value[0]})}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateMilestone(milestone.id, editingMilestone)}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingMilestone(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Form */
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{milestone.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {milestone.progress || 0}%
                          </span>
                        </div>
                        {milestone.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(milestone.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditingMilestone(milestone)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-red-700"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Milestone */}
              {addingMilestone ? (
                <div className="border rounded p-2 bg-background space-y-2">
                  <Input
                    value={newMilestone.title}
                    onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                    placeholder="Milestone title"
                  />
                  <Textarea
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                    placeholder="Description (optional)"
                    rows={2}
                  />
                  <DatePicker
                    date={newMilestone.dueDate ? new Date(newMilestone.dueDate + 'T00:00:00') : undefined}
                    onSelect={(d) => setNewMilestone({...newMilestone, dueDate: d ? format(d, 'yyyy-MM-dd') : ''})}
                    placeholder="Pick a target date"
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">Progress: {newMilestone.progress}%</Label>
                    <ElasticSlider
                      value={[newMilestone.progress]}
                      onValueChange={(value) => setNewMilestone({...newMilestone, progress: value[0]})}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddMilestone}
                      disabled={!newMilestone.title.trim()}
                    >
                      Add
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setAddingMilestone(false);
                        setNewMilestone({ title: '', description: '', dueDate: '', progress: 0 });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingMilestone(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          {onDelete && (
            <Button 
              variant="destructive" 
              onClick={handleDeleteGoal}
              disabled={loading}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Archive Goal
            </Button>
          )}
          <div className="flex space-x-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={loading || !title.trim() || selectedTeamIds.length === 0 || !ownerId}
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </TooltipTrigger>
                {(!title.trim() || selectedTeamIds.length === 0 || !ownerId) && (
                  <TooltipContent side="top">
                    <p className="text-xs">
                      {!title.trim() && "Title is required. "}
                      {selectedTeamIds.length === 0 && "At least one team is required. "}
                      {!ownerId && "An owner is required."}
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
