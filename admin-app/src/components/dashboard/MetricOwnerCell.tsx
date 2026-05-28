
import React, { useState, memo, useCallback } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2 } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface MetricOwnerCellProps {
  metric: any;
  getOwnerInitials: (fullName: string) => string;
  optimisticOwnershipHandler?: (
    metricId: string,
    currentOwnerId: string | null,
    currentOwnerName: string,
    newOwnerId: string | null,
    newOwnerName: string
  ) => Promise<boolean>;
  isMetricSyncing?: (metricId: string) => boolean;
  // 🚀 PHASE 1 OPTIMIZATION: Pre-computed permission passed from parent
  canChangeOwner?: boolean; // If undefined, computed internally for backwards compatibility
}

const MetricOwnerCellComponent: React.FC<MetricOwnerCellProps> = ({
  metric,
  getOwnerInitials,
  optimisticOwnershipHandler,
  isMetricSyncing,
  canChangeOwner: preComputedCanChangeOwner,
}) => {
  const [open, setOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { members, loading: membersLoading } = useTeamMembers(metric.team_id);
  const { profiles } = useProfiles();
  
  const isSyncing = isMetricSyncing?.(metric.id) || false;

  // 🚀 PHASE 1 OPTIMIZATION: Use pre-computed permission if available
  // If not provided, UI will determine based on presence of optimisticOwnershipHandler
  const canChangeOwner = preComputedCanChangeOwner !== undefined 
    ? preComputedCanChangeOwner 
    : !!optimisticOwnershipHandler;

  // Get current owner info with proper avatar URL lookup
  const getCurrentOwnerInfo = useCallback(() => {
    const profile = profiles.find(p => p.id === metric.owner_id);
    
    return {
      name: profile?.full_name || metric.owner || 'Unknown',
      avatarUrl: profile?.avatar_url,
      email: profile?.email,
      isDeactivated: metric.owner_is_deactivated || false
    };
  }, [profiles, metric.owner_id, metric.owner, metric.owner_is_deactivated]);

  const handleOwnerChange = async (newOwnerId: string, newOwnerName: string) => {
    if (!optimisticOwnershipHandler || newOwnerId === metric.owner_id) {
      setOpen(false);
      return;
    }

    // Safety check: ensure the new owner is in our filtered members list
    const isValidMember = members.some(member => member.user_id === newOwnerId);
    if (!isValidMember) {
      logger.warn('Attempted to assign ownership to inactive user, blocking assignment');
      setOpen(false);
      return;
    }

    setIsUpdating(true);
    setOpen(false);

    try {
      const currentOwnerInfo = getCurrentOwnerInfo();
      await optimisticOwnershipHandler(
        metric.id,
        metric.owner_id,
        currentOwnerInfo.name,
        newOwnerId,
        newOwnerName
      );
    } catch (error) {
      logger.error('Failed to update metric ownership:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const currentOwnerInfo = getCurrentOwnerInfo();
  const showLoader = isSyncing || isUpdating;

  // If no optimistic handler is provided OR user can't change owner, show read-only version
  if (!optimisticOwnershipHandler || !canChangeOwner) {
    return (
      <div className="h-8 flex items-center justify-center">
        <div className="flex items-center gap-2">
          {showLoader && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" aria-label="Syncing owner" role="status" />}
          <UserAvatar
            key={metric.owner_id}
            userId={metric.owner_id}
            fullName={currentOwnerInfo.name}
            email={currentOwnerInfo.email}
            avatarUrl={currentOwnerInfo.avatarUrl}
            size="sm"
            className="h-8 w-8"
            isDeactivated={currentOwnerInfo.isDeactivated}
          />
        </div>
      </div>
    );
  }


  return (
    <div className="h-8 flex items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0 justify-center hover:bg-muted/50"
            disabled={showLoader}
          >
            {showLoader && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground absolute" aria-label="Syncing owner" role="status" />}
            <UserAvatar
              key={metric.owner_id}
              userId={metric.owner_id}
              fullName={currentOwnerInfo.name}
              email={currentOwnerInfo.email}
              avatarUrl={currentOwnerInfo.avatarUrl}
              size="sm"
              className="h-8 w-8"
              isDeactivated={currentOwnerInfo.isDeactivated}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="center">
          <div className="space-y-1">
            {membersLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-label="Loading team members" role="status" />
              </div>
            ) : (
              members.map((member) => {
                const profile = profiles.find(p => p.id === member.user_id);
                const memberName = profile?.full_name || 'Unknown';
                const memberAvatarUrl = profile?.avatar_url;
                const memberEmail = profile?.email;
                const isCurrentOwner = member.user_id === metric.owner_id;

                return (
                  <Button
                    key={member.user_id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-8 px-2",
                      isCurrentOwner && "bg-muted"
                    )}
                    onClick={() => handleOwnerChange(member.user_id, memberName)}
                    disabled={isCurrentOwner}
                  >
                    <div className="flex items-center gap-2 relative">
                      <UserAvatar
                        userId={member.user_id}
                        fullName={memberName}
                        email={memberEmail}
                        avatarUrl={memberAvatarUrl}
                        size="sm"
                        className="h-6 w-6"
                      />
                      <span className="text-sm truncate">
                        {memberName}
                      </span>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Memoize with custom comparison - exclude function props as they may be recreated
export const MetricOwnerCell = memo(MetricOwnerCellComponent, (prevProps, nextProps) => {
  return (
    prevProps.metric.id === nextProps.metric.id &&
    prevProps.metric.owner_id === nextProps.metric.owner_id &&
    prevProps.metric.owner === nextProps.metric.owner &&
    prevProps.metric.team_id === nextProps.metric.team_id &&
    prevProps.metric.owner_is_deactivated === nextProps.metric.owner_is_deactivated &&
    prevProps.canChangeOwner === nextProps.canChangeOwner
  );
});
