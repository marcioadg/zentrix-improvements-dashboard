import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TeamMemberUser } from '@/hooks/useMultipleTeamMembers';

interface OwnerSelectorWithDisabledProps {
  users: TeamMemberUser[];
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  disabledUserIds: string[];
  disabledReasons: Record<string, string>;
  loading?: boolean;
  className?: string;
}

export const OwnerSelectorWithDisabled: React.FC<OwnerSelectorWithDisabledProps> = ({
  users,
  selectedUserId,
  onUserChange,
  disabledUserIds,
  disabledReasons,
  loading = false,
  className
}) => {
  const selectedUser = users.find(u => u.id === selectedUserId);
  const isCurrentOwnerDisabled = disabledUserIds.includes(selectedUserId);

  return (
    <div className="space-y-2">
      <select
        value={selectedUserId}
        onChange={(e) => onUserChange(e.target.value)}
        disabled={loading}
        className={cn(
          "w-full p-2 border border-input rounded-md bg-background",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <option value="" disabled>Select owner</option>
        {users.map(user => {
          const isDisabled = disabledUserIds.includes(user.id);
          return (
            <option 
              key={user.id} 
              value={user.id}
              disabled={isDisabled}
              className={cn(
                isDisabled && "text-muted-foreground"
              )}
            >
              {user.full_name}
              {isDisabled ? ' (Not in all teams)' : ''}
            </option>
          );
        })}
      </select>

      {/* Warning if current owner is disabled */}
      {isCurrentOwnerDisabled && selectedUserId && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">
                  Current owner is not a member of all selected teams
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{disabledReasons[selectedUserId]}</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Consider selecting a different owner or adjusting team assignments.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Helper text showing disabled reasons */}
      {!loading && disabledUserIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {disabledUserIds.length} user{disabledUserIds.length !== 1 ? 's' : ''} not in all selected teams
        </p>
      )}
    </div>
  );
};
