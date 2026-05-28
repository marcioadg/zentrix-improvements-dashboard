import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MemberSelector } from '@/components/shared/MemberSelector';
import { CompanyUser } from '@/types/companyUser';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { createTeamWithMembers, updateTeamWithMembers } from '@/services/teamOperationsService';
import { updateTeamMembers } from '@/services/teamMemberService';
import { teamCacheInvalidator } from '@/utils/teamCacheInvalidation';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface MemberSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: CompanyUser[];
  selectedMembers: string[];
  onSelectionChange: (memberIds: string[]) => void;
  currentUserId?: string;
  loading?: boolean;
  teamName: string;
  onTeamNameChange: (name: string) => void;
  // Props for team creation/update
  companyId?: string;
  onTeamCreated?: (teamId: string, teamName: string) => void;
  existingTeamId?: string | null;
  existingTeamName?: string | null;
  onTeamUpdated?: (teamId: string) => void;
}

export const MemberSelectorModal: React.FC<MemberSelectorModalProps> = ({
  open,
  onOpenChange,
  members,
  selectedMembers,
  onSelectionChange,
  currentUserId,
  loading = false,
  teamName,
  onTeamNameChange,
  companyId,
  onTeamCreated,
  existingTeamId,
  existingTeamName,
  onTeamUpdated,
}) => {
  const queryClient = useQueryClient();
  const [isCreatingTeam, setIsCreatingTeam] = React.useState(false);
  const [isUpdatingTeam, setIsUpdatingTeam] = React.useState(false);

  const isEditMode = Boolean(existingTeamId);

  // Find the member ID that corresponds to the current auth user
  const currentUserMemberId = React.useMemo(() => {
    if (!currentUserId) return undefined;
    const currentMember = members.find(m => m.user_id === currentUserId);
    return currentMember?.user_id;
  }, [currentUserId, members]);

  // Ensure current user is always in the selection from the start
  const initialSelection = React.useMemo(() => {
    if (currentUserMemberId && !selectedMembers.includes(currentUserMemberId)) {
      return [...selectedMembers, currentUserMemberId];
    }
    return selectedMembers;
  }, [selectedMembers, currentUserMemberId]);

  const [tempSelection, setTempSelection] = React.useState<string[]>(initialSelection);

  // Sync temp selection when modal opens or initial selection changes
  React.useEffect(() => {
    if (open) {
      setTempSelection(initialSelection);
    }
  }, [open, initialSelection]);

  const invalidateCaches = async () => {
    if (!companyId || !currentUserId) return;
    
    await teamCacheInvalidator.invalidateTeamCaches(
      queryClient,
      companyId,
      currentUserId
    );

    await queryClient.refetchQueries({
      queryKey: ['userTeams', currentUserId, companyId, true],
      exact: true
    });
  };

  const handleCreateTeam = async () => {
    if (!teamName || teamName.trim() === '') {
      toast.error('Please enter a team name');
      return;
    }

    if (!companyId || !onTeamCreated || !currentUserId) {
      logger.log('⚠️ Missing required props - falling back to selection-only mode');
      onSelectionChange(tempSelection);
      onOpenChange(false);
      return;
    }

    setIsCreatingTeam(true);

    try {
      const newTeam = await createTeamWithMembers(
        teamName.trim(),
        companyId,
        currentUserId,
        null,
        tempSelection,
        false,
        false
      );

      await invalidateCaches();

      toast.success(`Team "${teamName.trim()}" created!`);
      onSelectionChange(tempSelection);
      onTeamCreated(newTeam.id, teamName.trim());
      onOpenChange(false);

    } catch (error) {
      logger.error('❌ Error creating team:', error);
      toast.error('Failed to create team. Please try again.');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!existingTeamId || !companyId || !currentUserId) return;

    if (!teamName || teamName.trim() === '') {
      toast.error('Please enter a team name');
      return;
    }

    setIsUpdatingTeam(true);

    try {
      // Update team name if changed
      if (teamName.trim() !== existingTeamName) {
        await updateTeamWithMembers(existingTeamId, companyId, { name: teamName.trim() });
      }

      // Update team members
      await updateTeamMembers(existingTeamId, tempSelection);

      await invalidateCaches();

      toast.success('Team updated!');
      onSelectionChange(tempSelection);
      onTeamUpdated?.(existingTeamId);
      onOpenChange(false);

    } catch (error) {
      logger.error('❌ Error updating team:', error);
      toast.error('Failed to update team. Please try again.');
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleCreateNew = async () => {
    // Just call the create handler - it will create a new team
    // and the parent will update state with the new ID
    await handleCreateTeam();
  };

  const handleCancel = () => {
    setTempSelection(selectedMembers);
    onOpenChange(false);
  };

  const isLoading = isCreatingTeam || isUpdatingTeam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Meeting Participants' : 'Select Meeting Participants'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update the team members for this meeting, or create a new team.'
              : 'Choose the team members who will participate in this meeting. You are automatically included and cannot be removed.'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Team Name Input */}
        <div className="space-y-2 pb-4 border-b">
          <Label htmlFor="team-name">Team Name *</Label>
          <Input
            id="team-name"
            placeholder="Enter a name for this team..."
            value={teamName}
            onChange={(e) => onTeamNameChange(e.target.value)}
            className="w-full"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            {isEditMode 
              ? 'You can rename the team or create a new one'
              : 'A team will be created with the selected members'
            }
          </p>
        </div>

        <div className="flex-1 overflow-hidden">
          <MemberSelector
            members={members}
            selectedMembers={tempSelection}
            onSelectionChange={setTempSelection}
            lockedMembers={currentUserMemberId ? [currentUserMemberId] : []}
            loading={loading}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          
          {isEditMode ? (
            <>
              <Button 
                variant="outline"
                onClick={handleCreateNew}
                disabled={tempSelection.length === 0 || isLoading}
              >
                {isCreatingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create New Team'
                )}
              </Button>
              <Button 
                onClick={handleSaveChanges}
                disabled={tempSelection.length === 0 || isLoading}
              >
                {isUpdatingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleCreateTeam}
              disabled={tempSelection.length === 0 || isLoading}
            >
              {isCreatingTeam ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Team...
                </>
              ) : (
                `Create Team (${tempSelection.length})`
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
