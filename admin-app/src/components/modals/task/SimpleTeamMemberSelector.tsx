
import React from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Users } from 'lucide-react';
import { MultiUserSelector } from '@/components/shared/MultiUserSelector';
import { useTeamMemberSelector } from '@/hooks/useTeamMemberSelector';

interface SimpleTeamMemberSelectorProps {
  teamId: string | null;
  assignedTo: string[];
  setAssignedTo: (userIds: string[]) => void;
}

export const SimpleTeamMemberSelector: React.FC<SimpleTeamMemberSelectorProps> = ({
  teamId,
  assignedTo,
  setAssignedTo,
}) => {
  const { users, loading, error, retry } = useTeamMemberSelector(teamId);

  const handleSelectionChange = React.useCallback((userIds: string[]) => {
    setAssignedTo(userIds);
  }, [setAssignedTo]);

  // Show loading state
  if (loading) {
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

  // Show error state
  if (error) {
    return (
      <div className="space-y-2">
        <Label htmlFor="task-assignees">Assign To</Label>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <button 
              onClick={retry}
              className="ml-2 text-primary underline hover:no-underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show empty state
  if (users.length === 0) {
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

  // Show the selector
  return (
    <div className="space-y-2">
      <Label htmlFor="task-assignees">Assign To</Label>
      <MultiUserSelector
        users={users}
        selectedUserIds={assignedTo}
        onSelectionChange={handleSelectionChange}
        placeholder="Select team members to assign..."
      />
    </div>
  );
};
