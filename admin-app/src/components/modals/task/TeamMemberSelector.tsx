
import React from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Users } from 'lucide-react';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { logger } from '@/utils/logger';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

interface TeamMemberSelectorProps {
  membersLoading: boolean;
  memberError: string | null;
  validMembers: TeamMember[];
  assignedTo: string[];
  setAssignedTo: (userIds: string[]) => void;
  onRetryMembers: () => void;
  totalMembersCount: number;
}

const TeamMemberSelectorContent: React.FC<TeamMemberSelectorProps> = ({
  membersLoading,
  memberError,
  validMembers,
  assignedTo,
  setAssignedTo,
  onRetryMembers,
  totalMembersCount,
}) => {
  // Debug logging for props
  logger.log('🔍 TeamMemberSelector: Props received:', {
    membersLoading,
    memberError,
    validMembersCount: validMembers.length,
    totalMembersCount,
    assignedToCount: assignedTo.length
  });

  const handleSelectionChange = React.useCallback((userIds: string[]) => {
    try {
      if (!Array.isArray(userIds)) {
        logger.warn('TeamMemberSelector: Invalid userIds received:', userIds);
        return;
      }
      
      const validUserIds = userIds.filter(id => 
        typeof id === 'string' && 
        id.trim() !== '' && 
        validMembers.some(member => member.id === id)
      );
      
      logger.log('🔍 TeamMemberSelector: Setting assignedTo:', validUserIds);
      setAssignedTo(validUserIds);
    } catch (error) {
      logger.error('TeamMemberSelector: Error in handleSelectionChange:', error);
    }
  }, [setAssignedTo, validMembers]);

  // Show loading state
  if (membersLoading) {
    logger.log('🔍 TeamMemberSelector: Showing loading state');
    return (
      <div className="space-y-2">
        <Label htmlFor="task-assignees">Assign To</Label>
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading team members...</span>
        </div>
      </div>
    );
  }

  // CRITICAL: Only show error if hook reports actual error AND we have no valid members
  if (memberError && validMembers.length === 0) {
    logger.log('🔍 TeamMemberSelector: Showing error state for:', memberError);
    return (
      <div className="space-y-2">
        <Label htmlFor="task-assignees">Assign To</Label>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {memberError}
            <button 
              onClick={onRetryMembers}
              className="ml-2 text-primary underline hover:no-underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If hook says no error but we have no processed members, trust the hook
  if (!memberError && validMembers.length === 0 && totalMembersCount === 0) {
    logger.log('🔍 TeamMemberSelector: Showing empty team state (no error from hook)');
    return (
      <div className="space-y-2">
        <Label htmlFor="task-assignees">Assign To</Label>
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20 border-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">No team members</p>
            <p className="text-xs text-muted-foreground">This team doesn't have any members yet.</p>
          </div>
        </div>
      </div>
    );
  }

  // If hook says no error but no processed members (with total > 0), show processing issue
  if (!memberError && validMembers.length === 0 && totalMembersCount > 0) {
    logger.log('🔍 TeamMemberSelector: Showing processing issue - hook says no error but no processed members');
    return (
      <div className="space-y-2">
        <Label htmlFor="task-assignees">Assign To</Label>
        <div className="text-sm text-amber-600 p-3 border rounded-lg bg-amber-50 border-amber-200">
          Team members are loading. Please wait or try again.
          <button 
            onClick={onRetryMembers}
            className="ml-2 text-primary underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // SUCCESS: Show the selector when we have valid data (hook reports no error and we have members)
  logger.log('🔍 TeamMemberSelector: Showing selector with', validMembers.length, 'members');
  return (
    <div className="space-y-2">
      <Label htmlFor="task-assignees">Assign To</Label>
      <ErrorBoundary
        fallback={
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading team member selector
              <button 
                onClick={onRetryMembers}
                className="ml-2 text-primary underline hover:no-underline"
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        }
        onError={(error) => {
          logger.error('TeamMemberSelector: MultiUserSelector error:', error);
        }}
      >
        <MultiUserSelector
          users={validMembers}
          selectedUserIds={assignedTo}
          onSelectionChange={handleSelectionChange}
          placeholder="Select team members to assign..."
        />
      </ErrorBoundary>
    </div>
  );
};

export const TeamMemberSelector: React.FC<TeamMemberSelectorProps> = (props) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="space-y-2">
          <Label htmlFor="task-assignees">Assign To</Label>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load team member selector. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      }
      onError={(error) => {
        logger.error('TeamMemberSelector: Component error:', error);
      }}
    >
      <TeamMemberSelectorContent {...props} />
    </ErrorBoundary>
  );
};
