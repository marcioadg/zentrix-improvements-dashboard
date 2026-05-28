
import React, { useState, useEffect, useMemo } from 'react';
import { BaseModal } from './BaseModal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { MultiTeamSelector } from '@/components/goals/MultiTeamSelector';
import { OwnerSelectorWithDisabled } from '@/components/goals/OwnerSelectorWithDisabled';
import { useGoals } from '@/hooks/useGoals';
import { useTeamGoals } from '@/hooks/useTeamGoals';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedUserTeams } from '@/hooks/useOptimizedUserTeams';
import { useMultipleTeamMembers } from '@/hooks/useMultipleTeamMembers';
import { getEndOfCurrentQuarter } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface AddGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId?: string;
  isTeamGoal?: boolean;
  onSuccess?: () => void;
  defaultIsCompanyGoal?: boolean;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({ 
  open, 
  onOpenChange, 
  teamId = '', 
  isTeamGoal = false,
  onSuccess,
  defaultIsCompanyGoal = false
}) => {
  const { addGoal: addIndividualGoal } = useGoals();
  const { user } = useAuth();
  const { teams, loading: teamsLoading, error: teamsError } = useOptimizedUserTeams();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(teamId ? [teamId] : []);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isCompanyGoal, setIsCompanyGoal] = useState(defaultIsCompanyGoal);
  const [loading, setLoading] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Get team members from all selected teams
  const { allUsers: allTeamMembers, usersInAllTeams, getUserTeams, loading: loadingMembers } = useMultipleTeamMembers(selectedTeamIds);

  // Calculate which users should be disabled (not in all selected teams)
  const { disabledOwnerIds, disabledOwnerReasons } = useMemo(() => {
    const disabled: string[] = [];
    const reasons: Record<string, string> = {};

    if (selectedTeamIds.length === 0) {
      return { disabledOwnerIds: disabled, disabledOwnerReasons: reasons };
    }

    allTeamMembers.forEach(user => {
      if (!usersInAllTeams.includes(user.id)) {
        disabled.push(user.id);
        
        const userTeams = getUserTeams(user.id);
        const missingTeams = selectedTeamIds
          .filter(teamId => !userTeams.includes(teamId))
          .map(teamId => {
            const team = teams.find(t => t.id === teamId);
            return team?.name || 'Unknown Team';
          });
        
        reasons[user.id] = `Not a member of: ${missingTeams.join(', ')}`;
      }
    });

    return { disabledOwnerIds: disabled, disabledOwnerReasons: reasons };
  }, [selectedTeamIds, allTeamMembers, usersInAllTeams, getUserTeams, teams]);

  // Initialize the hook with the first selected team ID
  const primaryTeamId = selectedTeamIds.length > 0 ? selectedTeamIds[0] : '';
  const { addGoal: addTeamGoal } = useTeamGoals(primaryTeamId);

  // Check if user can manage company goals (only one team selected and it's a leadership team)
  const canManageCompanyGoals = useMemo(() => {
    return selectedTeamIds.length === 1 && 
           teams.some(t => t.id === selectedTeamIds[0] && t.is_leadership);
  }, [selectedTeamIds, teams]);

  // Set default target date to end of current quarter when modal opens
  useEffect(() => {
    if (open && !targetDate) {
      const quarterEndDate = getEndOfCurrentQuarter();
      setTargetDate(quarterEndDate);
    }
  }, [open, targetDate]);

  // Sync isCompanyGoal with defaultIsCompanyGoal when modal opens
  useEffect(() => {
    if (open && defaultIsCompanyGoal) {
      setIsCompanyGoal(true);
    }
  }, [open, defaultIsCompanyGoal]);


  // Auto-assign current user as owner if they're in ALL selected teams
  useEffect(() => {
    if (!selectedOwnerId && user?.id && usersInAllTeams.includes(user.id)) {
      setSelectedOwnerId(user.id);
    }
  }, [selectedTeamIds, user?.id, selectedOwnerId, usersInAllTeams]);

  // Handle team selection changes
  const handleTeamSelectionChange = (teamIds: string[]) => {
    logger.log('Team selection changed:', teamIds);
    setSelectedTeamIds(teamIds);
    
    // Reset owner if they're not in all selected teams
    if (selectedOwnerId && !allTeamMembers.some(member => member.id === selectedOwnerId)) {
      setSelectedOwnerId('');
    }
    
    // Reset company goal checkbox if multiple teams or non-leadership team
    if (teamIds.length !== 1 || !teams.some(t => t.id === teamIds[0] && t.is_leadership)) {
      setIsCompanyGoal(false);
    }
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (loading) return;
    
    // Validate all required fields: title, teams, and owner
    if (!title.trim() || selectedTeamIds.length === 0 || !selectedOwnerId) {
      setAttemptedSubmit(true);
      logger.log('Validation failed:', {
        title: title.trim(),
        selectedTeamIds,
        selectedOwnerId,
        hasTitle: !!title.trim(),
        hasTeams: selectedTeamIds.length > 0,
        hasOwner: !!selectedOwnerId
      });
      return;
    }

    setLoading(true);
    try {
      // Dispatch optimistic event for onboarding
      logger.log('🎯 AddGoalModal: Dispatching optimistic goal creation event for onboarding');
      window.dispatchEvent(new CustomEvent('optimistic-goal-creation'));
      
      // Create the goal with the first team as primary
      const success = await addTeamGoal(
        title.trim(),
        description.trim() || undefined,
        selectedOwnerId,
        targetDate || undefined,
        isCompanyGoal
      );

      // Add additional team assignments if multiple teams selected
      if (success && typeof success === 'object' && success.id && selectedTeamIds.length > 1) {
        const additionalTeams = selectedTeamIds.slice(1); // Skip first team (already assigned)
        
        for (const teamId of additionalTeams) {
          const { error: assignmentError } = await supabase
            .from('goal_team_assignments')
            .insert({
              goal_id: success.id,
              team_id: teamId
            });

          if (assignmentError) {
            logger.error('Error adding additional team assignment:', assignmentError);
          }
        }
      }

      if (success) {
        // Dispatch multiple events to ensure all goal views update immediately
        logger.log('🎯 AddGoalModal: Dispatching goal creation events');
        
        // Dispatch event for each team
        selectedTeamIds.forEach(teamId => {
          window.dispatchEvent(new CustomEvent('meeting-goal-created', {
            detail: {
              team_id: teamId,
              goal_id: typeof success === 'object' ? success.id : success,
              owner_id: selectedOwnerId,
              title: title.trim()
            }
          }));
        });
        
        // Also dispatch a general goal creation event for the goals page
        window.dispatchEvent(new CustomEvent('goal-created-success', {
          detail: {
            team_ids: selectedTeamIds,
            goal_id: typeof success === 'object' ? success.id : success,
            owner_id: selectedOwnerId,
            title: title.trim()
          }
        }));
        
        // Reset form
        setTitle('');
        setDescription('');
        const quarterEndDate = getEndOfCurrentQuarter();
        setTargetDate(quarterEndDate);
        setSelectedTeamIds(teamId ? [teamId] : []);
        setSelectedOwnerId('');
        setIsCompanyGoal(false);
        setAttemptedSubmit(false);
        
        // Small delay to show success feedback before closing
        setTimeout(() => {
          onOpenChange(false);
          if (onSuccess) onSuccess();
        }, 300);
      }
      
    } catch (error) {
      logger.error('Error adding goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    // Reset target date to end of quarter for next time
    const quarterEndDate = getEndOfCurrentQuarter();
    setTargetDate(quarterEndDate);
    setSelectedTeamIds(teamId ? [teamId] : []);
    setSelectedOwnerId('');
    setAttemptedSubmit(false);
    onOpenChange(false);
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Goal"
      description="Create a new goal to track progress"
      hideActions={true}
      mobileKeyboardAware
    >
      <div className="space-y-4 pb-4">
        <div>
          <Label htmlFor="goal-title" className={attemptedSubmit && !title.trim() ? 'text-destructive' : ''}>
            Title *
          </Label>
          <Input
            id="goal-title"
            placeholder="Enter goal title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className={attemptedSubmit && !title.trim() ? 'border-destructive focus-visible:ring-destructive/30' : ''}
          />
        </div>

        <div>
          <Label htmlFor="goal-description">Description</Label>
          <Textarea
            id="goal-description"
            placeholder="Enter goal description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <Label>Target Date</Label>
          <DatePicker
            date={targetDate ? new Date(targetDate + 'T00:00:00') : undefined}
            onSelect={(d) => setTargetDate(d ? format(d, 'yyyy-MM-dd') : '')}
            placeholder="Pick a target date"
          />
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal-teams">Teams *</Label>
            <MultiTeamSelector
              teams={teams}
              selectedTeamIds={selectedTeamIds}
              onSelectionChange={handleTeamSelectionChange}
              placeholder="Select teams for this goal"
              disabled={isCompanyGoal}
            />
          </div>

          {selectedTeamIds.length > 0 && (
            <div>
              <Label htmlFor="goal-owner">Goal Owner *</Label>
              {loadingMembers ? (
                <div className="p-3 border rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Loading team members...</span>
                </div>
              ) : allTeamMembers.length === 0 ? (
                <div className="p-3 border rounded-lg bg-warning/5 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
                  <span className="text-sm text-yellow-700 dark:text-yellow-500">No team members found in selected teams</span>
                </div>
              ) : (
                <OwnerSelectorWithDisabled
                  users={allTeamMembers}
                  selectedUserId={selectedOwnerId}
                  onUserChange={setSelectedOwnerId}
                  disabledUserIds={disabledOwnerIds}
                  disabledReasons={disabledOwnerReasons}
                  loading={loadingMembers}
                />
              )}
            </div>
          )}
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || !title.trim() || selectedTeamIds.length === 0 || !selectedOwnerId}
                >
                  {loading ? "Adding..." : "Add Goal"}
                </Button>
              </div>
            </TooltipTrigger>
            {(!title.trim() || selectedTeamIds.length === 0 || !selectedOwnerId) && (
              <TooltipContent side="top">
                <p className="text-xs">
                  {!title.trim() && "Title is required. "}
                  {selectedTeamIds.length === 0 && "At least one team is required. "}
                  {!selectedOwnerId && "An owner is required."}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </DialogFooter>
    </BaseModal>
  );
};
